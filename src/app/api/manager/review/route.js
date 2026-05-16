import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';
import GoalSheet from '@/models/GoalSheet';
import AuditLog from '@/models/AuditLog';
import Notification from '@/models/Notification';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'Manager' && session.user.role !== 'Admin') return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    await dbConnect();
    const body = await request.json();
    const { goalSheetId, action, comment, goalEdits } = body;

    const goalSheet = await GoalSheet.findById(goalSheetId);
    if (!goalSheet) return NextResponse.json({ error: 'Goal sheet not found' }, { status: 404 });

    if (goalEdits && goalEdits.length > 0) {
      for (const edit of goalEdits) {
        const goal = await Goal.findById(edit.goalId);
        if (goal) {
          const changes = {};
          if (edit.target !== undefined && edit.target !== goal.target) { changes.target = { old: goal.target, new: edit.target }; goal.target = edit.target; }
          if (edit.weightage !== undefined && edit.weightage !== goal.weightage) { changes.weightage = { old: goal.weightage, new: edit.weightage }; goal.weightage = edit.weightage; }
          if (Object.keys(changes).length > 0) {
            await goal.save();
            await AuditLog.create({ entityType: 'Goal', entityId: goal._id, action: 'manager_edited', changedBy: session.user.id, changedByName: session.user.name, changes, description: `Manager edited goal "${goal.title}"` });
          }
        }
      }
    }

    if (action === 'approve') {
      // Validate total weightage equals 100% after any edits
      const allGoals = await Goal.find({ goalSheetId: goalSheet._id }).lean();
      const totalWeightage = allGoals.reduce((sum, g) => sum + g.weightage, 0);
      if (totalWeightage !== 100) return NextResponse.json({ error: `Total weightage must equal 100%. Current: ${totalWeightage}%` }, { status: 400 });

      goalSheet.status = 'Approved'; goalSheet.approvedAt = new Date(); goalSheet.approvedBy = session.user.id;
      await goalSheet.save();
      await Goal.updateMany({ goalSheetId: goalSheet._id }, { $set: { status: 'Approved' } });
      await AuditLog.create({ entityType: 'GoalSheet', entityId: goalSheet._id, action: 'approved', changedBy: session.user.id, changedByName: session.user.name, description: 'Goal sheet approved' });
      await Notification.create({ userId: goalSheet.userId, type: 'goal_approved', title: 'Goals Approved', message: `Your goal sheet has been approved by ${session.user.name}.`, link: '/goals' });
    } else if (action === 'return') {
      goalSheet.status = 'Returned';
      if (comment) goalSheet.comments.push({ text: comment, by: session.user.id, byName: session.user.name, role: session.user.role });
      await goalSheet.save();
      await Goal.updateMany({ goalSheetId: goalSheet._id }, { $set: { status: 'Returned' } });
      await AuditLog.create({ entityType: 'GoalSheet', entityId: goalSheet._id, action: 'returned', changedBy: session.user.id, changedByName: session.user.name, description: `Goal sheet returned: ${comment || 'No comment'}` });
      await Notification.create({ userId: goalSheet.userId, type: 'goal_returned', title: 'Goals Returned for Rework', message: `Your goal sheet was returned by ${session.user.name}. ${comment || ''}`, link: '/goals' });
    }

    return NextResponse.json({ message: `Goal sheet ${action}ed successfully` });
  } catch (error) {
    console.error('Review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
