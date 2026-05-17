import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';
import Discussion from '@/models/Discussion';
import Notification from '@/models/Notification';

// GET — fetch all discussion comments for a goal
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await params;

    const comments = await Discussion.find({ goalId: id }).sort({ createdAt: 1 }).lean();
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Discussion GET error:', error);
    return NextResponse.json({ error: 'Failed to load discussion.' }, { status: 500 });
  }
}

// POST — add a new comment to the discussion
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await params;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    if (!body.text?.trim()) {
      return NextResponse.json({ error: 'Comment text is required.' }, { status: 400 });
    }

    const goal = await Goal.findById(id).select('userId title').lean();
    if (!goal) return NextResponse.json({ error: 'Goal not found.' }, { status: 404 });

    const userRole = session.user.role;
    const isOwner = goal.userId.toString() === session.user.id;

    // Employees can only comment on their own goals
    if (userRole === 'Employee' && !isOwner) {
      return NextResponse.json({ error: 'You can only comment on your own goals.' }, { status: 403 });
    }

    // Create discussion entry in its own collection
    const comment = await Discussion.create({
      goalId: id,
      text: body.text.trim(),
      by: session.user.id,
      byName: session.user.name || 'Unknown',
      role: userRole,
    });

    // Verify it was saved
    if (!comment._id) {
      return NextResponse.json({ error: 'Unable to save reply. Please retry later.' }, { status: 500 });
    }

    // Notify the goal owner if commenter is not the owner
    if (!isOwner) {
      try {
        await Notification.create({
          userId: goal.userId,
          type: 'goal_comment',
          title: `${userRole} Reply`,
          message: `${session.user.name} replied on goal "${goal.title}": "${body.text.trim().substring(0, 80)}${body.text.trim().length > 80 ? '...' : ''}"`,
          link: `/goals/${goal._id}`,
        });
      } catch (e) {
        console.error('Notification failed (comment saved):', e);
      }
    }

    return NextResponse.json({
      message: 'Comment added.',
      comment: {
        _id: comment._id.toString(),
        goalId: comment.goalId.toString(),
        text: comment.text,
        by: comment.by.toString(),
        byName: comment.byName,
        role: comment.role,
        createdAt: comment.createdAt,
      },
    });
  } catch (error) {
    console.error('Discussion POST error:', error);
    return NextResponse.json({ error: 'Unable to save reply. Please retry later.' }, { status: 500 });
  }
}
