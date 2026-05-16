import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import GoalSheet from '@/models/GoalSheet';
import Goal from '@/models/Goal';
import AuditLog from '@/models/AuditLog';
import Notification from '@/models/Notification';
import { handleApiError, parseBody } from '@/lib/apiError';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { goalSheetId } = await request.json();
    const goalSheet = await GoalSheet.findById(goalSheetId);
    if (!goalSheet) return NextResponse.json({ error: 'Goal sheet not found' }, { status: 404 });
    goalSheet.status = 'Draft'; await goalSheet.save();
    await Goal.updateMany({ goalSheetId: goalSheet._id }, { $set: { status: 'Draft' } });
    await AuditLog.create({ entityType: 'GoalSheet', entityId: goalSheet._id, action: 'unlocked', changedBy: session.user.id, changedByName: session.user.name, description: 'Goal sheet unlocked by admin' });
    await Notification.create({ userId: goalSheet.userId, type: 'goal_unlocked', title: 'Goals Unlocked', message: 'Your goal sheet has been unlocked by an administrator.', link: '/goals' });
    return NextResponse.json({ message: 'Goal sheet unlocked successfully' });
  } catch (error) { return handleApiError(error, 'unlock route.js'); }
}
