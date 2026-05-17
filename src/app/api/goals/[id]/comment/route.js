import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';
import Discussion from '@/models/Discussion';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

// GET — fetch all discussion comments for a goal
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await params;

    const comments = await Discussion.find({ goalId: id }).sort({ createdAt: 1 }).lean();
    const serialized = comments.map(c => ({
      _id: c._id.toString(),
      goalId: c.goalId.toString(),
      by: c.by.toString(),
      parentId: c.parentId ? c.parentId.toString() : null,
      replyingTo: c.replyingTo || null,
      text: c.text,
      byName: c.byName,
      role: c.role,
      createdAt: c.createdAt,
    }));
    return NextResponse.json({ comments: serialized });
  } catch (error) {
    console.error('Discussion GET error:', error);
    return NextResponse.json({ error: 'Failed to load discussion.' }, { status: 500 });
  }
}

// POST — add a new comment or reply
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await params;

    let body;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }

    if (!body.text?.trim()) {
      return NextResponse.json({ error: 'Comment text is required.' }, { status: 400 });
    }

    const goal = await Goal.findById(id).select('userId title').lean();
    if (!goal) return NextResponse.json({ error: 'Goal not found.' }, { status: 404 });

    const userRole = session.user.role;
    const isOwner = goal.userId.toString() === session.user.id;

    if (userRole === 'Employee' && !isOwner) {
      return NextResponse.json({ error: 'You can only comment on your own goals.' }, { status: 403 });
    }

    // Resolve parentId and replyingTo name
    let parentObjId = null;
    let replyingTo = null;

    if (body.parentId && mongoose.Types.ObjectId.isValid(body.parentId)) {
      parentObjId = new mongoose.Types.ObjectId(body.parentId);
      const parentComment = await Discussion.findById(parentObjId).select('by byName').lean();
      if (parentComment) {
        replyingTo = parentComment.byName || 'Unknown';
      }
    }

    // Create the comment
    const comment = await Discussion.create({
      goalId: new mongoose.Types.ObjectId(id),
      parentId: parentObjId,
      replyingTo,
      text: body.text.trim(),
      by: new mongoose.Types.ObjectId(session.user.id),
      byName: session.user.name || 'Unknown',
      role: userRole,
    });

    if (!comment._id) {
      return NextResponse.json({ error: 'Unable to save reply. Please retry later.' }, { status: 500 });
    }

    // Notify: reply → parent author, top-level → goal owner
    let notifyUserId = null;
    if (parentObjId) {
      const parentComment = await Discussion.findById(parentObjId).select('by').lean();
      if (parentComment && parentComment.by.toString() !== session.user.id) {
        notifyUserId = parentComment.by.toString();
      }
    } else if (!isOwner) {
      notifyUserId = goal.userId.toString();
    }

    if (notifyUserId) {
      try {
        await Notification.create({
          userId: notifyUserId,
          type: 'goal_comment',
          title: parentObjId ? `${session.user.name} replied to your comment` : `${userRole} Feedback`,
          message: `${session.user.name} ${parentObjId ? 'replied' : 'commented'} on "${goal.title}": "${body.text.trim().substring(0, 80)}${body.text.trim().length > 80 ? '...' : ''}"`,
          link: `/goals/${goal._id}#comment-${comment._id}`,
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
        parentId: comment.parentId ? comment.parentId.toString() : null,
        replyingTo: comment.replyingTo || null,
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
