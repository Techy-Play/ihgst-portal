import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import KPIDraft from '@/models/KPIDraft';
import Cycle from '@/models/Cycle';
import { handleApiError, parseBody } from '@/lib/apiError';

// GET: List all KPI drafts visible to this user
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['Manager', 'Admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await dbConnect();

    // Admin sees all drafts; Manager only sees their own
    const query = session.user.role === 'Admin' ? {} : { createdBy: session.user.id };
    const drafts = await KPIDraft.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ drafts });
  } catch (error) {
    return handleApiError(error, 'kpi/draft GET');
  }
}

// POST: Create a new KPI draft
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['Manager', 'Admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await dbConnect();
    const { data: body, error: parseErr } = await parseBody(request);
    if (parseErr) return parseErr;

    // Validate
    if (!body.title?.trim()) return NextResponse.json({ error: 'KPI title is required.' }, { status: 400 });
    if (!body.thrustArea?.trim()) return NextResponse.json({ error: 'Thrust area is required.' }, { status: 400 });
    if (!body.description?.trim()) return NextResponse.json({ error: 'Description is required.' }, { status: 400 });
    if (!body.uom) return NextResponse.json({ error: 'Unit of measurement is required.' }, { status: 400 });
    if (body.target === undefined || body.target === '') return NextResponse.json({ error: 'Target is required.' }, { status: 400 });

    const activeCycle = await Cycle.findOne({ isActive: true }).lean();

    const draft = await KPIDraft.create({
      title: body.title.trim(),
      description: body.description.trim(),
      thrustArea: body.thrustArea,
      uom: body.uom,
      uomDirection: body.uomDirection || 'Min',
      target: body.uom === 'Timeline' ? body.target : Number(body.target),
      defaultWeightage: body.defaultWeightage || 20,
      createdBy: session.user.id,
      createdByName: session.user.name,
      cycleId: activeCycle?._id || null,
      cycleName: activeCycle?.name || null,
    });

    return NextResponse.json({ draft, message: 'KPI saved as draft.' }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'kpi/draft POST');
  }
}

// PUT: Update a KPI draft
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['Manager', 'Admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await dbConnect();
    const { data: body, error: parseErr } = await parseBody(request);
    if (parseErr) return parseErr;

    if (!body.draftId) return NextResponse.json({ error: 'Draft ID is required.' }, { status: 400 });

    const draft = await KPIDraft.findById(body.draftId);
    if (!draft) return NextResponse.json({ error: 'Draft not found.' }, { status: 404 });

    // Managers can only edit their own drafts
    if (session.user.role === 'Manager' && draft.createdBy.toString() !== session.user.id) {
      return NextResponse.json({ error: 'You can only edit your own drafts.' }, { status: 403 });
    }

    const allowed = ['title', 'description', 'thrustArea', 'uom', 'uomDirection', 'target', 'defaultWeightage'];
    allowed.forEach(f => { if (body[f] !== undefined) draft[f] = body[f]; });
    if (body.target !== undefined && draft.uom !== 'Timeline') draft.target = Number(body.target);

    await draft.save();
    return NextResponse.json({ draft, message: 'Draft updated.' });
  } catch (error) {
    return handleApiError(error, 'kpi/draft PUT');
  }
}

// DELETE: Remove a KPI draft
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['Manager', 'Admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await dbConnect();
    const { data: body, error: parseErr } = await parseBody(request);
    if (parseErr) return parseErr;

    if (!body.draftId) return NextResponse.json({ error: 'Draft ID is required.' }, { status: 400 });

    const draft = await KPIDraft.findById(body.draftId);
    if (!draft) return NextResponse.json({ error: 'Draft not found.' }, { status: 404 });

    if (session.user.role === 'Manager' && draft.createdBy.toString() !== session.user.id) {
      return NextResponse.json({ error: 'You can only delete your own drafts.' }, { status: 403 });
    }

    await KPIDraft.findByIdAndDelete(body.draftId);
    return NextResponse.json({ message: 'Draft deleted.' });
  } catch (error) {
    return handleApiError(error, 'kpi/draft DELETE');
  }
}
