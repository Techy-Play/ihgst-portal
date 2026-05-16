import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';
import GoalSheet from '@/models/GoalSheet';
import User from '@/models/User';
import Cycle from '@/models/Cycle';
import CheckIn from '@/models/CheckIn';
import mongoose from 'mongoose';
import { calculateProgress } from '@/lib/progress';

// Build rich incomplete goals details
async function buildIncompleteGoals(goals) {
  const incomplete = goals.filter(g => !['Approved', 'Locked'].includes(g.status));
  const goalIds = incomplete.map(g => g._id);
  const checkins = await CheckIn.find({ goalId: { $in: goalIds } }).lean();
  return incomplete.map(g => {
    const gCheckins = checkins.filter(c => c.goalId.toString() === g._id.toString());
    const latestAch = g.achievements?.length > 0 ? g.achievements[g.achievements.length - 1] : null;
    const progress = latestAch ? calculateProgress(g, latestAch.value) : 0;
    return {
      _id: g._id,
      title: g.title,
      description: g.description,
      thrustArea: g.thrustArea,
      uom: g.uom,
      target: g.target,
      weightage: g.weightage,
      status: g.status,
      isShared: g.isShared || false,
      progress: Math.round(progress),
      employee: g.userId?.name || g.userId?.toString() || 'Unknown',
      department: g.userId?.department || '',
      achievements: g.achievements || [],
      checkins: gCheckins.map(c => ({ quarter: c.quarter, achievement: c.achievement, status: c.status, employeeComment: c.employeeComment, managerComment: c.managerComment, date: c.createdAt })),
    };
  });
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const role = session.user.role;
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    let cycleId = searchParams.get('cycleId');
    if (!cycleId) {
      const activeCycle = await Cycle.findOne({ isActive: true }).lean();
      if (activeCycle) cycleId = activeCycle._id.toString();
    }

    // Convert string to ObjectId for proper MongoDB matching
    const cycleObjectId = cycleId && mongoose.Types.ObjectId.isValid(cycleId) ? new mongoose.Types.ObjectId(cycleId) : null;
    const query = cycleObjectId ? { cycleId: cycleObjectId } : {};
    const sheetQuery = cycleObjectId ? { cycleId: cycleObjectId } : {};

    const reqScope = searchParams.get('scope');

    // ─── Employee: personal analytics only ───
    if (role === 'Employee' || (role === 'Manager' && reqScope === 'personal')) {
      const goals = await Goal.find({ userId, ...query }).lean();
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

      // Target vs Actual per goal
      const targetVsActual = goals.slice(0, 8).map(g => {
        const latestAch = g.achievements?.length > 0 ? g.achievements[g.achievements.length - 1] : null;
        return {
          name: g.title.length > 20 ? g.title.substring(0, 18) + '...' : g.title,
          target: typeof g.target === 'number' ? g.target : 100,
          actual: latestAch ? (typeof latestAch.value === 'number' ? latestAch.value : 0) : 0,
        };
      });

      const incompleteGoals = await buildIncompleteGoals(goals);

      return NextResponse.json({
        scope: 'personal',
        statusDistribution: Object.entries(statusDist).map(([name, value]) => ({ name, value })),
        thrustAreaDistribution: Object.entries(thrustDist).map(([name, value]) => ({ name, value })),
        quarterProgress,
        targetVsActual,
        totalGoals: goals.length,
        approvedGoals,
        totalWeightage,
        completionByDept: [],
        totalEmployees: 1,
        incompleteGoals,
        incompleteCount: incompleteGoals.length,
      });
    }

    // ─── Manager: team analytics ───
    if (role === 'Manager') {
      const teamMembers = await User.find({ managerId: userId }).lean();
      const teamIds = teamMembers.map(u => u._id);
      // Include manager's own goals too
      teamIds.push(userId);

      const goals = await Goal.find({ userId: { $in: teamIds }, ...query }).populate('userId', 'name department').lean();
      const goalSheets = await GoalSheet.find({ userId: { $in: teamIds }, ...sheetQuery }).lean();

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

      const targetVsActual = goals.slice(0, 8).map(g => {
        const latestAch = g.achievements?.length > 0 ? g.achievements[g.achievements.length - 1] : null;
        return {
          name: (g.title || '').length > 20 ? g.title.substring(0, 18) + '...' : g.title,
          target: typeof g.target === 'number' ? g.target : 100,
          actual: latestAch ? (typeof latestAch.value === 'number' ? latestAch.value : 0) : 0,
        };
      });

      const incompleteGoals = await buildIncompleteGoals(goals);

      return NextResponse.json({
        scope: 'team',
        statusDistribution: Object.entries(statusDist).map(([name, value]) => ({ name, value })),
        thrustAreaDistribution: Object.entries(thrustDist).map(([name, value]) => ({ name, value })),
        quarterProgress,
        targetVsActual,
        completionByDept: memberCompletion,
        totalGoals: goals.length,
        totalEmployees: teamMembers.length,
        incompleteGoals,
        incompleteCount: incompleteGoals.length,
      });
    }

    // ─── Admin/HR: organization-wide analytics ───
    const goals = await Goal.find(query).populate('userId', 'name department').lean();
    const goalSheets = await GoalSheet.find(sheetQuery).lean();
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

    const targetVsActual = goals.slice(0, 8).map(g => {
      const latestAch = g.achievements?.length > 0 ? g.achievements[g.achievements.length - 1] : null;
      return {
        name: (g.title || '').length > 20 ? g.title.substring(0, 18) + '...' : g.title,
        target: typeof g.target === 'number' ? g.target : 100,
        actual: latestAch ? (typeof latestAch.value === 'number' ? latestAch.value : 0) : 0,
      };
    });

    const incompleteGoals = await buildIncompleteGoals(goals);

    return NextResponse.json({
      scope: 'organization',
      statusDistribution: Object.entries(statusDist).map(([name, value]) => ({ name, value })),
      thrustAreaDistribution: Object.entries(thrustDist).map(([name, value]) => ({ name, value })),
      quarterProgress,
      targetVsActual,
      completionByDept: Object.entries(completionByDept).map(([dept, { total, completed }]) => ({ department: dept, total, completed, rate: Math.round((completed / total) * 100) })),
      totalGoals: goals.length,
      totalEmployees: users.length,
      incompleteGoals,
      incompleteCount: incompleteGoals.length,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
