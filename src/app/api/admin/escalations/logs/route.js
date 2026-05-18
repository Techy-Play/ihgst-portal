import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import CronLog from '@/models/CronLog';
import { handleApiError } from '@/lib/apiError';

// GET — last N cron run logs (Admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();

    const logs = await CronLog.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({ logs });
  } catch (error) {
    return handleApiError(error, 'admin/escalations/logs GET');
  }
}
