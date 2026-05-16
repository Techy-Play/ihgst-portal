import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import GoalSheet from '@/models/GoalSheet';
import Goal from '@/models/Goal';
import Cycle from '@/models/Cycle';
import { handleApiError, parseBody } from '@/lib/apiError';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'Manager' && session.user.role !== 'Admin') return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    await dbConnect();

    let teamMembers;
    if (session.user.role === 'Admin') {
      teamMembers = await User.find({ role: { $ne: 'Admin' } }).select('-password').lean();
    } else {
      teamMembers = await User.find({ managerId: session.user.id }).select('-password').lean();
    }

    const activeCycle = await Cycle.findOne({ isActive: true });

    const membersWithGoals = await Promise.all(teamMembers.map(async (member) => {
      let goalSheet = null, goals = [];
      if (activeCycle) {
        goalSheet = await GoalSheet.findOne({ userId: member._id, cycleId: activeCycle._id }).lean();
        if (goalSheet) goals = await Goal.find({ goalSheetId: goalSheet._id }).lean();
      }
      return { ...member, goalSheet, goalCount: goals.length, totalWeightage: goals.reduce((sum, g) => sum + g.weightage, 0) };
    }));

    return NextResponse.json({ team: membersWithGoals });
  } catch (error) {
    console.error('Manager team error:', error);
    return handleApiError(error, 'team route.js');
  }
}
