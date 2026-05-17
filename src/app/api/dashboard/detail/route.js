import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Goal from '@/models/Goal';
import GoalSheet from '@/models/GoalSheet';
import Cycle from '@/models/Cycle';
import { handleApiError } from '@/lib/apiError';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'total'; // total | approved | pending
    const role = session.user.role;
    const userId = session.user.id;

    const activeCycle = await Cycle.findOne({ isActive: true }).lean();
    if (!activeCycle) return NextResponse.json({ employees: [], type });

    // Determine which users to include based on role
    let userFilter = {};
    if (role === 'Employee') {
      userFilter = { _id: userId };
    } else if (role === 'Manager') {
      userFilter = { $or: [{ _id: userId }, { managerId: userId }] };
    }
    // Admin: no filter (all users)

    const users = await User.find(userFilter).select('name email department role').lean();
    const userIds = users.map(u => u._id);

    // Get goal sheets for these users in the active cycle
    const sheets = await GoalSheet.find({ cycleId: activeCycle._id, userId: { $in: userIds } }).lean();
    const sheetMap = {};
    sheets.forEach(s => { sheetMap[s.userId.toString()] = s; });

    // Get goals
    let goalFilter = { cycleId: activeCycle._id, userId: { $in: userIds } };
    if (type === 'approved') goalFilter.status = 'Approved';
    else if (type === 'pending') goalFilter.status = { $in: ['Draft', 'Submitted', 'Returned'] };

    const goals = await Goal.find(goalFilter).select('userId title status weightage thrustArea target uom achievements').lean();

    // Group by user
    const userGoalMap = {};
    goals.forEach(g => {
      const uid = g.userId.toString();
      if (!userGoalMap[uid]) userGoalMap[uid] = [];
      userGoalMap[uid].push(g);
    });

    const employees = users
      .map(u => {
        const uid = u._id.toString();
        const userGoals = userGoalMap[uid] || [];
        const sheet = sheetMap[uid];
        if (type !== 'total' && userGoals.length === 0) return null; // Skip users with no matching goals
        return {
          _id: uid,
          name: u.name,
          email: u.email,
          department: u.department,
          role: u.role,
          sheetStatus: sheet?.status || 'No Sheet',
          goalCount: userGoals.length,
          goals: userGoals.map(g => ({
            _id: g._id,
            title: g.title,
            status: g.status,
            weightage: g.weightage,
            thrustArea: g.thrustArea,
            target: g.target,
            uom: g.uom,
            progress: calculateGoalProgress(g),
          })),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.goalCount - a.goalCount);

    return NextResponse.json({ employees, type, cycleName: activeCycle.name });
  } catch (error) {
    return handleApiError(error, 'dashboard/detail GET');
  }
}

function calculateGoalProgress(goal) {
  if (!goal.achievements?.length) return 0;
  // Find latest non-null achievement
  for (let i = goal.achievements.length - 1; i >= 0; i--) {
    const ach = goal.achievements[i];
    if (ach.value !== null && ach.value !== undefined) {
      if (goal.uom === 'Timeline') {
        const targetDate = new Date(goal.target).getTime();
        const achievedDate = new Date(ach.value).getTime();
        return achievedDate <= targetDate ? 100 : 50;
      }
      const target = Number(goal.target);
      if (!target) return 0;
      if (goal.uomDirection === 'Max') {
        return Math.min(100, Math.round((target / Number(ach.value)) * 100));
      }
      return Math.min(100, Math.round((Number(ach.value) / target) * 100));
    }
  }
  return 0;
}
