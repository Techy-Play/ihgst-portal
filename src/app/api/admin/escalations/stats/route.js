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

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const [
      active,
      resolved,
      dismissed,
      resolvedToday,
      byType,
      byLevel,
      byDepartment,
      byQuarter,
      recentTrend,
    ] = await Promise.all([
      Escalation.countDocuments({ status: 'ACTIVE' }),
      Escalation.countDocuments({ status: 'RESOLVED' }),
      Escalation.countDocuments({ status: 'DISMISSED' }),
      Escalation.countDocuments({ status: 'RESOLVED', resolvedAt: { $gte: todayStart } }),
      Escalation.aggregate([
        { $match: { status: 'ACTIVE' } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Escalation.aggregate([
        { $match: { status: 'ACTIVE' } },
        { $group: { _id: '$level', count: { $sum: 1 } } },
      ]),
      // Department breakdown (active only)
      Escalation.aggregate([
        { $match: { status: 'ACTIVE' } },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$user.department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      // Quarter breakdown (active only)
      Escalation.aggregate([
        { $match: { status: 'ACTIVE', quarter: { $exists: true, $ne: null } } },
        { $group: { _id: '$quarter', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      // 7-day trend (created per day)
      Escalation.aggregate([
        { $match: { triggeredAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$triggeredAt' } },
          created: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
        }},
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Convert aggregation arrays to plain objects
    const byTypeMap = Object.fromEntries(byType.map(r => [r._id, r.count]));
    const byLevelMap = Object.fromEntries(byLevel.map(r => [r._id, r.count]));
    const byDeptMap = byDepartment.map(r => ({ department: r._id || 'Unassigned', count: r.count }));
    const byQuarterMap = Object.fromEntries(byQuarter.map(r => [r._id, r.count]));

    // Compliance: % of total that are resolved out of all non-dismissed
    const totalNonDismissed = active + resolved;
    const complianceRate = totalNonDismissed > 0 ? Math.round((resolved / totalNonDismissed) * 100) : 100;

    return NextResponse.json({
      active,
      resolved,
      dismissed,
      resolvedToday,
      complianceRate,
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
      byDepartment: byDeptMap,
      byQuarter: byQuarterMap,
      trend: recentTrend,
    });
  } catch (error) {
    return handleApiError(error, 'admin/escalations/stats GET');
  }
}
