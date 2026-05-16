import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const users = await User.find().select('-password').populate('managerId', 'name email').sort({ createdAt: -1 }).lean();
    return NextResponse.json({ users });
  } catch (error) { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const { name, email, role, department, managerId, employeeId } = await request.json();

    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    if (!role || !['Employee', 'Manager', 'Admin'].includes(role)) return NextResponse.json({ error: 'Valid role is required' }, { status: 400 });
    if (!department?.trim()) return NextResponse.json({ error: 'Department is required' }, { status: 400 });
    if (!employeeId?.trim()) return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });

    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { employeeId }] });
    if (existing) return NextResponse.json({ error: existing.email === email.toLowerCase() ? 'Email already in use' : 'Employee ID already in use' }, { status: 400 });

    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      department: department.trim(),
      managerId: managerId || undefined,
      employeeId: employeeId.trim(),
    });

    await AuditLog.create({
      entityType: 'User',
      entityId: user._id,
      action: 'created',
      changedBy: session.user.id,
      changedByName: session.user.name,
      description: `User "${name}" (${role}) created with email ${email}`,
    });

    try {
      const { sendEmail } = await import('@/lib/mailer');
      const loginUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      await sendEmail({
        to: email,
        subject: 'Welcome to IHGST Portal - Your Account Details',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to IHGST Portal</h2>
            <p>Hello ${name},</p>
            <p>Your account has been successfully created. Here are your login details:</p>
            <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0;"><strong>Temporary Password:</strong> Password123!</p>
            </div>
            <p style="color: #eab308; font-weight: bold;">⚠️ IMPORTANT: You must change this temporary password immediately after your first login.</p>
            <a href="${loginUrl}/login" style="display: inline-block; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">Login to Portal</a>
          </div>
        `
      });
    } catch (mailErr) {
      console.error('Failed to send welcome email:', mailErr);
    }

    const created = await User.findById(user._id).select('-password').populate('managerId', 'name email').lean();
    return NextResponse.json({ user: created, message: 'User created successfully. Welcome email sent.' }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const { userId, name, role, department, managerId, employeeId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const changes = {};
    if (name && name !== user.name) { changes.name = { old: user.name, new: name }; user.name = name; }
    if (role && role !== user.role) { changes.role = { old: user.role, new: role }; user.role = role; }
    if (department && department !== user.department) { changes.department = { old: user.department, new: department }; user.department = department; }
    if (employeeId && employeeId !== user.employeeId) { changes.employeeId = { old: user.employeeId, new: employeeId }; user.employeeId = employeeId; }
    if (managerId !== undefined) {
      const oldMgr = user.managerId?.toString() || null;
      const newMgr = managerId || null;
      if (oldMgr !== newMgr) { changes.managerId = { old: oldMgr, new: newMgr }; user.managerId = newMgr; }
    }

    await user.save();

    if (Object.keys(changes).length > 0) {
      await AuditLog.create({
        entityType: 'User',
        entityId: user._id,
        action: 'updated',
        changedBy: session.user.id,
        changedByName: session.user.name,
        changes,
        description: `User "${user.name}" updated: ${Object.keys(changes).join(', ')}`,
      });
    }

    const updated = await User.findById(userId).select('-password').populate('managerId', 'name email').lean();
    return NextResponse.json({ user: updated, message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
