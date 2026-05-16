import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';
import GoalSheet from '@/models/GoalSheet';
import Cycle from '@/models/Cycle';
import mongoose from 'mongoose';
import AuditLog from '@/models/AuditLog';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;
    const cycleId = searchParams.get('cycleId');

    // Determine which cycle to show
    let targetCycleId = cycleId;
    let activeCycle = null;
    if (!targetCycleId) {
      activeCycle = await Cycle.findOne({ isActive: true }).lean();
      if (activeCycle) targetCycleId = activeCycle._id.toString();
    }

    // Fetch all cycles for the dropdown
    const cycles = await Cycle.find({}).sort({ createdAt: -1 }).lean();

    // Find the target cycle name
    const targetCycle = cycles.find(c => c._id.toString() === targetCycleId);
    const isActiveCycle = targetCycle?.isActive === true;

    // Build query: always scoped to a cycle
    let query = { userId };
    if (targetCycleId && mongoose.Types.ObjectId.isValid(targetCycleId)) {
      query.cycleId = new mongoose.Types.ObjectId(targetCycleId);
    }

    const goals = await Goal.find(query).sort({ createdAt: -1 }).lean();

    // Get goal sheet for this specific cycle
    let goalSheet = null;
    if (targetCycleId) {
      goalSheet = await GoalSheet.findOne({ userId, cycleId: targetCycleId }).lean();
    } else if (goals.length > 0) {
      goalSheet = await GoalSheet.findById(goals[0].goalSheetId).lean();
    }

    const totalWeightage = goals.reduce((sum, g) => sum + (g.weightage || 0), 0);

    return NextResponse.json({
      goals,
      goalSheet,
      totalWeightage,
      cycles,
      activeCycleId: activeCycle?._id || targetCycleId,
      selectedCycleId: targetCycleId,
      selectedCycleName: targetCycle?.name || 'Unknown',
      isActiveCycle,
    });
  } catch (error) {
    console.error('Goals GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Managers cannot create personal goals — they receive shared KPIs
    if (session.user.role === 'Manager') {
      return NextResponse.json({ error: 'Managers receive goals via shared KPIs. Contact your admin or use the Assign KPIs page.' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();

    // Validate required fields
    if (!body.thrustArea?.trim()) return NextResponse.json({ error: 'Thrust area is required.' }, { status: 400 });
    if (!body.title?.trim()) return NextResponse.json({ error: 'Goal title is required.' }, { status: 400 });
    if (!body.description?.trim()) return NextResponse.json({ error: 'Description is required.' }, { status: 400 });
    if (!body.uom) return NextResponse.json({ error: 'Unit of measurement is required.' }, { status: 400 });
    if (body.target === undefined || body.target === null || body.target === '') {
      return NextResponse.json({ error: 'Target value is required.' }, { status: 400 });
    }
    if (body.uom !== 'Timeline' && (isNaN(Number(body.target)) || Number(body.target) < 0)) {
      return NextResponse.json({ error: 'Target must be a valid positive number.' }, { status: 400 });
    }
    if (!body.weightage || isNaN(body.weightage) || body.weightage < 10 || body.weightage > 100) {
      return NextResponse.json({ error: 'Weightage must be between 10% and 100%.' }, { status: 400 });
    }

    const activeCycle = await Cycle.findOne({ isActive: true });
    if (!activeCycle) return NextResponse.json({ error: 'No active cycle found. Contact admin.' }, { status: 400 });

    let goalSheet = await GoalSheet.findOne({ userId: session.user.id, cycleId: activeCycle._id });
    if (!goalSheet) goalSheet = await GoalSheet.create({ userId: session.user.id, cycleId: activeCycle._id, status: 'Draft' });

    if (['Approved', 'Locked'].includes(goalSheet.status)) return NextResponse.json({ error: 'Goal sheet is locked.' }, { status: 400 });

    const existingGoals = await Goal.countDocuments({ goalSheetId: goalSheet._id });
    if (existingGoals >= 8) return NextResponse.json({ error: 'Maximum 8 goals per employee allowed.' }, { status: 400 });

    const currentTotal = await Goal.aggregate([{ $match: { goalSheetId: goalSheet._id } }, { $group: { _id: null, total: { $sum: '$weightage' } } }]);
    const currentWeightage = currentTotal[0]?.total || 0;
    if (currentWeightage + body.weightage > 100) return NextResponse.json({ error: `Total weightage would exceed 100%. Current: ${currentWeightage}%, Adding: ${body.weightage}%` }, { status: 400 });

    const goal = await Goal.create({
      userId: session.user.id, cycleId: activeCycle._id, goalSheetId: goalSheet._id,
      cycleName: activeCycle.name,
      thrustArea: body.thrustArea, title: body.title, description: body.description,
      uom: body.uom, uomDirection: body.uomDirection || 'Min', target: body.target,
      weightage: body.weightage, status: 'Draft', isShared: false,
    });

    await AuditLog.create({ entityType: 'Goal', entityId: goal._id, action: 'created', changedBy: session.user.id, changedByName: session.user.name, description: `Goal "${goal.title}" created for ${activeCycle.name}` });

    return NextResponse.json({ goal, message: 'Goal created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Goals POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
