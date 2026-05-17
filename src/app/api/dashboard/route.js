import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';
import GoalSheet from '@/models/GoalSheet';
import Cycle from '@/models/Cycle';
import User from '@/models/User';
import CheckIn from '@/models/CheckIn';
import { calculateProgress } from '@/lib/progress';
import { handleApiError } from '@/lib/apiError';

function getActiveQuarter(cycle) {
  if (!cycle?.quarters?.length) return null;
  const now = new Date();
  for (let i = 0; i < cycle.quarters.length; i++) {
    const q = cycle.quarters[i];
    if (q.start && q.end && new Date(q.start) <= now && now <= new Date(q.end)) {
      return `Q${i + 1}`; // Normalize to Q1/Q2/Q3/Q4
    }
  }
  return 'Q1';
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const userId = session.user.id;
    const role = session.user.role;
    const activeCycle = await Cycle.findOne({ isActive: true }).lean();
    const activeQuarter = getActiveQuarter(activeCycle);

    // Quick backfill for legacy goals without cycleId (runs seamlessly)
    if (activeCycle) {
      await Goal.updateMany({ cycleId: { $exists: false } }, { $set: { cycleId: activeCycle._id } });
    }

    let totalGoals = 0, approvedGoals = 0, pendingGoals = 0, avgProgress = 0, recentGoals = [];
    let pendingActions = [];

    if (role === 'Admin') {
      const query = activeCycle ? { cycleId: activeCycle._id } : {};
      totalGoals = await Goal.countDocuments(query);
      approvedGoals = await Goal.countDocuments({ ...query, status: { $in: ['Approved', 'Locked'] } });
      pendingGoals = await Goal.countDocuments({ ...query, status: 'Submitted' });
      const allGoals = await Goal.find(query).sort({ updatedAt: -1 }).lean();
      recentGoals = allGoals.slice(0, 5).map(g => ({ ...g, progress: calcGoalProgress(g) }));
      // Admin avg progress = average of ALL approved goals (org-wide)
      const approvedAll = allGoals.filter(g => ['Approved', 'Locked'].includes(g.status));
      avgProgress = approvedAll.length > 0 ? Math.round(approvedAll.reduce((s, g) => s + calcGoalProgress(g), 0) / approvedAll.length) : 0;

      // Admin pending actions
      if (pendingGoals > 0) pendingActions.push({ label: `${pendingGoals} goal sheet(s) pending approval`, link: '/manager', type: 'warning' });
      if (!activeCycle) pendingActions.push({ label: 'No active cycle — configure one', link: '/admin/cycles', type: 'error' });
      const totalUsers = await User.countDocuments();
      pendingActions.push({ label: `${totalUsers} users in the system`, link: '/admin/users', type: 'info' });
      const adminKPIs = await Goal.countDocuments({ isShared: true, cycleId: activeCycle?._id });
      if (adminKPIs === 0) pendingActions.push({ label: 'Assign KPIs to managers & employees', link: '/manager/kpi', type: 'info' });

    } else if (role === 'Manager') {
      const query = activeCycle ? { cycleId: activeCycle._id } : {};
      
      // Personal stats (KPIs assigned to this manager)
      const ownGoals = await Goal.find({ userId, ...query }).sort({ updatedAt: -1 }).lean();
      const pTotal = ownGoals.length;
      const pApproved = ownGoals.filter(g => ['Approved', 'Locked'].includes(g.status)).length;
      const pPending = ownGoals.filter(g => g.status === 'Submitted').length;
      const pRecent = ownGoals.slice(0, 5).map(g => ({ ...g, progress: calcGoalProgress(g) }));
      const pApprovedAll = ownGoals.filter(g => ['Approved', 'Locked'].includes(g.status));
      const pAvg = pApprovedAll.length > 0 ? Math.round(pApprovedAll.reduce((s, g) => s + calcGoalProgress(g), 0) / pApprovedAll.length) : 0;
      
      const pActions = [];
      const ownSheet = await GoalSheet.findOne({ userId, cycleId: activeCycle?._id }).lean();
      // Managers don't create goals — they receive KPIs
      if (pTotal === 0) {
        pActions.push({ label: 'No KPIs assigned to you yet', link: '/goals', type: 'info' });
      } else if (!ownSheet || ownSheet.status === 'Draft') {
        pActions.push({ label: 'Submit your KPIs for review', link: '/goals', type: 'warning' });
      } else if (ownSheet.status === 'Returned') {
        pActions.push({ label: 'Rework your returned KPIs', link: '/goals', type: 'error' });
      }
      const ownApproved = ownGoals.filter(g => ['Approved', 'Locked'].includes(g.status));
      if (ownApproved.length > 0 && activeQuarter) {
        const checkins = await CheckIn.find({ userId, quarter: activeQuarter }).lean();
        const unchecked = ownApproved.filter(g => !checkins.some(c => c.goalId.toString() === g._id.toString()));
        if (unchecked.length > 0) pActions.push({ label: `Complete ${activeQuarter} check-in for ${unchecked.length} KPI(s)`, link: '/checkin', type: 'warning' });
      }

      // Team stats
      const teamMembers = await User.find({ managerId: userId }).select('_id').lean();
      const teamGoals = await Goal.find({ userId: { $in: teamMembers.map(m => m._id) }, ...query }).sort({ updatedAt: -1 }).lean();
      const tTotal = teamGoals.length;
      const tApproved = teamGoals.filter(g => ['Approved', 'Locked'].includes(g.status)).length;
      const tPending = teamGoals.filter(g => g.status === 'Submitted').length;
      const tRecent = teamGoals.slice(0, 5).map(g => ({ ...g, progress: calcGoalProgress(g) }));
      const tApprovedAll = teamGoals.filter(g => ['Approved', 'Locked'].includes(g.status));
      const tAvg = tApprovedAll.length > 0 ? Math.round(tApprovedAll.reduce((s, g) => s + calcGoalProgress(g), 0) / tApprovedAll.length) : 0;
      
      const tActions = [];
      if (tPending > 0) tActions.push({ label: `${tPending} goal(s) pending your review`, link: '/manager', type: 'warning' });
      if (tTotal === 0 && teamMembers.length > 0) tActions.push({ label: 'Assign KPIs to your team', link: '/manager/kpi', type: 'info' });
      tActions.push({ label: `${teamMembers.length} team member(s)`, link: '/manager', type: 'info' });

      return NextResponse.json({
        isManagerSplit: true,
        personal: { totalGoals: pTotal, approvedGoals: pApproved, pendingGoals: pPending, avgProgress: pAvg, recentGoals: pRecent, pendingActions: pActions },
        team: { totalGoals: tTotal, approvedGoals: tApproved, pendingGoals: tPending, avgProgress: tAvg, recentGoals: tRecent, pendingActions: tActions },
        activeCycle, activeQuarter
      });

    } else {
      // Employee
      const query = activeCycle ? { cycleId: activeCycle._id } : {};
      const goals = await Goal.find({ userId, ...query }).sort({ updatedAt: -1 }).lean();
      totalGoals = goals.length;
      approvedGoals = goals.filter(g => ['Approved', 'Locked'].includes(g.status)).length;
      pendingGoals = goals.filter(g => g.status === 'Submitted').length;
      recentGoals = goals.slice(0, 5).map(g => ({ ...g, progress: calcGoalProgress(g) }));

      // Employee pending actions
      const goalSheet = await GoalSheet.findOne({ userId, cycleId: activeCycle?._id }).lean();
      if (!goalSheet || goalSheet.status === 'Draft') {
        if (totalGoals === 0) pendingActions.push({ label: 'Create your first goal', link: '/goals/create', type: 'info' });
        else pendingActions.push({ label: 'Submit goals for review', link: '/goals', type: 'warning' });
      }
      if (goalSheet?.status === 'Returned') pendingActions.push({ label: 'Rework your returned goals', link: '/goals', type: 'error' });
      const approved = goals.filter(g => ['Approved', 'Locked'].includes(g.status));
      if (approved.length > 0 && activeQuarter) {
        const checkins = await CheckIn.find({ userId, quarter: activeQuarter }).lean();
        const unchecked = approved.filter(g => !checkins.some(c => c.goalId.toString() === g._id.toString()));
        if (unchecked.length > 0) pendingActions.push({ label: `Complete ${activeQuarter} check-in for ${unchecked.length} goal(s)`, link: '/checkin', type: 'warning' });
      }
    }

    if (recentGoals.length > 0) avgProgress = Math.round(recentGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / recentGoals.length);

    return NextResponse.json({ totalGoals, approvedGoals, pendingGoals, avgProgress, recentGoals, activeCycle, activeQuarter, pendingActions });
  } catch (error) {
    console.error('Dashboard error:', error);
    return handleApiError(error, 'dashboard GET');
  }
}

function calcGoalProgress(goal) {
  if (!goal.achievements || goal.achievements.length === 0) return 0;
  const latest = goal.achievements[goal.achievements.length - 1];
  return calculateProgress(goal, latest.value);
}
