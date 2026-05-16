import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';
import Cycle from '@/models/Cycle';
import AuditLog from '@/models/AuditLog';
import mongoose from 'mongoose';
import { handleApiError, parseBody } from '@/lib/apiError';

// GET: Get draft counts per old cycle
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['Manager', 'Admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await dbConnect();
    const cycles = await Cycle.find().sort({ createdAt: -1 }).lean();
    const activeCycle = cycles.find(c => c.isActive);

    const result = [];
    for (const cycle of cycles) {
      const isActive = cycle.isActive;
      const filter = { cycleId: cycle._id, status: 'Draft' };

      // Managers can only see their team's drafts
      if (session.user.role === 'Manager') {
        const User = (await import('@/models/User')).default;
        const teamMembers = await User.find({ managerId: session.user.id }).select('_id').lean();
        const teamIds = teamMembers.map(m => m._id);
        teamIds.push(new mongoose.Types.ObjectId(session.user.id));
        filter.userId = { $in: teamIds };
      }

      const draftCount = await Goal.countDocuments(filter);
      const returnedCount = await Goal.countDocuments({ ...filter, status: undefined, cycleId: cycle._id, status: 'Returned' });

      if (draftCount > 0 || returnedCount > 0) {
        result.push({
          cycleId: cycle._id,
          cycleName: cycle.name,
          isActive,
          draftCount,
          returnedCount,
        });
      }
    }

    return NextResponse.json({ cycles: result });
  } catch (error) {
    console.error('Draft cleanup GET error:', error);
    return handleApiError(error, 'cleanup route.js');
  }
}

// DELETE: Bulk delete drafts from a specific cycle
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['Manager', 'Admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await dbConnect();
    const { cycleId, includeReturned } = await request.json();

    if (!cycleId) return NextResponse.json({ error: 'Cycle ID is required.' }, { status: 400 });
    if (!mongoose.Types.ObjectId.isValid(cycleId)) return NextResponse.json({ error: 'Invalid cycle ID.' }, { status: 400 });

    // Don't allow deleting drafts from the active cycle
    const cycle = await Cycle.findById(cycleId).lean();
    if (!cycle) return NextResponse.json({ error: 'Cycle not found.' }, { status: 404 });
    if (cycle.isActive) return NextResponse.json({ error: 'Cannot bulk-delete drafts from the active cycle. Use the Goals page instead.' }, { status: 400 });

    const statuses = ['Draft'];
    if (includeReturned) statuses.push('Returned');

    const filter = { cycleId: new mongoose.Types.ObjectId(cycleId), status: { $in: statuses } };

    // Managers can only delete their team's drafts
    if (session.user.role === 'Manager') {
      const User = (await import('@/models/User')).default;
      const teamMembers = await User.find({ managerId: session.user.id }).select('_id').lean();
      const teamIds = teamMembers.map(m => m._id);
      teamIds.push(new mongoose.Types.ObjectId(session.user.id));
      filter.userId = { $in: teamIds };
    }

    const result = await Goal.deleteMany(filter);

    await AuditLog.create({
      entityType: 'Goal', entityId: null,
      action: 'bulk_deleted', changedBy: session.user.id, changedByName: session.user.name,
      description: `Bulk deleted ${result.deletedCount} draft goal(s) from cycle "${cycle.name}"`,
    });

    return NextResponse.json({
      message: `Deleted ${result.deletedCount} draft goal(s) from ${cycle.name}.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Draft cleanup DELETE error:', error);
    return handleApiError(error, 'cleanup route.js');
  }
}
