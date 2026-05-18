import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import AuditLog from '@/models/AuditLog';
import LoginLog from '@/models/LoginLog';
import { handleApiError } from '@/lib/apiError';

// Which AuditLog entityType belongs to which module
const MODULE_MAP = {
  Goals: ['Goal', 'GoalSheet'],
  'Check-ins': ['CheckIn', 'Checkin'],
  Users: ['User'],
  Cycles: ['Cycle'],
  Authentication: ['User'],
  KPI: ['KPI', 'SharedGoal'],
  Reports: ['Report', 'AuditLog'],
};

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const limit    = Math.min(parseInt(searchParams.get('limit')) || 50, 500);
    const page     = Math.max(parseInt(searchParams.get('page')) || 1, 1);
    const skip     = (page - 1) * limit;
    const action   = searchParams.get('action') || '';
    const user     = searchParams.get('user') || '';
    const role     = searchParams.get('role') || '';
    const module   = searchParams.get('module') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo   = searchParams.get('dateTo') || '';
    const preset   = searchParams.get('preset') || '';

    // Resolve date boundaries
    let from = null, to = null;
    if (preset === 'today') {
      from = new Date(); from.setHours(0, 0, 0, 0);
      to   = new Date(); to.setHours(23, 59, 59, 999);
    } else if (preset === '7d') {
      from = new Date(Date.now() - 7 * 86400000);
    } else if (preset === '30d') {
      from = new Date(Date.now() - 30 * 86400000);
    } else {
      if (dateFrom) { from = new Date(dateFrom); from.setHours(0, 0, 0, 0); }
      if (dateTo)   { to   = new Date(dateTo);   to.setHours(23, 59, 59, 999); }
    }

    // Build AuditLog query
    const auditQuery = {};
    if (action && action !== 'all') auditQuery.action = action;
    if (user)   auditQuery.changedByName = { $regex: user, $options: 'i' };
    if (module && module !== 'all' && MODULE_MAP[module]) auditQuery.entityType = { $in: MODULE_MAP[module] };
    if (from || to) {
      auditQuery.createdAt = {};
      if (from) auditQuery.createdAt.$gte = from;
      if (to)   auditQuery.createdAt.$lte = to;
    }

    // Build LoginLog query
    const loginQuery = {};
    if (role && role !== 'all')   loginQuery.role = role;
    if (user)   loginQuery.userName = { $regex: user, $options: 'i' };
    if (from || to) {
      loginQuery.createdAt = {};
      if (from) loginQuery.createdAt.$gte = from;
      if (to)   loginQuery.createdAt.$lte = to;
    }

    // Skip login logs when filtering to a non-auth module, or non-login action
    const skipLogins = (module && module !== 'all' && module !== 'Authentication') ||
                       (action && action !== 'all' && action !== 'login');

    const [auditLogs, loginLogs] = await Promise.all([
      AuditLog.find(auditQuery).sort({ createdAt: -1 }).limit(limit * 3).lean(),
      skipLogins ? Promise.resolve([]) :
        LoginLog.find(loginQuery).sort({ createdAt: -1 }).limit(limit * 3).lean(),
    ]);

    // Normalise LoginLog rows into unified shape — include both success and failed
    const normalisedLogins = loginLogs.map(l => ({
      _id: l._id,
      entityType: l.status === 'failed' ? 'Authentication' : 'Authentication',
      action: l.status === 'failed' ? 'login_failed' : 'login',
      changedByName: l.userName,
      changedByRole: l.role,
      description: l.status === 'failed'
        ? `⚠️ Failed login attempt for ${l.userEmail}`
        : `${l.userName} (${l.role}) signed in`,
      ip: l.ip || '',
      browser: l.browser || '',
      device: l.device || '',
      os: l.os || '',
      createdAt: l.createdAt,
      _source: 'login',
      _status: l.status || 'success',
    }));

    // Merge + sort descending
    let merged = [...auditLogs.map(l => ({ ...l, _source: 'audit' })), ...normalisedLogins]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Role filter
    if (role && role !== 'all') {
      merged = merged.filter(l => l._source === 'login' ? l.changedByRole === role : true);
    }

    const total = merged.length;
    const paginated = merged.slice(skip, skip + limit);

    const oldest = await AuditLog.findOne().sort({ createdAt: 1 }).select('createdAt').lean();
    const userNames = await AuditLog.distinct('changedByName');

    return NextResponse.json({
      logs: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      oldestDate: oldest?.createdAt || null,
      userNames: userNames.filter(Boolean).sort(),
    });
  } catch (error) { return handleApiError(error, 'audit route.js'); }
}
