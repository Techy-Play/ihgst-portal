import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import ExportLog from '@/models/ExportLog';
import { handleApiError, parseBody } from '@/lib/apiError';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const logs = await ExportLog.find().sort({ createdAt: -1 }).limit(50).lean();
    return NextResponse.json({ logs });
  } catch (error) {
    return handleApiError(error, 'export-logs route.js');
  }
}
