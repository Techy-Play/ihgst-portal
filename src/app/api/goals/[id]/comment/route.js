import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';
import Notification from '@/models/Notification';
import { handleApiError, parseBody } from '@/lib/apiError';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['Manager', 'Admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Only managers can comment on goals.' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const { data: body, error: parseErr } = await parseBody(request);
    if (parseErr) return parseErr;

    if (!body.text?.trim()) {
      return NextResponse.json({ error: 'Comment text is required.' }, { status: 400 });
    }

    const goal = await Goal.findById(id);
    if (!goal) return NextResponse.json({ error: 'Goal not found.' }, { status: 404 });

    const comment = {
      text: body.text.trim(),
      by: session.user.id,
      byName: session.user.name,
      createdAt: new Date(),
    };

    if (!goal.managerComments) goal.managerComments = [];
    goal.managerComments.push(comment);
    await goal.save();

    // Notify the employee
    await Notification.create({
      userId: goal.userId,
      type: 'manager_comment',
      title: 'Manager Feedback',
      message: `${session.user.name} commented on your goal "${goal.title}": "${body.text.trim().substring(0, 80)}${body.text.trim().length > 80 ? '...' : ''}"`,
      link: `/goals/${goal._id}`,
    });

    return NextResponse.json({ message: 'Comment added.', comment });
  } catch (error) {
    return handleApiError(error, 'goals/[id]/comment POST');
  }
}
