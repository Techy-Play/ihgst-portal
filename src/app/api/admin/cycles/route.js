import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Cycle from '@/models/Cycle';
import AuditLog from '@/models/AuditLog';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const cycles = await Cycle.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ cycles });
  } catch (error) { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const body = await request.json();
    if (body.isActive) await Cycle.updateMany({}, { $set: { isActive: false } });
    const cycle = await Cycle.create({ ...body, createdBy: session.user.id });
    await AuditLog.create({ entityType: 'Cycle', entityId: cycle._id, action: 'created', changedBy: session.user.id, changedByName: session.user.name, description: `Cycle "${cycle.name}" created` });
    return NextResponse.json({ cycle, message: 'Cycle created' }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const { cycleId, isActive } = await request.json();
    if (!cycleId) return NextResponse.json({ error: 'Cycle ID is required' }, { status: 400 });

    const cycle = await Cycle.findById(cycleId);
    if (!cycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });

    if (isActive) {
      // Deactivate all other cycles first
      await Cycle.updateMany({ _id: { $ne: cycleId } }, { $set: { isActive: false } });
    }
    cycle.isActive = isActive;
    await cycle.save();

    await AuditLog.create({
      entityType: 'Cycle', entityId: cycle._id,
      action: isActive ? 'activated' : 'deactivated',
      changedBy: session.user.id, changedByName: session.user.name,
      description: `Cycle "${cycle.name}" ${isActive ? 'activated' : 'deactivated'}`,
    });

    return NextResponse.json({ cycle, message: `Cycle ${isActive ? 'activated' : 'deactivated'}` });
  } catch (error) { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}
