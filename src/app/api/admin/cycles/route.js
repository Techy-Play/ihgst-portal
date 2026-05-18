import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Cycle from '@/models/Cycle';
import AuditLog from '@/models/AuditLog';
import { handleApiError } from '@/lib/apiError';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    // Backfill: ensure existing cycles have isClosed and cycleStatus fields
    await Cycle.collection.updateMany(
      { isClosed: { $exists: false } },
      { $set: { isClosed: false, cycleStatus: 'on_track' } }
    );
    await Cycle.collection.updateMany(
      { cycleStatus: { $exists: false } },
      { $set: { cycleStatus: 'on_track' } }
    );
    // Sync cycleStatus for already-closed cycles that may lack it
    await Cycle.collection.updateMany(
      { isClosed: true, cycleStatus: { $ne: 'closed' } },
      { $set: { cycleStatus: 'closed' } }
    );

    const cycles = await Cycle.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ cycles });
  } catch (error) { return handleApiError(error, 'cycles GET'); }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const body = await request.json();
    if (body.isActive) await Cycle.collection.updateMany({}, { $set: { isActive: false } });
    const cycle = await Cycle.create({ ...body, createdBy: session.user.id, isClosed: false, cycleStatus: 'on_track' });
    await AuditLog.create({ entityType: 'Cycle', entityId: cycle._id, action: 'created', changedBy: session.user.id, changedByName: session.user.name, description: `Cycle "${cycle.name}" created` });
    return NextResponse.json({ cycle, message: 'Cycle created' }, { status: 201 });
  } catch (error) { return handleApiError(error, 'cycles POST'); }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const body = await request.json();
    const { cycleId, action, status } = body;

    if (!cycleId) return NextResponse.json({ error: 'Cycle ID is required' }, { status: 400 });

    const VALID_ACTIONS = ['activate', 'deactivate', 'close', 'set-status'];
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: `Invalid action. Use: ${VALID_ACTIONS.join(', ')}` }, { status: 400 });
    }

    // Always fetch fresh from DB using native collection (no Mongoose schema filter)
    const existing = await Cycle.collection.findOne({ _id: require('mongoose').Types.ObjectId.createFromHexString(cycleId) });
    if (!existing) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });

    let updateFields = {};
    let auditAction, auditDesc, message;

    if (action === 'activate') {
      // Deactivate all others first
      await Cycle.collection.updateMany({ _id: { $ne: existing._id } }, { $set: { isActive: false } });
      updateFields = { isActive: true, isClosed: false, cycleStatus: 'on_track' };
      auditAction = 'activated';
      auditDesc = `Cycle "${existing.name}" activated`;
      message = `Cycle "${existing.name}" activated successfully`;

    } else if (action === 'deactivate') {
      updateFields = { isActive: false };
      auditAction = 'deactivated';
      auditDesc = `Cycle "${existing.name}" deactivated`;
      message = `Cycle "${existing.name}" deactivated`;

    } else if (action === 'close') {
      // Close always allowed (admin decision) — no guard blocking inactive cycles
      updateFields = { isActive: false, isClosed: true, closedAt: new Date(), cycleStatus: 'closed' };
      auditAction = 'closed';
      auditDesc = `Cycle "${existing.name}" closed and archived`;
      message = `Cycle "${existing.name}" has been closed and archived successfully`;

    } else if (action === 'set-status') {
      // Admin manually sets cycle status: on_track | incomplete | closed
      const VALID_STATUSES = ['on_track', 'incomplete', 'closed'];
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: `Invalid status. Use: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
      }
      updateFields = { cycleStatus: status };
      // If admin explicitly sets to 'closed', also set isClosed
      if (status === 'closed') updateFields = { ...updateFields, isClosed: true, isActive: false, closedAt: existing.closedAt || new Date() };
      // If admin sets back to 'on_track' or 'incomplete', un-archive
      if (status !== 'closed') updateFields = { ...updateFields, isClosed: false };
      auditAction = 'status-changed';
      auditDesc = `Cycle "${existing.name}" status set to "${status}"`;
      message = `Cycle "${existing.name}" status updated to ${status.replace('_', ' ')}`;
    }

    // Write directly via native collection to guarantee all fields are persisted
    await Cycle.collection.findOneAndUpdate(
      { _id: existing._id },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    // Fetch the updated document to return
    const updated = await Cycle.collection.findOne({ _id: existing._id });

    await AuditLog.create({
      entityType: 'Cycle', entityId: cycleId,
      action: auditAction,
      changedBy: session.user.id, changedByName: session.user.name,
      description: auditDesc,
    }).catch(() => {}); // Non-blocking

    return NextResponse.json({ cycle: updated, message });
  } catch (error) { return handleApiError(error, 'cycles PUT'); }
}
