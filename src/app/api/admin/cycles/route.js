import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Cycle from '@/models/Cycle';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const cycles = await Cycle.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ cycles });
  } catch (error) { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const body = await request.json();
    if (body.isActive) await Cycle.updateMany({}, { $set: { isActive: false } });
    const cycle = await Cycle.create({ ...body, createdBy: session.user.id });
    return NextResponse.json({ cycle, message: 'Cycle created' }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}
