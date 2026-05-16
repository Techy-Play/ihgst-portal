import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';
import AuditLog from '@/models/AuditLog';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    const goal = await Goal.findById(id).lean();
    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    const auditLogs = await AuditLog.find({ entityType: 'Goal', entityId: id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ goal, auditLogs });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const goal = await Goal.findById(id);
    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    if (!['Draft', 'Returned'].includes(goal.status)) return NextResponse.json({ error: 'Goal is locked and cannot be edited.' }, { status: 400 });

    // Shared goal guard — employees can only modify weightage
    if (goal.isShared && session.user.role === 'Employee') {
      const protectedFields = ['title', 'target', 'thrustArea', 'description', 'uom', 'uomDirection'];
      const attemptedProtected = Object.keys(body).filter(k => protectedFields.includes(k));
      if (attemptedProtected.length > 0) {
        return NextResponse.json({ error: 'Shared goals: only weightage can be modified.' }, { status: 400 });
      }
    }

    // Validate values if provided
    if (body.weightage !== undefined) {
      const w = parseInt(body.weightage);
      if (isNaN(w) || w < 10 || w > 100) {
        return NextResponse.json({ error: 'Weightage must be between 10% and 100%.' }, { status: 400 });
      }
      body.weightage = w;
    }
    if (body.target !== undefined && body.target !== '' && goal.uom !== 'Timeline') {
      const t = Number(body.target);
      if (isNaN(t) || t < 0) {
        return NextResponse.json({ error: 'Target must be a valid positive number.' }, { status: 400 });
      }
    }
    if (body.title !== undefined && !body.title?.trim()) {
      return NextResponse.json({ error: 'Goal title cannot be empty.' }, { status: 400 });
    }

    const changes = {};
    Object.keys(body).forEach(key => {
      if (body[key] !== goal[key]) { changes[key] = { old: goal[key], new: body[key] }; goal[key] = body[key]; }
    });

    await goal.save();
    if (Object.keys(changes).length > 0) {
      await AuditLog.create({ entityType: 'Goal', entityId: goal._id, action: 'updated', changedBy: session.user.id, changedByName: session.user.name, changes, description: `Goal "${goal.title}" updated` });
    }
    return NextResponse.json({ goal, message: 'Goal updated' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    const goal = await Goal.findById(id);
    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    if (!['Draft', 'Returned'].includes(goal.status)) return NextResponse.json({ error: 'Cannot delete locked goal.' }, { status: 400 });
    await Goal.findByIdAndDelete(id);
    await AuditLog.create({ entityType: 'Goal', entityId: id, action: 'deleted', changedBy: session.user.id, changedByName: session.user.name, description: `Goal "${goal.title}" deleted` });
    return NextResponse.json({ message: 'Goal deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
