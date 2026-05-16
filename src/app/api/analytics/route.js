import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';
import GoalSheet from '@/models/GoalSheet';
import User from '@/models/User';
import { calculateProgress } from '@/lib/progress';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const role = session.user.role;
    const userId = session.user.id;

    // ─── Employee: personal analytics only ───
    if (role === 'Employee') {
      const goals = await Goal.find({ userId }).lean();
      const statusDist = {};
      goals.forEach(g => { statusDist[g.status] = (statusDist[g.status] || 0) + 1; });
      const thrustDist = {};
      goals.forEach(g => { thrustDist[g.thrustArea] = (thrustDist[g.thrustArea] || 0) + 1; });

      const quarterProgress = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
        let total = 0, count = 0;
        goals.forEach(g => {
          const ach = g.achievements?.find(a => a.quarter === q);
          if (ach && ach.value !== undefined) { total += calculateProgress(g, ach.value); count++; }
        });
        return { quarter: q, avgProgress: count > 0 ? Math.round(total / count) : 0, count };
      });

      const totalWeightage = goals.reduce((s, g) => s + (g.weightage || 0), 0);
      const approvedGoals = goals.filter(g => g.status === 'Approved').length;

      return NextResponse.json({
        scope: 'personal',
        statusDistribution: Object.entries(statusDist).map(([name, value]) => ({ name, value })),
        thrustAreaDistribution: Object.entries(thrustDist).map(([name, value]) => ({ name, value })),
        quarterProgress,
        totalGoals: goals.length,
        approvedGoals,
        totalWeightage,
        completionByDept: [],
        totalEmployees: 1,
      });
    }

    // ─── Manager: team analytics ───
    if (role === 'Manager') {
      const teamMembers = await User.find({ managerId: userId }).lean();
      const teamIds = teamMembers.map(u => u._id);
      // Include manager's own goals too
      teamIds.push(userId);

      const goals = await Goal.find({ userId: { $in: teamIds } }).populate('userId', 'name department').lean();
      const goalSheets = await GoalSheet.find({ userId: { $in: teamIds } }).lean();

      const statusDist = {};
      goals.forEach(g => { statusDist[g.status] = (statusDist[g.status] || 0) + 1; });
      const thrustDist = {};
      goals.forEach(g => { thrustDist[g.thrustArea] = (thrustDist[g.thrustArea] || 0) + 1; });

      const quarterProgress = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
        let total = 0, count = 0;
        goals.forEach(g => {
          const ach = g.achievements?.find(a => a.quarter === q);
          if (ach && ach.value !== undefined) { total += calculateProgress(g, ach.value); count++; }
        });
        return { quarter: q, avgProgress: count > 0 ? Math.round(total / count) : 0, count };
      });

      // Per-member completion
      const memberCompletion = teamMembers.map(u => {
        const sheet = goalSheets.find(gs => gs.userId.toString() === u._id.toString());
        const memberGoals = goals.filter(g => g.userId?._id?.toString() === u._id.toString() || g.userId?.toString() === u._id.toString());
        return {
          department: u.name,
          total: memberGoals.length,
          completed: sheet && ['Approved', 'Locked'].includes(sheet.status) ? 1 : 0,
          rate: sheet && ['Approved', 'Locked'].includes(sheet.status) ? 100 : 0,
        };
      });

      return NextResponse.json({
        scope: 'team',
        statusDistribution: Object.entries(statusDist).map(([name, value]) => ({ name, value })),
        thrustAreaDistribution: Object.entries(thrustDist).map(([name, value]) => ({ name, value })),
        quarterProgress,
        completionByDept: memberCompletion,
        totalGoals: goals.length,
        totalEmployees: teamMembers.length,
      });
    }

    // ─── Admin/HR: organization-wide analytics ───
    const goals = await Goal.find().populate('userId', 'name department').lean();
    const goalSheets = await GoalSheet.find().lean();
    const users = await User.find({ role: { $ne: 'Admin' } }).lean();

    const statusDist = {};
    goals.forEach(g => { statusDist[g.status] = (statusDist[g.status] || 0) + 1; });
    const thrustDist = {};
    goals.forEach(g => { thrustDist[g.thrustArea] = (thrustDist[g.thrustArea] || 0) + 1; });

    const quarterProgress = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
      let total = 0, count = 0;
      goals.forEach(g => {
        const ach = g.achievements?.find(a => a.quarter === q);
        if (ach && ach.value !== undefined) { total += calculateProgress(g, ach.value); count++; }
      });
      return { quarter: q, avgProgress: count > 0 ? Math.round(total / count) : 0, count };
    });

    const completionByDept = {};
    users.forEach(u => {
      const dept = u.department || 'Unknown';
      if (!completionByDept[dept]) completionByDept[dept] = { total: 0, completed: 0 };
      completionByDept[dept].total++;
      const sheet = goalSheets.find(gs => gs.userId.toString() === u._id.toString());
      if (sheet && ['Approved', 'Locked'].includes(sheet.status)) completionByDept[dept].completed++;
    });

    return NextResponse.json({
      scope: 'organization',
      statusDistribution: Object.entries(statusDist).map(([name, value]) => ({ name, value })),
      thrustAreaDistribution: Object.entries(thrustDist).map(([name, value]) => ({ name, value })),
      quarterProgress,
      completionByDept: Object.entries(completionByDept).map(([dept, { total, completed }]) => ({ department: dept, total, completed, rate: Math.round((completed / total) * 100) })),
      totalGoals: goals.length,
      totalEmployees: users.length,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
