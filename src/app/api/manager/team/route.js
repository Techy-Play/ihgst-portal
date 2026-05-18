import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import GoalSheet from '@/models/GoalSheet';
import Goal from '@/models/Goal';
import Cycle from '@/models/Cycle';
import { calculateProgress } from '@/lib/progress';
import { handleApiError } from '@/lib/apiError';
import mongoose from 'mongoose';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'Manager' && session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const cycleIdParam = searchParams.get('cycleId');

    // Resolve which cycle to use
    let cycle = null;
    if (cycleIdParam && mongoose.Types.ObjectId.isValid(cycleIdParam)) {
      cycle = await Cycle.findById(cycleIdParam).lean();
    }
    if (!cycle) {
      cycle = await Cycle.findOne({ isActive: true }).lean();
    }

    let teamMembers;
    if (session.user.role === 'Admin') {
      teamMembers = await User.find({ role: { $ne: 'Admin' } }).select('-password').lean();
    } else {
      teamMembers = await User.find({ managerId: session.user.id }).select('-password').lean();
    }

    const membersWithGoals = await Promise.all(teamMembers.map(async (member) => {
      let goalSheet = null, goals = [];
      if (cycle) {
        goalSheet = await GoalSheet.findOne({ userId: member._id, cycleId: cycle._id }).lean();
        if (goalSheet) goals = await Goal.find({ goalSheetId: goalSheet._id }).lean();
      }
      let completion = 0;
      if (goals.length > 0) {
        let totalProgress = 0;
        goals.forEach(g => {
          const latestAch = g.achievements?.length > 0 ? g.achievements[g.achievements.length - 1] : null;
          if (latestAch) totalProgress += calculateProgress(g, latestAch.value);
        });
        completion = Math.round(totalProgress / goals.length);
      }
      return {
        ...member,
        goalSheet,
        goalCount: goals.length,
        totalWeightage: goals.reduce((sum, g) => sum + g.weightage, 0),
        completion,
      };
    }));

    // If it's an archived cycle, only show users who actually had goals during that cycle
    const filteredTeam = cycle?.isClosed
      ? membersWithGoals.filter(m => m.goalCount > 0)
      : membersWithGoals;

    return NextResponse.json({
      team: filteredTeam,
      cycle: cycle ? { _id: cycle._id, name: cycle.name, isClosed: cycle.isClosed, cycleStatus: cycle.cycleStatus } : null,
    });
  } catch (error) {
    console.error('Manager team error:', error);
    return handleApiError(error, 'team route.js');
  }
}
