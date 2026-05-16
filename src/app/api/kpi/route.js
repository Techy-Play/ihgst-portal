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

    // Group KPIs by title (the "template" KPI shared to multiple employees)
    const grouped = {};
    kpis.forEach(k => {
      const key = `${k.title}__${k.thrustArea}`;
      if (!grouped[key]) {
        grouped[key] = {
          title: k.title, description: k.description, thrustArea: k.thrustArea,
          uom: k.uom, target: k.target, assignedTo: [], createdAt: k.createdAt,
        };
      }
      grouped[key].assignedTo.push({
        _id: k._id, userId: k.userId, weightage: k.weightage, status: k.status,
      });
    });

    return NextResponse.json({
      kpis: Object.values(grouped),
      employees,
      activeCycle: { _id: activeCycle._id, name: activeCycle.name },
    });
  } catch (error) {
    console.error('KPI GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create and assign a shared KPI to multiple employees
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['Manager', 'Admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await dbConnect();
    const body = await request.json();

    // Validate
    if (!body.title?.trim()) return NextResponse.json({ error: 'KPI title is required.' }, { status: 400 });
    if (!body.thrustArea?.trim()) return NextResponse.json({ error: 'Thrust area is required.' }, { status: 400 });
    if (!body.description?.trim()) return NextResponse.json({ error: 'Description is required.' }, { status: 400 });
    if (!body.uom) return NextResponse.json({ error: 'Unit of measurement is required.' }, { status: 400 });
    if (body.target === undefined || body.target === '') return NextResponse.json({ error: 'Target is required.' }, { status: 400 });
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

        // Check if this KPI is already assigned to this employee
        const existing = await Goal.findOne({ userId: empId, cycleId: activeCycle._id, title: body.title, isShared: true });
        if (existing) { errors.push(`Already assigned to user ${empId}`); continue; }

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

        // Notify the employee
        await Notification.create({
          userId: empId,
          type: 'shared_goal',
          title: 'New KPI Assigned',
          message: `A shared KPI "${body.title}" has been assigned to you by ${session.user.name}.`,
          link: `/goals/${goal._id}`,
        });
      } catch (err) {
        errors.push(`Failed for user ${empId}: ${err.message}`);
      }
    }

    // Audit log
    await AuditLog.create({
      entityType: 'KPI', entityId: createdGoals[0]?._id || null,
      action: 'kpi_assigned', changedBy: session.user.id, changedByName: session.user.name,
      description: `Shared KPI "${body.title}" assigned to ${createdGoals.length} employee(s)`,
    });

    return NextResponse.json({
      message: `KPI assigned to ${createdGoals.length} employee(s).${errors.length ? ` ${errors.length} skipped.` : ''}`,
      created: createdGoals.length,
      errors,
    }, { status: 201 });
  } catch (error) {
    console.error('KPI POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
