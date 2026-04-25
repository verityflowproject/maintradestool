import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { Resend } from 'resend';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import BookingRequest from '@/lib/models/BookingRequest';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(
  _req: Request,
  { params }: { params: { requestId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.requestId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  await dbConnect();

  const request = await BookingRequest.findOne({
    _id: params.requestId,
    userId: session.user.id,
  }).lean();

  if (!request) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Auto-mark as viewed if new
  if (request.status === 'new') {
    await BookingRequest.updateOne(
      { _id: params.requestId },
      { $set: { status: 'viewed' } },
    );
    request.status = 'viewed';
  }

  return NextResponse.json({
    request: {
      _id: request._id.toString(),
      name: request.name,
      phone: request.phone,
      email: request.email,
      address: request.address,
      serviceNeeded: request.serviceNeeded,
      preferredDate: request.preferredDate,
      preferredTime: request.preferredTime,
      message: request.message,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { requestId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.requestId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    status?: 'accepted' | 'declined' | 'viewed';
  } | null;

  if (!body?.status) {
    return NextResponse.json({ error: 'status required' }, { status: 400 });
  }

  await dbConnect();

  const request = await BookingRequest.findOne({
    _id: params.requestId,
    userId: session.user.id,
  });

  if (!request) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  request.status = body.status;
  await request.save();

  // Send confirmation email when accepted
  if (body.status === 'accepted' && request.email) {
    const user = await User.findById(session.user.id)
      .select('firstName businessName')
      .lean();

    if (user) {
      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0d0d14;color:#e2e2e8;padding:32px;border-radius:12px;">
          <h2 style="color:#c8b4fa;margin-top:0;">${user.businessName} confirmed your request!</h2>
          <p>Hi ${request.name},</p>
          <p>Your request has been confirmed. <strong>${user.firstName}</strong> will be in touch shortly to arrange the details.</p>
          <hr style="border-color:#2a2a3d;margin:24px 0;"/>
          <p style="color:#9898aa;font-size:12px;">You submitted a request for: ${request.serviceNeeded}</p>
          <p style="color:#5a5a6e;font-size:12px;margin-top:24px;">Powered by VerityFlow</p>
        </div>
      `;

      await resend.emails.send({
        from: 'VerityFlow <noreply@verityflow.com>',
        to: request.email,
        subject: `${user.businessName} confirmed your request!`,
        html,
      });
    }
  }

  return NextResponse.json({ success: true });
}
