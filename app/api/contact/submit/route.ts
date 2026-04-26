import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import ContactSubmission, { ContactType } from '@/lib/models/ContactSubmission';
import { sendEmail } from '@/lib/email/sendEmail';
import { contactConfirmationTemplate, contactAdminNotificationTemplate } from '@/lib/email/templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SubmitBody {
  type: ContactType;
  title?: string;
  description?: string;
  problemSolved?: string;
  priority?: string;
  stepsToReproduce?: string;
  willingToPay?: boolean;
  rating?: number;
}

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await req.json()) as SubmitBody;
  const { type, title, description, problemSolved, priority, stepsToReproduce, willingToPay, rating } = body;

  // Validate type
  const validTypes: ContactType[] = ['feature_request', 'bug_report', 'feedback', 'support', 'partnership', 'other'];
  if (!type || !validTypes.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  // description always required
  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 });
  }

  // Per-type validation
  if (type === 'feature_request') {
    if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    if (title.length > 100) return NextResponse.json({ error: 'Title must be 100 chars or fewer' }, { status: 400 });
    if (!problemSolved?.trim()) return NextResponse.json({ error: 'Problem solved is required' }, { status: 400 });
  }
  if (type === 'bug_report' && !title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  if ((type === 'support' || type === 'other' || type === 'partnership') && !title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  // Auto-capture device info from headers
  const userAgent = req.headers.get('user-agent') ?? '';
  const deviceInfo = userAgent;

  await dbConnect();

  // Snapshot user fields
  const dbUser = await User.findById(session.user.id)
    .select('email firstName businessName trade')
    .lean();

  const userEmail = (dbUser as { email: string } | null)?.email ?? session.user.email ?? '';
  const userFirstName = (dbUser as { firstName: string } | null)?.firstName ?? '';
  const userBusinessName = (dbUser as { businessName: string } | null)?.businessName ?? '';
  const submitterTrade = (dbUser as { trade?: string } | null)?.trade ?? '';

  const priorityValue = (() => {
    if (type === 'bug_report') {
      const valid = ['low', 'medium', 'high', 'critical'];
      return valid.includes(priority ?? '') ? priority : 'medium';
    }
    return undefined;
  })();

  const submission = await ContactSubmission.create({
    userId: session.user.id,
    userEmail,
    userFirstName,
    userBusinessName,
    type,
    title: title?.trim() || undefined,
    description: description.trim(),
    problemSolved: problemSolved?.trim() || undefined,
    priority: priorityValue,
    stepsToReproduce: stepsToReproduce?.trim() || undefined,
    willingToPay: willingToPay ?? false,
    rating: rating ?? undefined,
    deviceInfo,
    submitterTrade,
    status: 'new',
  });

  const submissionId = String(submission._id);

  // Fire-and-forget emails
  const adminEmail = (process.env.ADMIN_EMAILS ?? '').split(',')[0].trim();

  if (userEmail) {
    sendEmail({
      to: userEmail,
      ...contactConfirmationTemplate({ email: userEmail, firstName: userFirstName }, type, {
        title: title?.trim(),
        description: description.trim(),
      }),
    }).catch((err) => console.error('[contact/submit] user email failed:', err));
  }

  if (adminEmail) {
    sendEmail({
      to: adminEmail,
      ...contactAdminNotificationTemplate({
        submissionId,
        type,
        userFirstName,
        userBusinessName,
        userEmail,
        title: title?.trim(),
        description: description.trim(),
        problemSolved: problemSolved?.trim(),
        priority: priorityValue,
        stepsToReproduce: stepsToReproduce?.trim(),
        willingToPay: willingToPay ?? false,
        rating,
      }),
    }).catch((err) => console.error('[contact/submit] admin email failed:', err));
  }

  return NextResponse.json({ success: true, submissionId }, { status: 201 });
}
