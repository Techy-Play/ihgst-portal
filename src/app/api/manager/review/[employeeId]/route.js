import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import GoalSheet from '@/models/GoalSheet';
import Goal from '@/models/Goal';
import Cycle from '@/models/Cycle';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const { employeeId } = await params;
    const { searchParams } = new URL(request.url);
    const cycleIdParam = searchParams.get('cycleId');

    const employee = await User.findById(employeeId).select('-password').lean();
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    // Resolve cycle: URL param first, then active cycle
    let cycle = null;
    if (cycleIdParam && mongoose.Types.ObjectId.isValid(cycleIdParam)) {
      cycle = await Cycle.findById(cycleIdParam).lean();
    }
    if (!cycle) {
      cycle = await Cycle.findOne({ isActive: true }).lean();
    }

    let goalSheet = null, goals = [];
    if (cycle) {
      goalSheet = await GoalSheet.findOne({ userId: employeeId, cycleId: cycle._id }).lean();
      if (goalSheet) goals = await Goal.find({ goalSheetId: goalSheet._id }).lean();
    }

    // Return minimal cycle info for the UI to determine if comments are disabled
    const cycleInfo = cycle ? {
      _id: cycle._id,
      name: cycle.name,
      isClosed: cycle.isClosed === true,
      cycleStatus: cycle.cycleStatus || 'on_track',
    } : null;

    return NextResponse.json({ employee, goalSheet, goals, cycle: cycleInfo });
  } catch (error) {
    console.error('Review GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
