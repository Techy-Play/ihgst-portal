import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';
import GoalSheet from '@/models/GoalSheet';
import User from '@/models/User';
import Cycle from '@/models/Cycle';
import AuditLog from '@/models/AuditLog';
import Notification from '@/models/Notification';
import { handleApiError, parseBody } from '@/lib/apiError';

// GET: List KPIs assigned by this manager/admin
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['Manager', 'Admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await dbConnect();
    const activeCycle = await Cycle.findOne({ isActive: true }).lean();
    if (!activeCycle) return NextResponse.json({ kpis: [], employees: [] });

    // Get all shared goals created by this user (or all for admin)
    const query = { isShared: true, cycleId: activeCycle._id };
    if (session.user.role === 'Manager') query.sharedBy = session.user.id;

    const kpis = await Goal.find(query).populate('userId', 'name email department').sort({ createdAt: -1 }).lean();

    // Get assignable employees
    let employees;
    if (session.user.role === 'Admin') {
      employees = await User.find({ role: { $ne: 'Admin' } }).select('name email department role').lean();
    } else {
      employees = await User.find({ managerId: session.user.id }).select('name email department role').lean();
    }

    const employeeIds = employees.map(e => e._id);
    const totals = employeeIds.length === 0 ? [] : await Goal.aggregate([
      { $match: { cycleId: activeCycle._id, userId: { $in: employeeIds } } },
      { $group: { _id: '$userId', total: { $sum: '$weightage' }, count: { $sum: 1 } } },
    ]);
    const weightageByUserId = {};
    const goalCountByUserId = {};
    totals.forEach(t => {
      weightageByUserId[t._id.toString()] = t.total || 0;
      goalCountByUserId[t._id.toString()] = t.count || 0;
    });

    // Group KPIs by title (the "template" KPI shared to multiple employees)
    const grouped = {};
    kpis.forEach(k => {
      const key = `${k.title}__${k.thrustArea}`;
      if (!grouped[key]) {
        grouped[key] = {
          title: k.title, description: k.description, thrustArea: k.thrustArea,
          uom: k.uom, uomDirection: k.uomDirection || 'Min', target: k.target, assignedTo: [], createdAt: k.createdAt,
        };
      }
      grouped[key].assignedTo.push({
        _id: k._id, userId: k.userId, weightage: k.weightage, status: k.status,
      });
    });

    return NextResponse.json({
      kpis: Object.values(grouped),
      employees,
      weightageByUserId,
      goalCountByUserId,
      activeCycle: { _id: activeCycle._id, name: activeCycle.name },
    });
  } catch (error) {
    console.error('KPI GET error:', error);
    return handleApiError(error, 'kpi GET');
  }
}

// POST: Create and assign a shared KPI to multiple employees
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['Manager', 'Admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await dbConnect();
    const { data: body, error: parseErr } = await parseBody(request);
    if (parseErr) return parseErr;

    // Validate
    if (!body.title?.trim()) return NextResponse.json({ error: 'KPI title is required.' }, { status: 400 });
    if (!body.thrustArea?.trim()) return NextResponse.json({ error: 'Thrust area is required.' }, { status: 400 });
    if (!body.description?.trim()) return NextResponse.json({ error: 'Description is required.' }, { status: 400 });
    if (!body.uom) return NextResponse.json({ error: 'Unit of measurement is required.' }, { status: 400 });
    if (body.target === undefined || body.target === '') return NextResponse.json({ error: 'Target is required.' }, { status: 400 });
    if (body.uom === 'Timeline') {
      const tDate = new Date(body.target);
      if (isNaN(tDate.getTime())) return NextResponse.json({ error: 'Timeline target must be a valid date (YYYY-MM-DD).' }, { status: 400 });
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (tDate < today) return NextResponse.json({ error: 'Timeline target date cannot be in the past.' }, { status: 400 });
    } else if (isNaN(Number(body.target)) || Number(body.target) < 0) {
      return NextResponse.json({ error: 'Target must be a valid positive number.' }, { status: 400 });
    }
    if (!body.employeeIds?.length) return NextResponse.json({ error: 'Select at least one employee.' }, { status: 400 });
    const defaultWeightage = body.defaultWeightage || 20;
    if (defaultWeightage < 10 || defaultWeightage > 100) return NextResponse.json({ error: 'Default weightage must be 10-100%.' }, { status: 400 });

    const activeCycle = await Cycle.findOne({ isActive: true });
    if (!activeCycle) return NextResponse.json({ error: 'No active cycle found.' }, { status: 400 });

    const createdGoals = [];
    const errors = [];

    for (const empId of body.employeeIds) {
      try {
        // Find or create goal sheet for this employee
        let goalSheet = await GoalSheet.findOne({ userId: empId, cycleId: activeCycle._id });
        if (!goalSheet) goalSheet = await GoalSheet.create({ userId: empId, cycleId: activeCycle._id, status: 'Draft' });

        // Check if this KPI is already assigned to this employee (any status)
        const existing = await Goal.findOne({ userId: empId, cycleId: activeCycle._id, title: body.title, isShared: true });
        if (existing) { errors.push(`Already assigned to user ${empId}`); continue; }

        // Trigger rebalancing for any "frozen" state: Approved, Locked, Submitted, or already-Rebalancing
        // ALSO trigger for Draft sheets where adding the new KPI would push total weightage over 100%
        let needsRebalancing = ['Approved', 'Locked', 'Submitted', 'Rebalancing'].includes(goalSheet.status);
        if (!needsRebalancing && goalSheet.status === 'Draft') {
          const draftGoals = await Goal.find({ goalSheetId: goalSheet._id });
          const currentTotal = draftGoals.reduce((s, g) => s + (g.weightage || 0), 0);
          if (currentTotal + defaultWeightage > 100) needsRebalancing = true;
        }
        const wasApproved = needsRebalancing;

        // --- ENTERPRISE REBALANCING FLOW ---
        if (wasApproved) {
          // 1. Fetch ALL goals for this employee so we get accurate weightage totals
          //    (includes Draft and Rebalancing KPIs that also consume weightage)
          const existingGoals = await Goal.find({ goalSheetId: goalSheet._id });

          // Only snapshot/reset goals that are in a frozen state (not already in Rebalancing/Draft)
          const frozenGoals = existingGoals.filter(g =>
            ['Approved', 'Locked', 'Submitted'].includes(g.status)
          );

          const kpiWeightage = defaultWeightage; // locked org-controlled weightage
          // Use ALL goals for weightage math (not just frozen ones) so pre-existing Draft/Rebalancing KPIs are counted
          const allEditableGoals = existingGoals.filter(g => !g.isShared);   // employee's own goals (all statuses)
          const allLockedKpiGoals = existingGoals.filter(g => g.isShared);   // already-assigned KPIs (all statuses)

          // 2. Calculate available weightage for editable goals after new KPI is inserted
          const lockedKpiTotal = allLockedKpiGoals.reduce((s, g) => s + g.weightage, 0) + kpiWeightage;
          const availableForEditable = Math.max(100 - lockedKpiTotal, 0);
          const editableCount = allEditableGoals.length;

          // 3. Distribute available weightage equally among editable goals (floor, remainder to first)
          let baselineWeightage = editableCount > 0 ? Math.floor(availableForEditable / editableCount) : 0;
          if (baselineWeightage < 10 && editableCount > 0) baselineWeightage = 10; // min floor
          const remainder = editableCount > 0 ? availableForEditable - (baselineWeightage * editableCount) : 0;

          // 4. Only snapshot/reset frozen goals — skip ones already in Rebalancing/Draft
          const frozenEditableGoals = frozenGoals.filter(g => !g.isShared);
          const frozenLockedKpiGoals = frozenGoals.filter(g => g.isShared);

          for (let i = 0; i < allEditableGoals.length; i++) {
            const g = allEditableGoals[i];
            const newW = i === 0 ? baselineWeightage + remainder : baselineWeightage;
            await Goal.findByIdAndUpdate(g._id, {
              $set: {
                previousWeightage: g.previousWeightage ?? g.weightage, // preserve if not already snapshotted
                previousStatus: g.previousStatus ?? g.status,          // preserve if not already snapshotted
                weightage: newW,
                status: 'Rebalancing',
              },
            });
          }

          // 5. Also update locked KPI goals (frozen ones get snapshotted; existing Rebalancing ones just stay)
          for (const g of allLockedKpiGoals) {
            await Goal.findByIdAndUpdate(g._id, {
              $set: {
                previousWeightage: g.previousWeightage ?? g.weightage,
                previousStatus: g.previousStatus ?? g.status,
                status: 'Rebalancing',
              },
            });
          }

          // 6. Create the new KPI goal with its locked weightage + Rebalancing status
          const goal = await Goal.create({
            userId: empId,
            cycleId: activeCycle._id,
            cycleName: activeCycle.name,
            goalSheetId: goalSheet._id,
            thrustArea: body.thrustArea,
            title: body.title,
            description: body.description,
            uom: body.uom,
            uomDirection: body.uomDirection || 'Min',
            target: body.uom === 'Timeline' ? body.target : Number(body.target),
            weightage: kpiWeightage,
            previousWeightage: null,
            status: 'Rebalancing',
            isShared: true,
            sharedBy: session.user.id,
          });

          createdGoals.push(goal);

          // 7. Transition GoalSheet to Rebalancing state, remembering previous status for rollback
          // IMPORTANT: preserve the *original* pre-rebalancing status — don't overwrite if already set
          const preservedPreviousStatus = goalSheet.previousStatus || goalSheet.status;
          await GoalSheet.findByIdAndUpdate(goalSheet._id, {
            $set: { status: 'Rebalancing', previousStatus: preservedPreviousStatus === 'Rebalancing' ? (goalSheet.previousStatus || 'Approved') : preservedPreviousStatus },
            $push: {
              comments: {
                text: `🔄 Goal sheet entered Rebalancing state. A new organizational KPI "${body.title}" (${kpiWeightage}%) has been assigned. Editable goals have been reset to baseline weightages. Please redistribute until your total equals 100%, then resubmit.`,
                byName: 'System',
                role: 'System',
                createdAt: new Date(),
              },
            },
          });

          // 8. Non-critical: notify + audit — failures here must NOT abort goal creation
          try {
            await Notification.create({
              userId: empId,
              type: 'kpi_rebalance',
              title: '⚖️ Rebalancing Required — New KPI Assigned',
              message: `A new organizational KPI "${body.title}" (${kpiWeightage}%) has been assigned. Your goal sheet is in Rebalancing state. Adjust your weightages to total 100%, then resubmit for approval.`,
              link: '/goals',
            });
            await AuditLog.create({
              entityType: 'GoalSheet', entityId: goalSheet._id,
              action: 'sheet_rebalancing', changedBy: session.user.id, changedByName: session.user.name,
              description: `Goal sheet set to Rebalancing for employee ${empId} — KPI "${body.title}" assigned (${kpiWeightage}%). Editable goals reset to baseline (${baselineWeightage}% each).`,
            });
          } catch (notifErr) {
            console.warn('Non-critical: notification/audit failed during KPI rebalance:', notifErr.message);
          }

        } else {
          // Standard flow for non-approved sheets
          const goal = await Goal.create({
            userId: empId,
            cycleId: activeCycle._id,
            cycleName: activeCycle.name,
            goalSheetId: goalSheet._id,
            thrustArea: body.thrustArea,
            title: body.title,
            description: body.description,
            uom: body.uom,
            uomDirection: body.uomDirection || 'Min',
            target: body.uom === 'Timeline' ? body.target : Number(body.target),
            weightage: defaultWeightage,
            status: 'Draft',
            isShared: true,
            sharedBy: session.user.id,
          });

          createdGoals.push(goal);

          await Notification.create({
            userId: empId,
            type: 'shared_goal',
            title: 'New KPI Assigned',
            message: `A shared KPI "${body.title}" has been assigned to you by ${session.user.name}.`,
            link: `/goals/${goal._id}`,
          });
        }
      } catch (err) {
        errors.push(`Failed for user ${empId}: ${err.message}`);
      }
    }

    // Audit log — only if at least one goal was created
    if (createdGoals.length > 0) {
      await AuditLog.create({
        entityType: 'KPI', entityId: createdGoals[0]._id,
        action: 'kpi_assigned', changedBy: session.user.id, changedByName: session.user.name,
        description: `Shared KPI "${body.title}" assigned to ${createdGoals.length} employee(s)`,
      });
    }

    return NextResponse.json({
      message: `KPI assigned to ${createdGoals.length} employee(s).${errors.length ? ` ${errors.length} skipped.` : ''}`,
      created: createdGoals.length,
      errors,
    }, { status: 201 });
  } catch (error) {
    console.error('KPI POST error:', error);
    return handleApiError(error, 'kpi POST');
  }
}

// PUT: Edit KPI details across all unapproved assignments
// Body: { oldTitle, oldThrustArea, title, description, thrustArea, uom, uomDirection, target }
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['Manager', 'Admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await dbConnect();
    const { data: body, error: parseErr } = await parseBody(request);
    if (parseErr) return parseErr;

    if (!body.oldTitle || !body.oldThrustArea) {
      return NextResponse.json({ error: 'Original KPI title and thrust area are required.' }, { status: 400 });
    }

    const activeCycle = await Cycle.findOne({ isActive: true }).lean();
    if (!activeCycle) return NextResponse.json({ error: 'No active cycle found.' }, { status: 400 });

    // Find all unapproved goals for this KPI
    const query = {
      isShared: true, cycleId: activeCycle._id,
      title: body.oldTitle, thrustArea: body.oldThrustArea,
      status: { $in: ['Draft', 'Submitted', 'Returned', 'Rebalancing'] },
    };
    if (session.user.role === 'Manager') query.sharedBy = session.user.id;

    const goals = await Goal.find(query);
    if (goals.length === 0) {
      return NextResponse.json({ error: 'No editable (unapproved) KPI assignments found.' }, { status: 400 });
    }

    // Build update object from provided fields
    const updateFields = {};
    if (body.title?.trim()) updateFields.title = body.title.trim();
    if (body.description?.trim()) updateFields.description = body.description.trim();
    if (body.thrustArea) updateFields.thrustArea = body.thrustArea;
    if (body.uom) updateFields.uom = body.uom;
    if (body.uomDirection) updateFields.uomDirection = body.uomDirection;
    if (body.target !== undefined && body.target !== '') {
      updateFields.target = body.uom === 'Timeline' ? body.target : Number(body.target);
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    await Goal.updateMany({ _id: { $in: goals.map(g => g._id) } }, { $set: updateFields });

    await AuditLog.create({
      entityType: 'KPI', entityId: goals[0]._id,
      action: 'kpi_edited', changedBy: session.user.id, changedByName: session.user.name,
      description: `Edited KPI "${body.oldTitle}" → "${updateFields.title || body.oldTitle}" for ${goals.length} employee(s)`,
    });

    return NextResponse.json({
      message: `KPI updated for ${goals.length} employee(s).`,
      updated: goals.length,
    });
  } catch (error) {
    console.error('KPI PUT error:', error);
    return handleApiError(error, 'kpi PUT');
  }
}

// DELETE: Remove unapproved KPI assignment(s)
// Body: { goalId } to remove a single assignment, or { title, thrustArea } to remove ALL unapproved for that KPI
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['Manager', 'Admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await dbConnect();
    const { data: body, error: parseErr } = await parseBody(request);
    if (parseErr) return parseErr;

    const activeCycle = await Cycle.findOne({ isActive: true }).lean();
    if (!activeCycle) return NextResponse.json({ error: 'No active cycle found.' }, { status: 400 });

    // ─── Helper: roll back a Rebalancing goal sheet to its previous state ────
    async function rollbackRebalancing(goalSheet, removedKpiId, kpiTitle, actorId, actorName) {
      // The state the sheet was in before Rebalancing — NEVER restore to 'Rebalancing' itself
      let restoreSheetStatus = goalSheet.previousStatus || 'Approved';
      if (restoreSheetStatus === 'Rebalancing') restoreSheetStatus = 'Approved';

      // Restore all remaining goals (excluding the KPI being removed)
      const remainingGoals = await Goal.find({
        goalSheetId: goalSheet._id,
        _id: { $ne: removedKpiId },
      });

      for (const g of remainingGoals) {
        const restoredWeightage = g.previousWeightage != null ? g.previousWeightage : g.weightage;
        // Restore each goal to its own previousStatus (could be Submitted or Approved)
        const restoredStatus = g.previousStatus || restoreSheetStatus;
        await Goal.findByIdAndUpdate(g._id, {
          $set: {
            status: restoredStatus,
            weightage: restoredWeightage,
            previousWeightage: null,
            previousStatus: null,
          },
        });
      }

      const wasSubmitted = restoreSheetStatus === 'Submitted';

      // Restore goal sheet to its previous state + clear previousStatus
      await GoalSheet.findByIdAndUpdate(goalSheet._id, {
        $set: { status: restoreSheetStatus, previousStatus: null },
        $push: {
          comments: {
            text: `✅ Goal sheet restored to ${restoreSheetStatus}. KPI "${kpiTitle}" was removed. All previous weightages have been reinstated.${wasSubmitted ? ' The sheet is back under manager review.' : ''}`,
            byName: 'System',
            role: 'System',
            createdAt: new Date(),
          },
        },
      });

      // Notify the employee
      await Notification.create({
        userId: goalSheet.userId,
        type: 'kpi_removed',
        title: `✅ Goal Sheet Restored${wasSubmitted ? ' — Back Under Review' : ' — KPI Removed'}`,
        message: `The KPI "${kpiTitle}" has been removed. Your goal sheet has been restored to ${restoreSheetStatus} with your original weightages reinstated.${wasSubmitted ? ' It is back in the manager review queue.' : ''}`,
        link: '/goals',
      });

      // Audit
      await AuditLog.create({
        entityType: 'GoalSheet', entityId: goalSheet._id,
        action: 'sheet_restored', changedBy: actorId, changedByName: actorName,
        description: `Goal sheet restored to "${restoreSheetStatus}" for employee ${goalSheet.userId} after KPI "${kpiTitle}" was removed during Rebalancing.`,
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Single goal removal
    if (body.goalId) {
      const goal = await Goal.findById(body.goalId);
      if (!goal) return NextResponse.json({ error: 'KPI goal not found.' }, { status: 404 });
      if (!goal.isShared) return NextResponse.json({ error: 'This is not a shared KPI.' }, { status: 400 });

      // Block deletion of approved/locked KPIs ONLY when NOT in Rebalancing state
      const goalSheet = await GoalSheet.findById(goal.goalSheetId);
      const isRebalancing = goalSheet?.status === 'Rebalancing';
      if (!isRebalancing && ['Approved', 'Locked'].includes(goal.status)) {
        return NextResponse.json({ error: 'Cannot delete an approved/locked KPI. Unlock it first.' }, { status: 400 });
      }

      // Manager can only delete KPIs they assigned
      if (session.user.role === 'Manager' && goal.sharedBy?.toString() !== session.user.id) {
        return NextResponse.json({ error: 'You can only remove KPIs you assigned.' }, { status: 403 });
      }

      const userName = (await User.findById(goal.userId).select('name').lean())?.name || 'Unknown';

      // Delete the KPI goal first
      await Goal.findByIdAndDelete(body.goalId);

      // Audit the KPI removal itself
      const restoreSheetStatus = goalSheet?.previousStatus || 'Approved';
      await AuditLog.create({
        entityType: 'KPI', entityId: goal._id,
        action: 'kpi_removed', changedBy: session.user.id, changedByName: session.user.name,
        description: `Removed KPI "${goal.title}" from ${userName}${isRebalancing ? ` (during Rebalancing — sheet will be restored to ${restoreSheetStatus})` : ''}`,
      });

      // If the sheet was in Rebalancing, roll back to its previous state
      if (isRebalancing && goalSheet) {
        const restoreSheetStatus = goalSheet.previousStatus || 'Approved';
        await rollbackRebalancing(goalSheet, body.goalId, goal.title, session.user.id, session.user.name);
        return NextResponse.json({
          message: `KPI removed from ${userName}. Goal sheet restored to ${restoreSheetStatus} with original weightages.`,
          restored: true,
        });
      }

      return NextResponse.json({ message: `KPI removed from ${userName}.` });
    }

    // Bulk removal by title + thrustArea (all unapproved + rebalancing assignments)
    if (body.title && body.thrustArea) {
      const query = {
        isShared: true, cycleId: activeCycle._id,
        title: body.title, thrustArea: body.thrustArea,
        status: { $in: ['Draft', 'Submitted', 'Returned', 'Rebalancing'] },
      };
      if (session.user.role === 'Manager') query.sharedBy = session.user.id;

      const toDelete = await Goal.find(query).lean();
      if (toDelete.length === 0) {
        return NextResponse.json({ error: 'No removable (unapproved/rebalancing) KPI assignments found.' }, { status: 400 });
      }

      let restoredCount = 0;

      for (const kpiGoal of toDelete) {
        // Check if the employee's sheet is in Rebalancing state
        const goalSheet = await GoalSheet.findById(kpiGoal.goalSheetId);
        const isRebalancing = goalSheet?.status === 'Rebalancing';

        await Goal.findByIdAndDelete(kpiGoal._id);

        if (isRebalancing && goalSheet) {
          await rollbackRebalancing(goalSheet, kpiGoal._id, kpiGoal.title, session.user.id, session.user.name);
          restoredCount++;
        }
      }

      await AuditLog.create({
        entityType: 'KPI', entityId: toDelete[0]._id,
        action: 'kpi_bulk_removed', changedBy: session.user.id, changedByName: session.user.name,
        description: `Bulk removed KPI "${body.title}" from ${toDelete.length} employee(s)${restoredCount > 0 ? `. ${restoredCount} sheet(s) restored to previous state.` : ''}`,
      });

      return NextResponse.json({
        message: `Removed ${toDelete.length} KPI assignment(s).${restoredCount > 0 ? ` ${restoredCount} goal sheet(s) restored to their previous state with original weightages.` : ''}`,
        deleted: toDelete.length,
        restored: restoredCount,
      });
    }

    return NextResponse.json({ error: 'Provide goalId or title+thrustArea to delete.' }, { status: 400 });
  } catch (error) {
    console.error('KPI DELETE error:', error);
    return handleApiError(error, 'kpi DELETE');
  }
}
