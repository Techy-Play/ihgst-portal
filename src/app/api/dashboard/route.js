import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';
import GoalSheet from '@/models/GoalSheet';
import Cycle from '@/models/Cycle';
import User from '@/models/User';
import { calculateProgress } from '@/lib/progress';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const userId = session.user.id;
    const role = session.user.role;
    const activeCycle = await Cycle.findOne({ isActive: true }).lean();

    let totalGoals = 0, approvedGoals = 0, pendingGoals = 0, avgProgress = 0, recentGoals = [];

    if (role === 'Admin') {
      totalGoals = await Goal.countDocuments();
      approvedGoals = await Goal.countDocuments({ status: { $in: ['Approved', 'Locked'] } });
      pendingGoals = await Goal.countDocuments({ status: 'Submitted' });
      const allGoals = await Goal.find().sort({ updatedAt: -1 }).limit(5).lean();
      recentGoals = allGoals.map(g => ({ ...g, progress: calcGoalProgress(g) }));
    } else if (role === 'Manager') {
      const ownGoals = await Goal.find({ userId }).lean();
      const teamMembers = await User.find({ managerId: userId }).select('_id').lean();
      const teamGoals = await Goal.find({ userId: { $in: teamMembers.map(m => m._id) } }).lean();
      const allGoals = [...ownGoals, ...teamGoals];
      totalGoals = allGoals.length;
      approvedGoals = allGoals.filter(g => ['Approved', 'Locked'].includes(g.status)).length;
      pendingGoals = allGoals.filter(g => g.status === 'Submitted').length;
      recentGoals = allGoals.slice(0, 5).map(g => ({ ...g, progress: calcGoalProgress(g) }));
    } else {
      const goals = await Goal.find({ userId }).sort({ updatedAt: -1 }).lean();
      totalGoals = goals.length;
      approvedGoals = goals.filter(g => ['Approved', 'Locked'].includes(g.status)).length;
      pendingGoals = goals.filter(g => g.status === 'Submitted').length;
      recentGoals = goals.slice(0, 5).map(g => ({ ...g, progress: calcGoalProgress(g) }));
    }

    if (recentGoals.length > 0) avgProgress = Math.round(recentGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / recentGoals.length);

    return NextResponse.json({ totalGoals, approvedGoals, pendingGoals, avgProgress, recentGoals, activeCycle });
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
