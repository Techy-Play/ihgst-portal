import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Escalation from '@/models/Escalation';
import AuditLog from '@/models/AuditLog';
// These imports register the schemas Mongoose needs for .populate() calls
import '@/models/Cycle';
import '@/models/User';
import '@/models/GoalSheet';
import { handleApiError, parseBody } from '@/lib/apiError';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const type      = searchParams.get('type') || '';
    const level     = searchParams.get('level') || '';
    const status    = searchParams.get('status') || 'ACTIVE';
    const cycleId   = searchParams.get('cycleId') || '';
    const userId    = searchParams.get('userId') || '';
    const dateFrom  = searchParams.get('dateFrom') || '';
    const dateTo    = searchParams.get('dateTo') || '';
    const page      = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit     = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const query = {};
    if (type   && type   !== 'all') query.type   = type;
    if (level  && level  !== 'all') query.level  = level;
    if (status && status !== 'all') query.status = status;
    if (cycleId) query.cycleId = cycleId;
    if (userId)  query.userId  = userId;
    if (dateFrom || dateTo) {
      query.triggeredAt = {};
      if (dateFrom) { const d = new Date(dateFrom); d.setHours(0,0,0,0); query.triggeredAt.$gte = d; }
      if (dateTo)   { const d = new Date(dateTo);   d.setHours(23,59,59,999); query.triggeredAt.$lte = d; }
    }

    const total = await Escalation.countDocuments(query);
    const escalations = await Escalation.find(query)
      .sort({ triggeredAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name email department role')
      .populate('cycleId', 'name')
      .populate('goalSheetId', 'status submittedAt')
      .lean();

    return NextResponse.json({ escalations, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    return handleApiError(error, 'admin/escalations GET');
  }
}

// PATCH — dismiss a single escalation
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();

    const { data: body, error: parseErr } = await parseBody(request);
    if (parseErr) return parseErr;
    const { escalationId, status: newStatus } = body;

    if (!escalationId) return NextResponse.json({ error: 'escalationId required' }, { status: 400 });
    if (!['DISMISSED', 'RESOLVED'].includes(newStatus)) {
      return NextResponse.json({ error: 'status must be DISMISSED or RESOLVED' }, { status: 400 });
    }

    const esc = await Escalation.findByIdAndUpdate(
      escalationId,
      { $set: { status: newStatus, resolvedAt: new Date() } },
      { new: true }
    );
    if (!esc) return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });

    await AuditLog.create({
      entityType: 'Escalation', entityId: esc._id,
      action: 'escalation_dismissed',
      changedBy: session.user.id, changedByName: session.user.name,
      description: `Escalation ${newStatus.toLowerCase()} by ${session.user.name}`,
    });

    return NextResponse.json({ message: 'Updated', escalation: esc });
  } catch (error) {
    return handleApiError(error, 'admin/escalations PATCH');
  }
}
