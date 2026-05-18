import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { runEscalationEngine } from '@/app/api/cron/escalations/route';
import { handleApiError } from '@/lib/apiError';

// POST — manually trigger the escalation engine (Admin only, no CRON_SECRET needed)
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await runEscalationEngine({
      triggeredBy: 'admin',
      triggeredByName: session.user.name || 'Admin',
    });

    return NextResponse.json({
      success: true,
      message: `Escalation engine completed: ${results.created} created, ${results.resolved} resolved`,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error, 'admin/escalations/trigger POST');
  }
}
