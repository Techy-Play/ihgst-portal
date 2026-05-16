import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';

import Cycle from '@/models/Cycle';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycleId');
    
    let targetCycle;
    if (cycleId) {
      targetCycle = await Cycle.findById(cycleId).lean();
    }
    if (!targetCycle) {
      targetCycle = await Cycle.findOne({ isActive: true }).lean();
    }
    
    const query = targetCycle ? { cycleId: targetCycle._id } : {};
    const goals = await Goal.find(query).populate('userId', 'name department').lean();
    const data = goals.map(g => ({ employeeName: g.userId?.name || 'Unknown', department: g.userId?.department || '', title: g.title, thrustArea: g.thrustArea, uom: g.uom, target: g.target, weightage: g.weightage, status: g.status, q1: g.achievements?.find(a => a.quarter === 'Q1')?.value || '', q2: g.achievements?.find(a => a.quarter === 'Q2')?.value || '', q3: g.achievements?.find(a => a.quarter === 'Q3')?.value || '', q4: g.achievements?.find(a => a.quarter === 'Q4')?.value || '' }));
    return NextResponse.json({ data });
  } catch (error) { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}
