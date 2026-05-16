import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Goal from '@/models/Goal';
import GoalSheet from '@/models/GoalSheet';
import Cycle from '@/models/Cycle';
import { handleApiError, parseBody } from '@/lib/apiError';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const activeCycle = await Cycle.findOne({ isActive: true }).lean();
    const query = activeCycle ? { cycleId: activeCycle._id } : {};
    const sheetQuery = activeCycle ? { cycleId: activeCycle._id } : {};

    const totalUsers = await User.countDocuments();
    const totalGoals = await Goal.countDocuments(query);
    const approvedSheets = await GoalSheet.countDocuments({ ...sheetQuery, status: { $in: ['Approved', 'Locked'] } });
    const pendingSheets = await GoalSheet.countDocuments({ ...sheetQuery, status: 'Submitted' });
    return NextResponse.json({ totalUsers, totalGoals, approvedSheets, pendingSheets });
  } catch (error) { return handleApiError(error, 'stats route.js'); }
}
