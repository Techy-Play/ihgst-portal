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

function getActiveQuarter(cycle) {
  if (!cycle?.quarters?.length) return null;
  const now = new Date();
  for (const q of cycle.quarters) {
    if (q.start && q.end && new Date(q.start) <= now && now <= new Date(q.end)) {
      return q.label;
    }
  }
  // If no quarter matches, default to Q1
  return cycle.quarters[0]?.label || 'Q1';
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

    let totalGoals = 0, approvedGoals = 0, pendingGoals = 0, avgProgress = 0, recentGoals = [];
    let pendingActions = [];

    if (role === 'Admin') {
      totalGoals = await Goal.countDocuments();
      approvedGoals = await Goal.countDocuments({ status: { $in: ['Approved', 'Locked'] } });
      pendingGoals = await Goal.countDocuments({ status: 'Submitted' });
      const allGoals = await Goal.find().sort({ updatedAt: -1 }).limit(5).lean();
      recentGoals = allGoals.map(g => ({ ...g, progress: calcGoalProgress(g) }));

      // Admin pending actions
      if (pendingGoals > 0) pendingActions.push({ label: `${pendingGoals} goal sheet(s) pending approval`, link: '/admin/reports', type: 'warning' });
      if (!activeCycle) pendingActions.push({ label: 'No active cycle — configure one', link: '/admin/cycles', type: 'error' });
      const totalUsers = await User.countDocuments();
      pendingActions.push({ label: `${totalUsers} users in the system`, link: '/admin/users', type: 'info' });

    } else if (role === 'Manager') {
      const ownGoals = await Goal.find({ userId }).lean();
      const teamMembers = await User.find({ managerId: userId }).select('_id').lean();
      const teamGoals = await Goal.find({ userId: { $in: teamMembers.map(m => m._id) } }).lean();
      const allGoals = [...ownGoals, ...teamGoals];
      totalGoals = allGoals.length;
      approvedGoals = allGoals.filter(g => ['Approved', 'Locked'].includes(g.status)).length;
      pendingGoals = allGoals.filter(g => g.status === 'Submitted').length;
      recentGoals = allGoals.slice(0, 5).map(g => ({ ...g, progress: calcGoalProgress(g) }));

      // Manager pending actions
      if (pendingGoals > 0) pendingActions.push({ label: `${pendingGoals} goal(s) pending your review`, link: '/manager', type: 'warning' });
      const ownSheet = await GoalSheet.findOne({ userId, cycleId: activeCycle?._id }).lean();
      if (ownSheet?.status === 'Draft') pendingActions.push({ label: 'Submit your own goals for review', link: '/goals', type: 'info' });
      if (ownSheet?.status === 'Returned') pendingActions.push({ label: 'Rework your returned goals', link: '/goals', type: 'error' });
      const ownApproved = ownGoals.filter(g => ['Approved', 'Locked'].includes(g.status));
      if (ownApproved.length > 0 && activeQuarter) {
        const checkins = await CheckIn.find({ userId, quarter: activeQuarter }).lean();
        const unchecked = ownApproved.filter(g => !checkins.some(c => c.goalId.toString() === g._id.toString()));
        if (unchecked.length > 0) pendingActions.push({ label: `Complete ${activeQuarter} check-in for ${unchecked.length} goal(s)`, link: '/checkin', type: 'warning' });
      }

    } else {
      // Employee
      const goals = await Goal.find({ userId }).sort({ updatedAt: -1 }).lean();
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calcGoalProgress(goal) {
  if (!goal.achievements || goal.achievements.length === 0) return 0;
  const latest = goal.achievements[goal.achievements.length - 1];
  return calculateProgress(goal, latest.value);
}
