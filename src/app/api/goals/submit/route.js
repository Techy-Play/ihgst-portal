import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';
import GoalSheet from '@/models/GoalSheet';
import AuditLog from '@/models/AuditLog';
import Notification from '@/models/Notification';
import User from '@/models/User';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { goalSheetId } = await request.json();
    const goalSheet = await GoalSheet.findById(goalSheetId);
    if (!goalSheet) return NextResponse.json({ error: 'Goal sheet not found' }, { status: 404 });
    if (!['Draft', 'Returned'].includes(goalSheet.status)) return NextResponse.json({ error: 'Goal sheet cannot be submitted in current state.' }, { status: 400 });

    const goals = await Goal.find({ goalSheetId: goalSheet._id });
    const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0);
    if (totalWeightage !== 100) return NextResponse.json({ error: `Total weightage must be exactly 100%. Current: ${totalWeightage}%` }, { status: 400 });

    goalSheet.status = 'Submitted'; goalSheet.submittedAt = new Date();
    await goalSheet.save();
    await Goal.updateMany({ goalSheetId: goalSheet._id }, { $set: { status: 'Submitted' } });

    await AuditLog.create({ entityType: 'GoalSheet', entityId: goalSheet._id, action: 'submitted', changedBy: session.user.id, changedByName: session.user.name, description: 'Goal sheet submitted for approval' });

    const user = await User.findById(session.user.id);
    if (user?.managerId) {
      await Notification.create({ userId: user.managerId, type: 'goal_submitted', title: 'Goal Sheet Submitted', message: `${session.user.name} has submitted their goal sheet for review.`, link: `/manager/review/${session.user.id}` });
    }

    return NextResponse.json({ message: 'Goals submitted for review' });
  } catch (error) {
    console.error('Submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
