import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Escalation from '@/models/Escalation';
import { handleApiError } from '@/lib/apiError';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();

    const [
      active,
      resolved,
      dismissed,
      byType,
      byLevel,
    ] = await Promise.all([
      Escalation.countDocuments({ status: 'ACTIVE' }),
      Escalation.countDocuments({ status: 'RESOLVED' }),
      Escalation.countDocuments({ status: 'DISMISSED' }),
      Escalation.aggregate([
        { $match: { status: 'ACTIVE' } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Escalation.aggregate([
        { $match: { status: 'ACTIVE' } },
        { $group: { _id: '$level', count: { $sum: 1 } } },
      ]),
    ]);

    // Convert aggregation arrays to plain objects { TYPE: count }
    const byTypeMap = Object.fromEntries(byType.map(r => [r._id, r.count]));
    const byLevelMap = Object.fromEntries(byLevel.map(r => [r._id, r.count]));

    return NextResponse.json({
      active,
      resolved,
      dismissed,
      byType: {
        GOAL_SUBMISSION: byTypeMap.GOAL_SUBMISSION || 0,
        GOAL_APPROVAL:   byTypeMap.GOAL_APPROVAL   || 0,
        CHECKIN_PENDING: byTypeMap.CHECKIN_PENDING  || 0,
      },
      byLevel: {
        LEVEL_1: byLevelMap.LEVEL_1 || 0,
        LEVEL_2: byLevelMap.LEVEL_2 || 0,
        LEVEL_3: byLevelMap.LEVEL_3 || 0,
      },
    });
  } catch (error) {
    return handleApiError(error, 'admin/escalations/stats GET');
  }
}
