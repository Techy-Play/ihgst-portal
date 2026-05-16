import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import GoalSheet from '@/models/GoalSheet';
import Goal from '@/models/Goal';
import Cycle from '@/models/Cycle';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { employeeId } = await params;
    const employee = await User.findById(employeeId).select('-password').lean();
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    const activeCycle = await Cycle.findOne({ isActive: true });
    let goalSheet = null, goals = [];
    if (activeCycle) { goalSheet = await GoalSheet.findOne({ userId: employeeId, cycleId: activeCycle._id }).lean(); if (goalSheet) goals = await Goal.find({ goalSheetId: goalSheet._id }).lean(); }
    return NextResponse.json({ employee, goalSheet, goals });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
