import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Escalation from '@/models/Escalation';
import ExportLog from '@/models/ExportLog';
import AuditLog from '@/models/AuditLog';
import { sendEmail } from '@/lib/mailer';

const TYPE_LABELS = {
  GOAL_SUBMISSION: 'Draft Not Submitted',
  GOAL_APPROVAL: 'Approval Pending',
  CHECKIN_PENDING: 'Check-in Missing',
};
const LEVEL_LABELS = { LEVEL_1: 'L1 — Employee', LEVEL_2: 'L2 — Manager', LEVEL_3: 'L3 — Admin' };
const STATUS_LABELS = { ACTIVE: 'Active', RESOLVED: 'Resolved', DISMISSED: 'Dismissed' };

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, format } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    await dbConnect();
    const escalations = await Escalation.find()
      .sort({ triggeredAt: -1 })
      .populate('userId', 'name email department')
      .populate('cycleId', 'name')
      .lean();

    const rows = escalations.map(e => ({
      Employee: e.userId?.name || 'Unknown',
      Email: e.userId?.email || '',
      Department: e.userId?.department || '',
      Type: TYPE_LABELS[e.type] || e.type,
      Level: LEVEL_LABELS[e.level] || e.level,
      Status: STATUS_LABELS[e.status] || e.status,
      Message: e.message || '',
      Quarter: e.quarter || '',
      Cycle: e.cycleId?.name || '',
      'Triggered At': new Date(e.triggeredAt).toLocaleString('en-IN'),
      'Resolved At': e.resolvedAt ? new Date(e.resolvedAt).toLocaleString('en-IN') : '',
    }));

    let buffer, filename, contentType;

    if (format === 'excel') {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Escalations');
      buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      filename = 'escalations_report.xlsx';
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      const headers = Object.keys(rows[0] || {});
      const csvLines = [
        headers.map(h => `"${h}"`).join(','),
        ...rows.map(r => headers.map(h => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))
      ];
      buffer = Buffer.from(csvLines.join('\n'), 'utf-8');
      filename = 'escalations_report.csv';
      contentType = 'text/csv';
    }

    const activeCount = escalations.filter(e => e.status === 'ACTIVE').length;

    await sendEmail({
      to: email,
      subject: 'IHGST Portal — Escalations Report',
      html: `
        <h2 style="color:#6366f1;">IHGST Portal — Escalations Report</h2>
        <p>Hi,</p>
        <p>Please find the attached escalations report (${format === 'excel' ? 'Excel' : 'CSV'} format) exported from the IHGST Portal.</p>
        <p style="color:#64748b;">This report contains <strong>${rows.length}</strong> escalation records (<strong>${activeCount}</strong> active).</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
        <p style="font-size:12px;color:#94a3b8;">Exported by ${session.user.name} (${session.user.email}) on ${new Date().toLocaleString()}</p>
      `,
      attachments: [{ filename, content: buffer, contentType }],
    });

    await ExportLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      format,
      scope: 'escalations',
      recipientEmail: email,
      recordCount: rows.length,
      description: `Escalations ${format.toUpperCase()} report (${rows.length} records) exported to ${email}`,
    });

    await AuditLog.create({
      entityType: 'Report',
      entityId: session.user.id,
      action: 'report_exported',
      changedBy: session.user.id,
      changedByName: session.user.name,
      description: `Escalations ${format.toUpperCase()} report (${rows.length} records) exported to ${email}`,
    });

    return NextResponse.json({ message: `Escalations report sent to ${email}` });
  } catch (error) {
    console.error('Escalation email export error:', error);
    const msg = error.message?.includes('SMTP') ? error.message : 'Failed to send email. Check SMTP configuration.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
