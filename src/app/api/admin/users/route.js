import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const users = await User.find().select('-password').populate('managerId', 'name email').sort({ createdAt: -1 }).lean();
    return NextResponse.json({ users });
  } catch (error) { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}
