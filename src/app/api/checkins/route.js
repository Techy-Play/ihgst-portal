import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';
import CheckIn from '@/models/CheckIn';
import AuditLog from '@/models/AuditLog';
import Cycle from '@/models/Cycle';

function getActiveQuarter(cycle) {
  if (!cycle?.quarters?.length) return 'Q1';
  const now = new Date();
  for (const q of cycle.quarters) {
    if (q.start && q.end && new Date(q.start) <= now && now <= new Date(q.end)) return q.label;
  }
  return cycle.quarters[0]?.label || 'Q1';
}

function getQuarterStatus(cycle, qLabel) {
  if (!cycle?.quarters?.length) return 'unknown';
  const now = new Date();
  const q = cycle.quarters.find(q => q.label === qLabel);
  if (!q || !q.start || !q.end) return 'unknown';
  if (now < new Date(q.start)) return 'upcoming';
  if (now > new Date(q.end)) return 'completed';
  return 'active';
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;
    const quarter = searchParams.get('quarter');
    const activeCycle = await Cycle.findOne({ isActive: true }).lean();
    const query = activeCycle ? { cycleId: activeCycle._id } : {};
    
    const goals = await Goal.find({ userId, status: { $in: ['Approved', 'Locked'] }, ...query }).lean();
    let checkins = quarter ? await CheckIn.find({ userId, quarter }).lean() : await CheckIn.find({ userId }).lean();
    const goalsWithCheckins = goals.map(goal => ({ ...goal, checkins: checkins.filter(c => c.goalId.toString() === goal._id.toString()) }));

    const activeQuarter = getActiveQuarter(activeCycle);
    const quarterStatuses = {};
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => { quarterStatuses[q] = getQuarterStatus(activeCycle, q); });

    return NextResponse.json({ goals: goalsWithCheckins, checkins, activeQuarter, quarterStatuses });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const body = await request.json();
    const { goalId, quarter, achievement, status, comment } = body;

    // Validate required fields
    if (!goalId) return NextResponse.json({ error: 'Goal ID is required.' }, { status: 400 });
    if (!quarter || !['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      return NextResponse.json({ error: 'Valid quarter (Q1-Q4) is required.' }, { status: 400 });
    }
    if (achievement === undefined || achievement === null || achievement === '') {
      return NextResponse.json({ error: 'Achievement value is required.' }, { status: 400 });
    }
    if (typeof achievement === 'number' && isNaN(achievement)) {
      return NextResponse.json({ error: 'Achievement must be a valid number.' }, { status: 400 });
    }
    const validStatuses = ['Not Started', 'On Track', 'At Risk', 'Completed'];
    const checkinStatus = status && validStatuses.includes(status) ? status : 'On Track';

    const goal = await Goal.findById(goalId);
    if (!goal) return NextResponse.json({ error: 'Goal not found.' }, { status: 404 });

    let checkin = await CheckIn.findOne({ goalId, userId: session.user.id, quarter });
    if (checkin) { checkin.achievement = achievement; checkin.status = checkinStatus; checkin.employeeComment = comment || ''; await checkin.save(); }
    else { checkin = await CheckIn.create({ goalId, userId: session.user.id, quarter, achievement, status: checkinStatus, employeeComment: comment || '' }); }

    const idx = goal.achievements.findIndex(a => a.quarter === quarter);
    if (idx >= 0) goal.achievements[idx] = { quarter, value: achievement, status: checkinStatus, comment: comment || '', updatedAt: new Date() };
    else goal.achievements.push({ quarter, value: achievement, status: checkinStatus, comment: comment || '', updatedAt: new Date() });
    await goal.save();

    await AuditLog.create({ entityType: 'Goal', entityId: goalId, action: 'checkin_updated', changedBy: session.user.id, changedByName: session.user.name, description: `${quarter} check-in updated for "${goal.title}"` });
    return NextResponse.json({ checkin, message: 'Check-in saved successfully' });
  } catch (error) {
    console.error('Check-in POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

