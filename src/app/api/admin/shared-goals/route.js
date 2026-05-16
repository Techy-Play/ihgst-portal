import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';
import GoalSheet from '@/models/GoalSheet';
import Cycle from '@/models/Cycle';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import Notification from '@/models/Notification';
import { handleApiError, parseBody } from '@/lib/apiError';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const sharedGoals = await Goal.find({ isShared: true }).populate('userId', 'name department').sort({ createdAt: -1 }).lean();
    return NextResponse.json({ sharedGoals });
  } catch (error) {
    return handleApiError(error, 'shared-goals route.js');
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const { title, description, thrustArea, uom, uomDirection, target, weightage, employeeIds } = await request.json();

    if (!title || !description || !thrustArea || !uom || !target || !weightage) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const activeCycle = await Cycle.findOne({ isActive: true });
    if (!activeCycle) return NextResponse.json({ error: 'No active cycle found' }, { status: 400 });

    let targetUsers;
    if (employeeIds === 'all') {
      targetUsers = await User.find({ role: { $ne: 'Admin' } }).select('_id name').lean();
    } else {
      targetUsers = await User.find({ _id: { $in: employeeIds } }).select('_id name').lean();
    }

    const createdGoals = [];
    for (const user of targetUsers) {
      let goalSheet = await GoalSheet.findOne({ userId: user._id, cycleId: activeCycle._id });
      if (!goalSheet) {
        goalSheet = await GoalSheet.create({ userId: user._id, cycleId: activeCycle._id, status: 'Draft' });
      }

      const existingCount = await Goal.countDocuments({ goalSheetId: goalSheet._id });
      if (existingCount >= 8) continue;

      const goal = await Goal.create({
        userId: user._id,
        cycleId: activeCycle._id,
        goalSheetId: goalSheet._id,
        thrustArea, title, description,
        uom, uomDirection: uomDirection || 'Min',
        target, weightage,
        status: goalSheet.status === 'Draft' ? 'Draft' : goalSheet.status,
        isShared: true,
        sharedBy: session.user.id,
        primaryOwnerId: session.user.id,
      });

      createdGoals.push(goal);

      await Notification.create({
        userId: user._id,
        type: 'shared_goal',
        title: 'New Shared Goal Assigned',
        message: `"${title}" has been assigned to you by an administrator.`,
        link: '/goals',
      });
    }

    await AuditLog.create({
      entityType: 'Goal',
      entityId: createdGoals[0]?._id || null,
      action: 'shared_goal_created',
      changedBy: session.user.id,
      changedByName: session.user.name,
      description: `Shared goal "${title}" created for ${createdGoals.length} employees`,
    });

    return NextResponse.json({
      message: `Shared goal created for ${createdGoals.length} employees`,
      count: createdGoals.length,
    }, { status: 201 });
  } catch (error) {
    console.error('Shared goals error:', error);
    return handleApiError(error, 'shared-goals route.js');
  }
}
