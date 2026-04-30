'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronDown,
  Search,
  Rocket,
  Mic,
  FileText,
  Users,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QA {
  q: string;
  a: React.ReactNode;
}

interface Category {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  items: QA[];
}

// ── FAQ data ──────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: 'getting-started',
    icon: <Rocket size={18} />,
    iconBg: 'var(--accent-dim)',
    iconColor: 'var(--accent)',
    label: 'Getting Started',
    items: [
      {
        q: 'What is VerityFlow and who is it for?',
        a: (
          <p>
            VerityFlow is an AI-powered business OS built for tradespeople — plumbers, electricians,
            builders, HVAC techs, and anyone who runs jobs on-site. It turns voice recordings into
            job notes and invoices in seconds, so you spend less time on admin and more time on
            the tools.
          </p>
        ),
      },
      {
        q: 'How do I set up my account after signing up?',
        a: (
          <p>
            After signing up you&apos;ll be walked through an onboarding flow that collects your name,
            business name, and trade. From there, visit{' '}
            <a href="/settings/business">Settings → Business Info</a> to fill in your ABN/business
            number and address (used on invoices), and{' '}
            <a href="/settings/rates">Settings → Rates &amp; Pricing</a> to set your default
            labour rate.
          </p>
        ),
      },
      {
        q: 'Can I install VerityFlow on my phone?',
        a: (
          <p>
            Yes — VerityFlow is a Progressive Web App (PWA). On iOS, open it in Safari and tap{' '}
            <strong>Share → Add to Home Screen</strong>. On Android, tap the browser menu and
            choose <strong>Add to Home Screen</strong> or <strong>Install App</strong>. You&apos;ll
            get a full-screen app icon and faster load times.
          </p>
        ),
      },
      {
        q: 'Does VerityFlow work offline?',
        a: (
          <p>
            Core pages load when you&apos;re offline because VerityFlow caches the app shell. However,
            submitting voice recordings, generating invoices, and syncing data all require an
            internet connection. Draft job notes can be saved locally and synced when you reconnect.
          </p>
        ),
      },
      {
        q: 'How do I navigate the app?',
        a: (
          <p>
            Use the bottom navigation bar to move between Dashboard, Jobs, Invoices, Customers,
            and Calendar. The Dashboard gives you a quick snapshot of recent jobs, outstanding
            invoices, and upcoming bookings. Tap the{' '}
            <strong>Settings</strong> icon (top-right on the dashboard) for account and app settings.
          </p>
        ),
      },
    ],
  },
  {
    id: 'voice-jobs',
    icon: <Mic size={18} />,
    iconBg: 'rgba(248,113,113,0.15)',
    iconColor: 'var(--danger)',
    label: 'Voice & Jobs',
    items: [
      {
        q: 'How do I log a job with voice?',
        a: (
          <p>
            From the Dashboard or Jobs page, tap the <strong>+ New Job</strong> button then choose{' '}
            <strong>Voice</strong>. Hold the record button and describe the job out loud — what you
            did, materials used, time taken, and anything else relevant. Release to stop. Our AI
            will transcribe and structure it into a job summary within seconds.
          </p>
        ),
      },
      {
        q: 'What should I say when recording a job?',
        a: (
          <p>
            Speak naturally. Mention: the customer name, job address, work performed, materials
            used and quantities, time spent, and any notes for the invoice. For example:{' '}
            <em>
              &quot;Replaced the hot water system at 42 Smith Street for John Williams. Supplied
              one 26L Rinnai unit, 2 metres of copper pipe, and fittings. Took 3 hours labour.&quot;
            </em>
          </p>
        ),
      },
      {
        q: 'Can I edit the AI-generated job summary?',
        a: (
          <p>
            Yes. After the recording is processed you&apos;ll see a review screen with the
            transcription and structured job data. Tap any field to edit it before saving. You can
            also reopen and edit a saved job from the Jobs list at any time.
          </p>
        ),
      },
      {
        q: 'Are my voice recordings stored?',
        a: (
          <p>
            Voice recordings are processed by our AI pipeline and then deleted. We do not keep
            audio files after the transcript is generated (typically within a minute of submission).
            Only the structured job data and transcript text are stored in your account.
          </p>
        ),
      },
      {
        q: 'Can I log a job by typing instead of voice?',
        a: (
          <p>
            Yes. On the New Job screen, choose <strong>Manual</strong> instead of Voice to type
            job details directly. You can also edit any voice-generated job to add or change text
            fields. All the same invoice-generation features apply.
          </p>
        ),
      },
    ],
  },
  {
    id: 'invoices',
    icon: <FileText size={18} />,
    iconBg: 'rgba(103,232,249,0.15)',
    iconColor: '#67E8F9',
    label: 'Invoices',
    items: [
      {
        q: 'How do I create an invoice from a job?',
        a: (
          <p>
            Open a job and tap <strong>Create Invoice</strong>. VerityFlow automatically populates
            the invoice with the job&apos;s labour hours, materials, and your default rates. Review
            the line items, adjust quantities or prices if needed, then tap{' '}
            <strong>Save</strong>. You can send it as a PDF or email it to the customer directly
            from the invoice screen.
          </p>
        ),
      },
      {
        q: 'How do I customise my invoice defaults?',
        a: (
          <p>
            Go to <a href="/settings/invoices">Settings → Invoice Defaults</a>. Here you can set
            your business name, logo, payment terms, bank details/BSB, and the default GST rate.
            These settings are applied automatically to every new invoice.
          </p>
        ),
      },
      {
        q: 'Can I email an invoice to my customer?',
        a: (
          <p>
            Yes. From an invoice, tap <strong>Send by Email</strong> and enter your customer&apos;s
            email address. A professionally formatted PDF invoice is sent automatically. You can
            also share the PDF directly via your phone&apos;s share sheet (Messages, WhatsApp, etc.).
          </p>
        ),
      },
      {
        q: 'How do I mark an invoice as paid?',
        a: (
          <p>
            Open the invoice and tap <strong>Mark as Paid</strong>. You can record the payment
            method and date. Paid invoices are moved to a separate Paid tab in your Invoices list
            so you can keep your outstanding invoices clean.
          </p>
        ),
      },
      {
        q: 'Does VerityFlow handle GST?',
        a: (
          <p>
            Yes. Set your GST rate in{' '}
            <a href="/settings/invoices">Settings → Invoice Defaults</a>. VerityFlow will
            calculate GST on each line item and show the total inc. and ex. GST on the invoice.
            If you&apos;re not GST-registered, you can set the rate to 0%.
          </p>
        ),
      },
    ],
  },
  {
    id: 'customers-booking',
    icon: <Users size={18} />,
    iconBg: 'rgba(74,222,128,0.12)',
    iconColor: 'var(--success)',
    label: 'Customers & Booking',
    items: [
      {
        q: 'How do I add a customer?',
        a: (
          <p>
            Customers are created automatically when you log a job and enter a customer name.
            You can also manually add customers from the <a href="/customers">Customers</a> page
            by tapping <strong>+ New Customer</strong>. Customer records include contact details,
            address history, all past jobs, and invoices.
          </p>
        ),
      },
      {
        q: 'What is the Booking Page?',
        a: (
          <p>
            Your booking page is a public URL (e.g.{' '}
            <strong>verityflow.io/book/your-slug</strong>) that customers can visit to request
            a job. They fill in their details and what they need. You receive a notification and
            can accept or decline from <a href="/requests">Requests</a>. Enable it in{' '}
            <a href="/settings/booking">Settings → Booking Page</a>.
          </p>
        ),
      },
      {
        q: 'How do I customise my booking page?',
        a: (
          <p>
            Go to <a href="/settings/booking">Settings → Booking Page</a>. You can set a custom
            slug (e.g. your business name), add a bio, list your service areas and available
            trades, upload a profile photo, and configure which job types you accept.
          </p>
        ),
      },
      {
        q: 'How do I accept or decline a booking request?',
        a: (
          <p>
            Open the <a href="/requests">Requests</a> page to see all incoming requests. Tap a
            request to review the customer&apos;s details and job description. Tap{' '}
            <strong>Accept</strong> to confirm (a job is created automatically) or{' '}
            <strong>Decline</strong> to close the request. The customer receives an email
            notification either way.
          </p>
        ),
      },
      {
        q: 'Can customers see my availability on the booking page?',
        a: (
          <p>
            Currently the booking page is a request form rather than a real-time availability
            calendar. After a customer submits a request, you review it and confirm availability
            directly. We&apos;re working on calendar-based availability as a future feature — vote
            for it on the <a href="/feature-board">Feature Board</a>.
          </p>
        ),
      },
    ],
  },
  {
    id: 'billing',
    icon: <CreditCard size={18} />,
    iconBg: 'rgba(56, 189, 248,0.12)',
    iconColor: 'var(--warning)',
    label: 'Billing & Subscription',
    items: [
      {
        q: 'What does the free trial include?',
        a: (
          <p>
            Your trial gives you full access to all Pro features — unlimited jobs, invoices,
            customers, and the public booking page — for the duration shown at sign-up (typically
            14 days). No credit card is required to start your trial.
          </p>
        ),
      },
      {
        q: 'How do I upgrade to Pro?',
        a: (
          <p>
            Go to <a href="/settings/billing">Settings → Subscription</a> and tap{' '}
            <strong>Upgrade to Pro</strong>. You&apos;ll be taken to a secure Stripe checkout to
            enter your card details. Once payment is confirmed, your account is upgraded
            immediately.
          </p>
        ),
      },
      {
        q: 'How do I cancel my subscription?',
        a: (
          <p>
            Go to <a href="/settings/billing">Settings → Subscription</a> and tap{' '}
            <strong>Cancel Plan</strong>. Your Pro access continues until the end of the current
            billing period. You won&apos;t be charged again after cancellation. You can resubscribe
            at any time.
          </p>
        ),
      },
      {
        q: 'What happens when my trial or subscription expires?',
        a: (
          <p>
            After expiry, your account switches to read-only mode. You can still view all your
            existing jobs, invoices, and customers, but you won&apos;t be able to create new ones
            until you upgrade. Your data is never deleted due to an expired subscription.
          </p>
        ),
      },
      {
        q: 'Can I get a refund?',
        a: (
          <p>
            We don&apos;t offer refunds for partial billing periods, but if you have a billing issue
            or were charged unexpectedly, email us at{' '}
            <a href="mailto:contact@verityflow.io">contact@verityflow.io</a> and we&apos;ll review
            it case by case.
          </p>
        ),
      },
    ],
  },
  {
    id: 'account-privacy',
    icon: <ShieldCheck size={18} />,
    iconBg: 'rgba(30, 144, 255, 0.15)',
    iconColor: 'var(--accent)',
    label: 'Account & Privacy',
    items: [
      {
        q: 'How do I change my email address?',
        a: (
          <p>
            Go to <a href="/settings/email">Settings → Email Address</a>. Enter your new email
            and confirm. A verification link will be sent to your new address before the change
            takes effect.
          </p>
        ),
      },
      {
        q: 'How do I change my password?',
        a: (
          <p>
            Go to <a href="/settings/password">Settings → Change Password</a>. Enter your current
            password, then your new password twice to confirm. If you signed up with Google and
            don&apos;t have a password set, this option won&apos;t appear.
          </p>
        ),
      },
      {
        q: 'How do I delete my account?',
        a: (
          <p>
            Go to <a href="/settings/delete">Settings → Delete Account</a>. This permanently
            deletes your account and all associated data — jobs, invoices, customers, and
            recordings. This action cannot be undone. Your data is removed from our systems
            within 30 days.
          </p>
        ),
      },
      {
        q: 'Is my data secure?',
        a: (
          <p>
            Yes. All data is encrypted in transit (HTTPS/TLS). Passwords are hashed and never
            stored in plain text. Voice recordings are deleted after processing. Our infrastructure
            runs on Vercel and MongoDB Atlas, both of which have industry-standard security
            certifications. See our <a href="/legal?tab=privacy">Privacy Policy</a> for full
            details.
          </p>
        ),
      },
      {
        q: 'Where can I read the Terms of Service and Privacy Policy?',
        a: (
          <p>
            Both documents are available at <a href="/legal">Settings → Terms &amp; Privacy</a>.
            You can toggle between Terms of Service and Privacy Policy using the tab buttons at
            the top of that page.
          </p>
        ),
      },
    ],
  },
];

// ── Category card ──────────────────────────────────────────────────────────────

function CategoryCard({
  category,
  open,
  onToggle,
  matchIds,
  showAll,
}: {
  category: Category;
  open: boolean;
  onToggle: () => void;
  matchIds: Set<number> | null;
  showAll: boolean;
}) {
  const visibleItems = showAll
    ? category.items
    : category.items.filter((_, i) => matchIds?.has(i) ?? true);

  if (!showAll && matchIds !== null && visibleItems.length === 0) return null;

  return (
    <div className="glass-card help-category">
      <button
        type="button"
        className="help-category__header"
        onClick={onToggle}
        aria-expanded={open}
      >
        <div
          className="help-category__icon"
          style={{ background: category.iconBg, color: category.iconColor }}
        >
          {category.icon}
        </div>
        <span className="help-category__label">{category.label}</span>
        <span className="help-category__count">{visibleItems.length} topics</span>
        <ChevronDown
          size={18}
          className={`contact-card__chevron${open ? ' rotated' : ''}`}
          style={{ color: 'var(--text-muted)' }}
        />
      </button>

      <div className={`contact-card__expand${open ? ' open' : ''}`}>
        <div style={{ height: 1, background: 'var(--quartz-border)', margin: '0 20px' }} />
        <div className="contact-card__form" style={{ padding: '12px 20px 20px' }}>
          {visibleItems.map((item, i) => (
            <div key={i} className="help-qa">
              <p className="help-qa__question">{item.q}</p>
              <div className="help-qa__answer">{item.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  firstName: string;
}

export default function HelpCenterClient({ firstName: _firstName }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const lowerQuery = query.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!lowerQuery) return null;
    const results: Map<string, Set<number>> = new Map();
    for (const cat of CATEGORIES) {
      const matchedIndices = new Set<number>();
      cat.items.forEach((item, i) => {
        const text = `${item.q} ${typeof item.a === 'string' ? item.a : ''}`.toLowerCase();
        if (text.includes(lowerQuery) || cat.label.toLowerCase().includes(lowerQuery)) {
          matchedIndices.add(i);
        }
      });
      if (matchedIndices.size > 0 || cat.label.toLowerCase().includes(lowerQuery)) {
        results.set(cat.id, matchedIndices.size > 0 ? matchedIndices : new Set(cat.items.map((_, i) => i)));
      }
    }
    return results;
  }, [lowerQuery]);

  const totalMatches = searchResults
    ? Array.from(searchResults.values()).reduce((acc, s) => acc + s.size, 0)
    : null;

  const toggle = (id: string) => {
    setOpenCategory((prev) => (prev === id ? null : id));
  };

  const hasNoResults = searchResults !== null && totalMatches === 0;

  return (
    <div
      className="app-shell"
      style={{ minHeight: '100dvh', background: 'var(--bg-void)', paddingBottom: 48 }}
    >
      {/* Header */}
      <div style={{ padding: 'calc(20px + env(safe-area-inset-top)) 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <button
            type="button"
            className="icon-btn"
            onClick={() => router.push('/settings')}
            aria-label="Back to settings"
          >
            <ChevronLeft size={22} />
          </button>
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-syne), sans-serif',
            fontWeight: 700,
            fontSize: 24,
            color: 'var(--text-primary)',
            margin: '0 0 4px',
          }}
        >
          Help Center
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-dm-sans), sans-serif',
            fontSize: 14,
            color: 'var(--text-secondary)',
            margin: '0 0 20px',
          }}
        >
          Answers to common questions.
        </p>

        {/* Search bar */}
        <div className="help-search">
          <span className="help-search__icon">
            <Search size={16} />
          </span>
          <input
            className="help-search__input"
            type="search"
            placeholder="Search for a topic…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpenCategory('__all__');
            }}
          />
        </div>
      </div>

      {/* Category cards */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {hasNoResults ? (
          <div className="glass-card help-empty">
            <div className="help-empty__icon">🔍</div>
            <p className="help-empty__title">No results for &ldquo;{query}&rdquo;</p>
            <p className="help-empty__sub">Try a different keyword, or reach out to us directly.</p>
            <button
              type="button"
              className="btn-accent"
              onClick={() => router.push('/contact?type=support')}
              style={{ width: '100%', maxWidth: 280 }}
            >
              Ask us directly
            </button>
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            const matchIds = searchResults?.get(cat.id) ?? null;
            const isOpen = lowerQuery
              ? matchIds !== null
              : openCategory === cat.id;

            return (
              <CategoryCard
                key={cat.id}
                category={cat}
                open={isOpen}
                onToggle={() => toggle(cat.id)}
                matchIds={lowerQuery ? (matchIds ?? new Set()) : null}
                showAll={!lowerQuery}
              />
            );
          })
        )}
      </div>

      {/* Still have questions CTA */}
      {!hasNoResults && (
        <div style={{ padding: '0 16px' }}>
          <div className="glass-card help-cta">
            <p className="help-cta__heading">Still have questions?</p>
            <p className="help-cta__sub">
              We read every message and usually reply within 24 hours.
            </p>
            <button
              type="button"
              className="btn-accent"
              onClick={() => router.push('/contact?type=support')}
              style={{ width: '100%' }}
            >
              Get in touch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
