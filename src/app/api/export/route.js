import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';
import User from '@/models/User';
import Cycle from '@/models/Cycle';
import ExportLog from '@/models/ExportLog';
import AuditLog from '@/models/AuditLog';
import { sendEmail } from '@/lib/mailer';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const { email, format } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    const role = session.user.role;
    const userId = session.user.id;
    let goals, scope;

    const activeCycle = await Cycle.findOne({ isActive: true }).lean();
    const query = activeCycle ? { cycleId: activeCycle._id } : {};

    if (role === 'Admin') {
      goals = await Goal.find(query).populate('userId', 'name department').lean();
      scope = 'organization';
    } else if (role === 'Manager') {
      const teamMembers = await User.find({ managerId: userId }).select('_id').lean();
      const teamIds = [...teamMembers.map(m => m._id), userId];
      goals = await Goal.find({ userId: { $in: teamIds }, ...query }).populate('userId', 'name department').lean();
      scope = 'team';
    } else {
      goals = await Goal.find({ userId, ...query }).populate('userId', 'name department').lean();
      scope = 'personal';
    }

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
    const scopeLabel = scope === 'personal' ? 'personal' : scope === 'team' ? 'team' : 'organization';

    if (format === 'excel') {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Goals Report');
      buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      filename = `${scopeLabel}_goals_report.xlsx`;
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      const headers = Object.keys(rows[0] || {});
      const csvLines = [
        headers.map(h => `"${h}"`).join(','),
        ...rows.map(r => headers.map(h => `"${r[h]}"`).join(','))
      ];
      buffer = Buffer.from(csvLines.join('\n'), 'utf-8');
      filename = `${scopeLabel}_goals_report.csv`;
      contentType = 'text/csv';
    }

    await sendEmail({
      to: email,
      subject: `IHGST Portal — ${scope.charAt(0).toUpperCase() + scope.slice(1)} Goals Report`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#6366f1;">IHGST Portal — Goals Report</h2>
          <p>Hi,</p>
          <p>Please find the attached ${scopeLabel} goals report (${format === 'excel' ? 'Excel' : 'CSV'} format).</p>
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
      scope,
      recipientEmail: email,
      recordCount: rows.length,
      description: `${scope} ${format.toUpperCase()} report exported to ${email}`,
    });

    await AuditLog.create({
      entityType: 'Report',
      entityId: session.user.id,
      action: 'report_exported',
      changedBy: session.user.id,
      changedByName: session.user.name,
      description: `${scope} ${format.toUpperCase()} report (${rows.length} records) exported to ${email}`,
    });

    return NextResponse.json({ message: `Report sent successfully to ${email}` });
  } catch (error) {
    console.error('Export error:', error);
    const msg = error.message?.includes('SMTP') ? error.message : 'Failed to send email. Check SMTP configuration.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
