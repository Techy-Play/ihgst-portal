import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Cycle from '@/models/Cycle';
import Goal from '@/models/Goal';
import GoalSheet from '@/models/GoalSheet';
import CheckIn from '@/models/CheckIn';
import User from '@/models/User';
import { handleApiError } from '@/lib/apiError';

export async function GET(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id: cycleId } = await context.params;

    const cycle = await Cycle.findById(cycleId).lean();
    if (!cycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });

    // Step 1: get all goals for this cycle first
    const allGoals = await Goal.find({ cycleId }).lean();
    const goalIds = allGoals.map(g => g._id);

    // Step 2: fetch remaining data in parallel (no nested awaits)
    const [totalEmployees, allSheets, allCheckIns] = await Promise.all([
      User.countDocuments({ role: 'Employee' }),
      GoalSheet.find({ cycleId }).lean(),
      goalIds.length > 0 ? CheckIn.find({ goalId: { $in: goalIds } }).lean() : Promise.resolve([]),
    ]);

    // ── Sheet counts ──────────────────────────────────────────────────────────
    const submittedSheets  = allSheets.filter(s => s.status === 'Submitted').length;
    const approvedSheets   = allSheets.filter(s => s.status === 'Approved').length;
    const lockedSheets     = allSheets.filter(s => s.status === 'Locked').length;
    const draftSheets      = allSheets.filter(s => s.status === 'Draft').length;
    const returnedSheets   = allSheets.filter(s => s.status === 'Returned').length;
    const employeesReviewed = approvedSheets + lockedSheets;
    const pendingApprovals  = submittedSheets;

    // ── Goal stats ────────────────────────────────────────────────────────────
    const totalGoals    = allGoals.length;
    const approvedGoals = allGoals.filter(g => ['Approved', 'Locked'].includes(g.status)).length;

    const completedGoals = allGoals.filter(g => {
      const latest = g.achievements?.[g.achievements.length - 1];
      return latest?.status === 'Completed';
    }).length;

    const delayedGoals = allGoals.filter(g => {
      const latest = g.achievements?.[g.achievements.length - 1];
      return latest?.status === 'At Risk';
    }).length;

    const incompleteGoals = allGoals.filter(g => {
      const latest = g.achievements?.[g.achievements.length - 1];
      const st = latest?.status || 'Not Started';
      return ['Not Started', 'On Track', 'At Risk'].includes(st);
    }).length;

    const incompleteKPIs = allGoals.filter(g => g.isShared && (!g.achievements || g.achievements.length === 0)).length;

    // ── Average progress ──────────────────────────────────────────────────────
    const goalsWithProgress = allGoals.filter(g => g.achievements?.length > 0);
    let avgProgress = 0;
    if (goalsWithProgress.length > 0) {
      const progressValues = goalsWithProgress.map(g => {
        const latest = g.achievements[g.achievements.length - 1];
        if (latest?.value == null || !g.target) return 0;
        const raw = (Number(latest.value) / Number(g.target)) * 100;
        return Math.min(100, Math.max(0, Math.round(raw)));
      });
      avgProgress = Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length);
    }

    const goalAchievementPct = approvedGoals > 0
      ? Math.round((completedGoals / approvedGoals) * 100)
      : 0;

    // ── Check-in coverage per quarter ─────────────────────────────────────────
    const quarterLabels = (cycle.quarters?.length > 0)
      ? cycle.quarters.map(q => q.label)
      : ['Q1', 'Q2', 'Q3', 'Q4'];

    const checkInCoverage = quarterLabels.map(q => {
      const qCheckins = allCheckIns.filter(c => c.quarter === q);
      const uniqueEmployees = new Set(qCheckins.map(c => c.userId?.toString())).size;
      return { quarter: q, count: qCheckins.length, uniqueEmployees };
    });

    const pendingCheckins = Math.max(0, (approvedGoals * quarterLabels.length) - allCheckIns.length);

    // ── Validation warnings ───────────────────────────────────────────────────
    const warnings = [];
    if (pendingApprovals > 0) {
      warnings.push({ type: 'error',   code: 'PENDING_APPROVALS', message: `${pendingApprovals} goal sheet${pendingApprovals !== 1 ? 's' : ''} still awaiting approval — must be resolved before closing` });
    }
    if (draftSheets > 0) {
      warnings.push({ type: 'warning', code: 'DRAFT_SHEETS',      message: `${draftSheets} employee${draftSheets !== 1 ? 's have' : ' has'} draft goal sheets not yet submitted` });
    }
    if (returnedSheets > 0) {
      warnings.push({ type: 'warning', code: 'RETURNED_SHEETS',   message: `${returnedSheets} goal sheet${returnedSheets !== 1 ? 's' : ''} returned and awaiting resubmission` });
    }
    if (incompleteKPIs > 0) {
      warnings.push({ type: 'warning', code: 'INCOMPLETE_KPIS',   message: `${incompleteKPIs} shared KPI${incompleteKPIs !== 1 ? 's have' : ' has'} no progress recorded` });
    }
    if (delayedGoals > 0) {
      warnings.push({ type: 'info',    code: 'DELAYED_GOALS',     message: `${delayedGoals} goal${delayedGoals !== 1 ? 's' : ''} marked as At Risk at time of closure` });
    }

    const canClose = pendingApprovals === 0;

    return NextResponse.json({
      cycle: { id: cycle._id, name: cycle.name },
      summary: {
        totalEmployees,
        employeesReviewed,
        totalGoals,
        approvedGoals,
        completedGoals,
        incompleteGoals,
        delayedGoals,
        incompleteKPIs,
        pendingApprovals,
        pendingCheckins,
        avgProgress,
        goalAchievementPct,
        sheetBreakdown: { approvedSheets, lockedSheets, submittedSheets, draftSheets, returnedSheets },
        checkInCoverage,
      },
      warnings,
      canClose,
    });
  } catch (error) {
    return handleApiError(error, 'cycles closure-summary');
  }
}
