import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import LoginLog from '@/models/LoginLog';
import AuditLog from '@/models/AuditLog';
import { getClientIp, parseUserAgent } from '@/lib/requestInfo';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const ip = getClientIp(request);
    const ua = request.headers.get('user-agent') || '';
    const { browser, os, device } = parseUserAgent(ua);

    // Save to LoginLog collection
    await LoginLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      role: session.user.role,
      department: session.user.department || '',
      ip,
      userAgent: ua,
      browser,
      device: `${device} • ${os}`,
      os,
      status: 'success',
    });

    // Also record in AuditLog for timeline visibility
    await AuditLog.create({
      entityType: 'User',
      entityId: session.user.id,
      action: 'login',
      changedBy: session.user.id,
      changedByName: session.user.name,
      description: `${session.user.name} (${session.user.role}) signed in`,
      ip,
      userAgent: ua,
      browser,
      device: `${device} • ${os}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Login log error:', error);
    return NextResponse.json({ error: 'Failed to log login' }, { status: 500 });
  }
}
