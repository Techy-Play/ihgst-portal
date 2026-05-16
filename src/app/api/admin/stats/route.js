import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Goal from '@/models/Goal';
import GoalSheet from '@/models/GoalSheet';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const totalUsers = await User.countDocuments();
    const totalGoals = await Goal.countDocuments();
    const approvedSheets = await GoalSheet.countDocuments({ status: { $in: ['Approved', 'Locked'] } });
    const pendingSheets = await GoalSheet.countDocuments({ status: 'Submitted' });
    return NextResponse.json({ totalUsers, totalGoals, approvedSheets, pendingSheets });
  } catch (error) { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}
