import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';
import ExportLog from '@/models/ExportLog';
import AuditLog from '@/models/AuditLog';
import { sendEmail } from '@/lib/mailer';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, format, cycleId } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    await dbConnect();
    const Cycle = (await import('@/models/Cycle')).default;
    const mongoose = (await import('mongoose')).default;
    let targetCycle;
    if (cycleId && mongoose.Types.ObjectId.isValid(cycleId)) {
      targetCycle = await Cycle.findById(new mongoose.Types.ObjectId(cycleId)).lean();
    }
    if (!targetCycle) targetCycle = await Cycle.findOne({ isActive: true }).lean();
    const cycleName = targetCycle?.name || 'All Cycles';
    const query = targetCycle ? { cycleId: targetCycle._id } : {};
    const goals = await Goal.find(query).populate('userId', 'name department').lean();

    const rows = goals.map(g => ({
      Employee: g.userId?.name || 'Unknown',
      Department: g.userId?.department || '',
      Goal: g.title,
      'Thrust Area': g.thrustArea,
      UoM: g.uom,
      Target: String(g.target),
      'Weightage (%)': g.weightage,
      Status: g.status,
      Q1: g.achievements?.find(a => a.quarter === 'Q1')?.value ?? '',
      Q2: g.achievements?.find(a => a.quarter === 'Q2')?.value ?? '',
      Q3: g.achievements?.find(a => a.quarter === 'Q3')?.value ?? '',
      Q4: g.achievements?.find(a => a.quarter === 'Q4')?.value ?? '',
    }));

    let buffer, filename, contentType;

    if (format === 'excel') {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Goals Report');
      buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      filename = 'goals_report.xlsx';
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      const headers = Object.keys(rows[0] || {});
      const csvLines = [
        headers.map(h => `"${h}"`).join(','),
        ...rows.map(r => headers.map(h => `"${r[h]}"`).join(','))
      ];
      buffer = Buffer.from(csvLines.join('\n'), 'utf-8');
      filename = 'goals_report.csv';
      contentType = 'text/csv';
    }

    await sendEmail({
      to: email,
      subject: 'IHGST Portal — Goals Report Export',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#6366f1;">IHGST Portal — Goals Report</h2>
          <p>Hi,</p>
          <p>Please find the attached goals report (${format === 'excel' ? 'Excel' : 'CSV'} format) exported from the IHGST Portal.</p>
          <p style="color:#888;">This report contains ${rows.length} goal records.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
          <p style="font-size:12px;color:#999;">Exported by ${session.user.name} (${session.user.email}) on ${new Date().toLocaleString()}</p>
        </div>
      `,
      attachments: [{ filename, content: buffer, contentType }],
    });

    // Log the export
    await ExportLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      format,
      scope: 'organization',
      recipientEmail: email,
      recordCount: rows.length,
      cycleName,
      description: `Organization-wide ${format.toUpperCase()} report (${cycleName}) exported to ${email}`,
    });

    await AuditLog.create({
      entityType: 'Report',
      entityId: session.user.id,
      action: 'report_exported',
      changedBy: session.user.id,
      changedByName: session.user.name,
      description: `${format.toUpperCase()} report (${rows.length} records) exported to ${email}`,
    });

    return NextResponse.json({ message: `Report sent successfully to ${email}` });
  } catch (error) {
    console.error('Email export error:', error);
    const msg = error.message?.includes('SMTP') ? error.message : 'Failed to send email. Check SMTP configuration.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
