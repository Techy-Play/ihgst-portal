import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { handleApiError, parseBody } from '@/lib/apiError';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    // Only return non-cleared notifications
    const notifications = await Notification.find({ userId: session.user.id, cleared: { $ne: true } }).sort({ createdAt: -1 }).limit(30).lean();
    const unreadCount = await Notification.countDocuments({ userId: session.user.id, read: false, cleared: { $ne: true } });
    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return handleApiError(error, 'notifications route.js');
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { notificationId, markAll } = await request.json();

    if (markAll) {
      await Notification.updateMany({ userId: session.user.id, read: false, cleared: { $ne: true } }, { $set: { read: true } });
    } else if (notificationId) {
      await Notification.findOneAndUpdate({ _id: notificationId, userId: session.user.id }, { $set: { read: true } });
    }
    
    const unreadCount = await Notification.countDocuments({ userId: session.user.id, read: false, cleared: { $ne: true } });
    return NextResponse.json({ message: 'Updated', unreadCount });
  } catch (error) {
    return handleApiError(error, 'notifications route.js');
  }
}

// Clear (dismiss) notifications — keeps in DB but hides from UI
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { notificationId, clearAll } = await request.json();

    if (clearAll) {
      await Notification.updateMany({ userId: session.user.id, cleared: { $ne: true } }, { $set: { cleared: true, read: true } });
    } else if (notificationId) {
      await Notification.findOneAndUpdate({ _id: notificationId, userId: session.user.id }, { $set: { cleared: true, read: true } });
    }

    const unreadCount = await Notification.countDocuments({ userId: session.user.id, read: false, cleared: { $ne: true } });
    return NextResponse.json({ message: 'Cleared', unreadCount });
  } catch (error) {
    return handleApiError(error, 'notifications route.js');
  }
}
