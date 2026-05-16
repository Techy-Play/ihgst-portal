import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import AuditLog from '@/models/AuditLog';
import { handleApiError, parseBody } from '@/lib/apiError';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(limit).lean();
    return NextResponse.json({ logs });
  } catch (error) { return handleApiError(error, 'audit route.js'); }
}
