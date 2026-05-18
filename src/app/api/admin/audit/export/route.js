import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import AuditLog from '@/models/AuditLog';
import LoginLog from '@/models/LoginLog';
import ExportLog from '@/models/ExportLog';
import { sendEmail } from '@/lib/mailer';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, format = 'csv', dateFrom, dateTo } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    await dbConnect();

    const dateQuery = {};
    if (dateFrom || dateTo) {
      dateQuery.createdAt = {};
      if (dateFrom) { const s = new Date(dateFrom); s.setHours(0,0,0,0); dateQuery.createdAt.$gte = s; }
      if (dateTo)   { const e = new Date(dateTo);   e.setHours(23,59,59,999); dateQuery.createdAt.$lte = e; }
    }

    const [auditLogs, loginLogs] = await Promise.all([
      AuditLog.find(dateQuery).sort({ createdAt: -1 }).lean(),
      LoginLog.find(dateQuery).sort({ createdAt: -1 }).lean(),
    ]);

    // Normalise login rows
    const normalisedLogins = loginLogs.map(l => ({
      _id: l._id,
      entityType: 'Authentication',
      action: 'login',
      changedByName: l.userName,
      description: `${l.userName} (${l.role}) signed in`,
      ip: l.ip || '',
      browser: l.browser || '',
      device: l.device || '',
      createdAt: l.createdAt,
    }));

    const merged = [...auditLogs, ...normalisedLogins].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const rows = merged.map(l => ({
      Timestamp: new Date(l.createdAt).toLocaleString('en-IN'),
      Action: l.action,
      Module: l.entityType,
      Description: l.description || '',
      'Performed By': l.changedByName || 'System',
      'IP Address': l.ip || '',
      Browser: l.browser || '',
      'Device / OS': l.device || '',
    }));

    let buffer, filename, contentType;

    if (format === 'excel') {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');
      buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      filename = 'audit_log_export.xlsx';
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      const headers = Object.keys(rows[0] || {});
      const csvLines = [
        headers.map(h => `"${h}"`).join(','),
        ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
      ];
      buffer = Buffer.from(csvLines.join('\n'), 'utf-8');
      filename = 'audit_log_export.csv';
      contentType = 'text/csv';
    }

    const rangeLabel = dateFrom || dateTo
      ? `${dateFrom || 'beginning'} → ${dateTo || 'now'}`
      : 'all time';

    await sendEmail({
      to: email,
      subject: 'IHGST Portal — Audit Log Export',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#6366f1;">IHGST Portal — Audit Log</h2>
          <p>Hi,</p>
          <p>Attached is your audit log export (${format === 'excel' ? 'Excel' : 'CSV'}) from the IHGST Portal.</p>
          <p style="color:#888;">This report contains <strong>${rows.length} entries</strong> for the period: <strong>${rangeLabel}</strong>.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
          <p style="font-size:12px;color:#999;">Exported by ${session.user.name} (${session.user.email}) on ${new Date().toLocaleString()}</p>
        </div>
      `,
      attachments: [{ filename, content: buffer, contentType }],
    });

    await ExportLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      format,
      scope: 'organization',
      recipientEmail: email,
      recordCount: rows.length,
      cycleName: `Audit Log (${rangeLabel})`,
      description: `Audit log ${format.toUpperCase()} (${rows.length} records, ${rangeLabel}) exported to ${email}`,
    });

    await AuditLog.create({
      entityType: 'AuditLog',
      entityId: session.user.id,
      action: 'report_exported',
      changedBy: session.user.id,
      changedByName: session.user.name,
      description: `Audit log ${format.toUpperCase()} (${rows.length} records) exported to ${email}`,
    });

    return NextResponse.json({ message: `Audit log sent successfully to ${email}` });
  } catch (error) {
    console.error('Audit export error:', error);
    const msg = error.message?.includes('SMTP') ? error.message : 'Failed to send email. Check SMTP configuration.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
