import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Cycle from '@/models/Cycle';
import GoalSheet from '@/models/GoalSheet';
import CheckIn from '@/models/CheckIn';
import Goal from '@/models/Goal';
import User from '@/models/User';
import Escalation from '@/models/Escalation';
import Notification from '@/models/Notification';
import AuditLog from '@/models/AuditLog';
import { sendEmail } from '@/lib/mailer';

// ─── Thresholds (days) ─────────────────────────────────────────────────────
const GOAL_SUBMISSION_L1 = 5;
const GOAL_SUBMISSION_L2 = 10;
const GOAL_SUBMISSION_L3 = 15;

const GOAL_APPROVAL_L1 = 5;
const GOAL_APPROVAL_L2 = 10;

const CHECKIN_L1 = 7;
const CHECKIN_L2 = 14;

// ─── Helpers ───────────────────────────────────────────────────────────────
function daysSince(date) {
  return (Date.now() - new Date(date).getTime()) / 86_400_000;
}

/**
 * Returns the currently-active quarter label ('Q1'–'Q4') and its start date.
 * Returns null if no quarter is active right now.
 */
function getActiveQuarterInfo(cycle) {
  if (!cycle?.quarters?.length) return null;
  const now = new Date();
  for (let i = 0; i < cycle.quarters.length; i++) {
    const q = cycle.quarters[i];
    if (q.start && q.end && new Date(q.start) <= now && now <= new Date(q.end)) {
      return { label: `Q${i + 1}`, start: new Date(q.start) };
    }
  }
  return null;
}

/**
 * Ensure only one ACTIVE escalation exists per (userId, cycleId, type, level).
 * Returns true if a new escalation was created, false if it already existed.
 */
async function createEscalationIfNew({ userId, goalSheetId, cycleId, quarter, type, level, message }) {
  const exists = await Escalation.findOne({ userId, cycleId, type, level, status: 'ACTIVE' });
  if (exists) return false;

  await Escalation.create({ userId, goalSheetId, cycleId, quarter, type, level, message, triggeredAt: new Date() });
  return true;
}

/**
 * Create an in-app notification.
 */
async function notify(userId, title, message, link = '/admin/escalations') {
  try {
    await Notification.create({ userId, type: 'escalation', title, message, link });
  } catch { /* non-fatal */ }
}

/**
 * Attempt to send an email — silently skip if SMTP not configured.
 */
async function tryEmail(to, subject, html) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
    await sendEmail({ to, subject, html });
  } catch { /* non-fatal */ }
}

// ─── Main engine ───────────────────────────────────────────────────────────
export async function runEscalationEngine() {
  await dbConnect();
  const results = { created: 0, resolved: 0, errors: [] };

  // Only escalate active, non-closed cycles
  const activeCycles = await Cycle.find({ isActive: true, isClosed: { $ne: true } }).lean();
  if (!activeCycles.length) return results;

  // Pre-fetch all employees (role=Employee) with their managers
  const allEmployees = await User.find({ role: 'Employee' }).lean();
  const managerMap = {};   // managerId → [adminUser] — we find admins separately
  const admins = await User.find({ role: 'Admin' }).lean();
  const adminIds = admins.map(a => a._id);

  for (const cycle of activeCycles) {
    const cycleId = cycle._id;

    // ── 1. GOAL_SUBMISSION escalation ──────────────────────────────────────
    const daysSinceCycleOpen = daysSince(cycle.goalSettingStart);

    for (const employee of allEmployees) {
      try {
        const sheet = await GoalSheet.findOne({ userId: employee._id, cycleId }).lean();
        const isDraft = !sheet || sheet.status === 'Draft';
        if (!isDraft) continue; // not a problem

        // Determine what level this should be
        let level = null;
        if (daysSinceCycleOpen >= GOAL_SUBMISSION_L3) level = 'LEVEL_3';
        else if (daysSinceCycleOpen >= GOAL_SUBMISSION_L2) level = 'LEVEL_2';
        else if (daysSinceCycleOpen >= GOAL_SUBMISSION_L1) level = 'LEVEL_1';
        if (!level) continue;

        const msg = `Goals not submitted ${Math.floor(daysSinceCycleOpen)} days after cycle opened (${cycle.name})`;
        const created = await createEscalationIfNew({
          userId: employee._id, goalSheetId: sheet?._id, cycleId, type: 'GOAL_SUBMISSION', level, message: msg,
        });

        if (created) {
          results.created++;

          // L1 → notify employee
          await notify(employee._id, 'Action Required: Submit Your Goals',
            `Your goals for ${cycle.name} are still in draft. Please submit them as soon as possible.`, '/goals');
          await tryEmail(employee.email, `[IHGST] Action Required: Submit Your Goals for ${cycle.name}`,
            `<p>Hi ${employee.name},</p><p>Your goals for <strong>${cycle.name}</strong> are still in draft. Please log in and submit them before the deadline.</p>`);

          if (level === 'LEVEL_2' && employee.managerId) {
            await notify(employee.managerId, 'Escalation: Employee Goals Overdue',
              `${employee.name} has not submitted goals for ${cycle.name} (${Math.floor(daysSinceCycleOpen)} days overdue).`, '/admin/escalations');
            const manager = await User.findById(employee.managerId).lean();
            if (manager?.email) {
              await tryEmail(manager.email, `[IHGST] Escalation: ${employee.name}'s Goals Overdue`,
                `<p>Hi ${manager.name},</p><p><strong>${employee.name}</strong> has not submitted goals for <strong>${cycle.name}</strong> and is currently ${Math.floor(daysSinceCycleOpen)} days overdue. Please follow up.</p>`);
            }
          }

          if (level === 'LEVEL_3') {
            for (const admin of admins) {
              await notify(admin._id, '🚨 Critical Escalation: Goals Not Submitted',
                `${employee.name} has not submitted goals for ${cycle.name} (${Math.floor(daysSinceCycleOpen)} days overdue). Immediate action required.`, '/admin/escalations');
              if (admin.email) {
                await tryEmail(admin.email, `[IHGST] Critical Escalation: ${employee.name}'s Goals Not Submitted`,
                  `<p>Hi ${admin.name},</p><p><strong>${employee.name}</strong> has failed to submit their goals for <strong>${cycle.name}</strong> and is now ${Math.floor(daysSinceCycleOpen)} days overdue. Immediate action is required.</p>`);
              }
            }
          }

          await AuditLog.create({
            entityType: 'Escalation', entityId: employee._id,
            action: 'escalation_created', changedByName: 'System',
            description: `${level} GOAL_SUBMISSION escalation triggered for ${employee.name} (${cycle.name})`,
          });
        }
      } catch (err) {
        results.errors.push(`GOAL_SUBMISSION for user ${employee._id}: ${err.message}`);
      }
    }

    // ── 2. GOAL_APPROVAL escalation ────────────────────────────────────────
    const submittedSheets = await GoalSheet.find({ cycleId, status: 'Submitted' }).lean();
    for (const sheet of submittedSheets) {
      try {
        const daysSinceSubmit = daysSince(sheet.submittedAt);
        let level = null;
        if (daysSinceSubmit >= GOAL_APPROVAL_L2) level = 'LEVEL_2';
        else if (daysSinceSubmit >= GOAL_APPROVAL_L1) level = 'LEVEL_1';
        if (!level) continue;

        const employee = allEmployees.find(e => e._id.toString() === sheet.userId.toString());
        if (!employee) continue;

        const msg = `Goal sheet submitted ${Math.floor(daysSinceSubmit)} days ago but not yet approved (${cycle.name})`;
        const created = await createEscalationIfNew({
          userId: sheet.userId, goalSheetId: sheet._id, cycleId, type: 'GOAL_APPROVAL', level, message: msg,
        });

        if (created) {
          results.created++;

          if (employee.managerId) {
            await notify(employee.managerId, 'Action Required: Review Pending Goals',
              `${employee.name}'s goal sheet has been waiting for approval for ${Math.floor(daysSinceSubmit)} days.`, `/manager`);
            const manager = await User.findById(employee.managerId).lean();
            if (manager?.email) {
              await tryEmail(manager.email, `[IHGST] Approval Overdue: ${employee.name}'s Goals`,
                `<p>Hi ${manager.name},</p><p>${employee.name}'s goal sheet for <strong>${cycle.name}</strong> has been pending approval for <strong>${Math.floor(daysSinceSubmit)} days</strong>. Please review it.</p>`);
            }
          }

          if (level === 'LEVEL_2') {
            for (const admin of admins) {
              await notify(admin._id, 'Escalation: Goal Approval Overdue',
                `${employee.name}'s goals for ${cycle.name} have been pending manager approval for ${Math.floor(daysSinceSubmit)} days.`, '/admin/escalations');
              if (admin.email) {
                await tryEmail(admin.email, `[IHGST] Escalation: ${employee.name}'s Goal Approval Overdue`,
                  `<p>Hi ${admin.name},</p><p><strong>${employee.name}'s</strong> goals for <strong>${cycle.name}</strong> have been pending manager approval for ${Math.floor(daysSinceSubmit)} days. Please review the bottleneck.</p>`);
              }
            }
          }

          await AuditLog.create({
            entityType: 'Escalation', entityId: sheet.userId,
            action: 'escalation_created', changedByName: 'System',
            description: `${level} GOAL_APPROVAL escalation triggered for ${employee?.name || sheet.userId} (${cycle.name})`,
          });
        }
      } catch (err) {
        results.errors.push(`GOAL_APPROVAL for sheet ${sheet._id}: ${err.message}`);
      }
    }

    // ── 3. CHECKIN_PENDING escalation ──────────────────────────────────────
    const activeQInfo = getActiveQuarterInfo(cycle);
    if (!activeQInfo) continue; // no active quarter right now

    const { label: activeQuarter, start: quarterStart } = activeQInfo;
    const daysSinceQStart = daysSince(quarterStart);
    if (daysSinceQStart < CHECKIN_L1) continue; // too early to escalate

    // Find employees with approved sheets but no check-in for this quarter
    const approvedSheets = await GoalSheet.find({ cycleId, status: { $in: ['Approved', 'Locked'] } }).lean();
    for (const sheet of approvedSheets) {
      try {
        const employeeGoals = await Goal.find({ goalSheetId: sheet._id, status: { $in: ['Approved', 'Locked'] } }).lean();
        if (!employeeGoals.length) continue;

        // Check if ANY goal has a check-in for this quarter
        const hasAnyCheckin = await CheckIn.findOne({
          userId: sheet.userId,
          goalId: { $in: employeeGoals.map(g => g._id) },
          quarter: activeQuarter,
        }).lean();
        if (hasAnyCheckin) continue; // employee has checked in, no escalation needed

        let level = null;
        if (daysSinceQStart >= CHECKIN_L2) level = 'LEVEL_2';
        else if (daysSinceQStart >= CHECKIN_L1) level = 'LEVEL_1';
        if (!level) continue;

        const employee = allEmployees.find(e => e._id.toString() === sheet.userId.toString());
        if (!employee) continue;

        const msg = `No ${activeQuarter} check-in submitted (${Math.floor(daysSinceQStart)} days into quarter) — ${cycle.name}`;
        const created = await createEscalationIfNew({
          userId: sheet.userId, goalSheetId: sheet._id, cycleId,
          quarter: activeQuarter, type: 'CHECKIN_PENDING', level, message: msg,
        });

        if (created) {
          results.created++;

          await notify(employee._id, `Reminder: ${activeQuarter} Check-in Pending`,
            `You haven't submitted your ${activeQuarter} check-in for ${cycle.name}. Please update your progress.`, '/checkin');
          await tryEmail(employee.email, `[IHGST] ${activeQuarter} Check-in Required — ${cycle.name}`,
            `<p>Hi ${employee.name},</p><p>Your <strong>${activeQuarter} check-in</strong> for <strong>${cycle.name}</strong> is overdue. Please log in and submit your progress.</p>`);

          if (level === 'LEVEL_2' && employee.managerId) {
            await notify(employee.managerId, 'Escalation: Check-in Overdue',
              `${employee.name} has not submitted their ${activeQuarter} check-in for ${cycle.name}.`, '/admin/escalations');
            const manager = await User.findById(employee.managerId).lean();
            if (manager?.email) {
              await tryEmail(manager.email, `[IHGST] Escalation: ${employee.name}'s Check-in Overdue`,
                `<p>Hi ${manager.name},</p><p><strong>${employee.name}</strong> has not submitted their <strong>${activeQuarter}</strong> check-in for <strong>${cycle.name}</strong>. Please follow up with them.</p>`);
            }
          }

          await AuditLog.create({
            entityType: 'Escalation', entityId: sheet.userId,
            action: 'escalation_created', changedByName: 'System',
            description: `${level} CHECKIN_PENDING escalation triggered for ${employee?.name || sheet.userId} — ${activeQuarter} (${cycle.name})`,
          });
        }
      } catch (err) {
        results.errors.push(`CHECKIN_PENDING for sheet ${sheet._id}: ${err.message}`);
      }
    }

    // ── 4. Auto-resolve: GOAL_SUBMISSION for those who've now submitted ─────
    try {
      const submittedUserIds = (await GoalSheet.find({ cycleId, status: { $nin: ['Draft'] } }).select('userId').lean()).map(s => s.userId.toString());
      if (submittedUserIds.length) {
        const resolved = await Escalation.updateMany(
          { cycleId, type: 'GOAL_SUBMISSION', status: 'ACTIVE', userId: { $in: submittedUserIds } },
          { $set: { status: 'RESOLVED', resolvedAt: new Date() } }
        );
        results.resolved += resolved.modifiedCount;
      }
    } catch { /* non-fatal */ }

    // ── 5. Auto-resolve: GOAL_APPROVAL for approved sheets ─────────────────
    try {
      const approvedUserIds = (await GoalSheet.find({ cycleId, status: { $in: ['Approved', 'Locked'] } }).select('userId').lean()).map(s => s.userId.toString());
      if (approvedUserIds.length) {
        const resolved = await Escalation.updateMany(
          { cycleId, type: 'GOAL_APPROVAL', status: 'ACTIVE', userId: { $in: approvedUserIds } },
          { $set: { status: 'RESOLVED', resolvedAt: new Date() } }
        );
        results.resolved += resolved.modifiedCount;
      }
    } catch { /* non-fatal */ }
  }

  return results;
}

// ─── Route handler ─────────────────────────────────────────────────────────
export async function GET(request) {
  // Validate cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await runEscalationEngine();
    return NextResponse.json({ success: true, ...results, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[cron/escalations] Fatal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
