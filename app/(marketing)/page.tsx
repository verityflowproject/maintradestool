import type { Metadata } from "next";
import Image from "next/image";
import {
  Mic,
  Clock,
  AlertCircle,
  Brain,
  Users,
  MessageSquarePlus,
  Smartphone,
  Calendar,
  DollarSign,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import MarketingFAQ from "@/components/marketing/MarketingFAQ";
import TrackCTA from "@/components/marketing/TrackCTA";

// ── Metadata ────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:
    "VerityFlow — Job logging and invoicing for contractors and tradespeople",
  description:
    "Voice-to-invoice job tracking built for the field. Log jobs by talking. Send invoices in seconds. Built for plumbers, electricians, HVAC, and every other trade.",
  keywords: [
    "contractor invoicing software",
    "tradesperson job tracker",
    "voice to invoice",
    "field service app",
    "plumber invoicing",
    "electrician job log",
    "HVAC software",
    "handyman invoicing",
  ],
  authors: [{ name: "VerityFlow" }],
  openGraph: {
    title: "VerityFlow — Stop losing your evenings to paperwork",
    description:
      "Voice-to-invoice job tracking for contractors and tradespeople. Talk a job in 30 seconds. Send the invoice in 30 more.",
    url: "https://verityflow.io",
    siteName: "VerityFlow",
    images: [
      {
        url: "https://verityflow.io/og-image.png",
        width: 1200,
        height: 630,
        alt: "VerityFlow — Stop losing your evenings to paperwork",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VerityFlow — Voice-to-invoice for tradespeople",
    description: "Stop losing your evenings to paperwork.",
    images: ["https://verityflow.io/og-image.png"],
  },
  alternates: { canonical: "https://verityflow.io" },
  robots: { index: true, follow: true },
};

// ── Static data ──────────────────────────────────────────────────────────────

const PROBLEM_TILES = [
  {
    Icon: Clock,
    headline: "11pm invoicing sessions",
    body: "After a 12-hour day, you're typing up what you did, hunting for parts costs, and praying you didn't forget a charge.",
  },
  {
    Icon: AlertCircle,
    headline: "Slow invoices, slow pay",
    body: "Customers ghost when the invoice takes a week. Cash flow tanks. You eat the loss.",
  },
  {
    Icon: Brain,
    headline: "Mental load you can't put down",
    body: "Who owes what. What you charged the Johnsons last time. Which materials Mike picked up Tuesday. It all lives in your head.",
  },
];

const STEPS = [
  {
    num: "01",
    label: "Talk it",
    body: "Pull out your phone between jobs. Tap the mic. Talk through what you did: the customer, the work, the parts, the hours, the charge. VerityFlow turns rambling into a clean, structured job log.",
  },
  {
    num: "02",
    label: "Tap it",
    body: "One tap to generate a branded invoice with your business name, your terms, your rates. One more tap to send it to the customer's email or phone.",
  },
  {
    num: "03",
    label: "Get paid",
    body: "Track who owes what, send automatic reminders, get paid faster. Move on to the next job with a clean slate.",
  },
];

const FEATURES = [
  {
    Icon: Mic,
    headline: "Voice-to-invoice",
    body: "The only field-service tool built around voice. Talk a job in 30 seconds. Send the invoice in 30 more. No typing, no clicking through twelve dropdowns.",
  },
  {
    Icon: Users,
    headline: "Team-ready from day one",
    body: 'Solo today, crew tomorrow? Add team members, assign jobs, track hours, run payroll. No enterprise pricing tiers. No "contact sales."',
  },
  {
    Icon: MessageSquarePlus,
    headline: "You shape the roadmap",
    body: "Need a feature? Submit it on the feature board. Vote on what gets built next. We ship what users ask for — not what a product manager dreamed up in a conference room.",
  },
  {
    Icon: Smartphone,
    headline: "Built for the field, not the office",
    body: "Mobile-first. Works on a 5-inch screen with one hand and dirty thumbs. Loads in 2 seconds. No training day required.",
  },
  {
    Icon: Calendar,
    headline: "Public booking page",
    body: "Get your own bookings link. Customers schedule themselves. You show up to do the work — no more phone tag.",
  },
  {
    Icon: DollarSign,
    headline: "Honest pricing",
    body: "One flat rate. Whole team included. No starter / professional / enterprise games. No surprises on your billing statement.",
  },
];

const PLAN_FEATURES = [
  "Unlimited jobs",
  "Unlimited customers",
  "Unlimited invoices",
  "Voice-to-invoice",
  "Team management",
  "Public booking page",
  "Feature board access",
  "Mobile + web",
  "Cancel anytime",
];

// ── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main id="main-content">

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="mk-hero" aria-labelledby="hero-headline">
        <div className="mk-container mk-hero__inner">

          {/* Copy column */}
          <div className="mk-hero__copy">
            <h1 id="hero-headline" className="mk-hero__headline">
              Spend your day on the trade.
              <br />
              <span className="mk-gradient-text">
                We&apos;ll handle the paperwork.
              </span>
            </h1>

            <p className="mk-hero__sub">
              VerityFlow lets contractors and tradespeople log jobs by talking,
              send invoices in seconds, and stop drowning in admin work.
            </p>

            <div className="mk-hero__ctas">
              <TrackCTA
                location="hero"
                href="/onboarding"
                className="mk-btn-primary"
              >
                Start your free trial
                <ArrowRight size={18} aria-hidden="true" />
              </TrackCTA>
              <p className="mk-hero__reassurance">
                14 days. No credit card required. Cancel anytime.
              </p>
            </div>

            <p className="mk-trust-strip" aria-label="Built for every trade">
              Built for plumbers · electricians · HVAC · handymen · painters ·
              landscapers · roofers · carpenters · mobile mechanics · cleaning ·
              pest control · pool service · locksmiths · and every other trade
            </p>
          </div>

          {/* Demo / video placeholder */}
          <div
            className="mk-hero__demo"
            data-video-coming-soon="true"
            aria-label="VerityFlow product demonstration — video coming soon"
          >
            <div className="mk-hero__demo-inner">
              <div className="mk-hero__demo-phone" aria-hidden="true">
                <div className="mk-hero__demo-mic">
                  <Mic size={32} />
                </div>
                <div className="mk-hero__demo-waveform">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <span
                      key={i}
                      className="mk-hero__demo-bar"
                      style={{ animationDelay: `${i * 80}ms` }}
                    />
                  ))}
                </div>
                <p className="mk-hero__demo-status">Listening…</p>
                <div className="mk-hero__demo-invoice">
                  <div className="mk-hero__demo-line mk-hero__demo-line--wide" />
                  <div className="mk-hero__demo-line" />
                  <div className="mk-hero__demo-line mk-hero__demo-line--short" />
                  <div className="mk-hero__demo-amount">$347.00</div>
                </div>
              </div>
              <div className="mk-hero__play-wrap">
                <div className="mk-hero__play-btn" role="img" aria-label="Demo video coming soon">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="mk-hero__play-label">
                  Voice to invoice — 30 sec demo
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM ──────────────────────────────────────────────────── */}
      <section
        className="mk-section mk-problem"
        aria-labelledby="problem-headline"
      >
        <div className="mk-container">
          <h2 id="problem-headline" className="mk-section__headline">
            You didn&apos;t get into the trade to do paperwork.
          </h2>
          <div className="mk-card-grid mk-card-grid--3">
            {PROBLEM_TILES.map(({ Icon, headline, body }) => (
              <div key={headline} className="glass-card mk-feature-card">
                <Icon
                  size={28}
                  className="mk-feature-card__icon"
                  aria-hidden="true"
                />
                <h3 className="mk-feature-card__headline">{headline}</h3>
                <p className="mk-feature-card__body">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section
        id="features"
        className="mk-section mk-steps-section"
        aria-labelledby="steps-headline"
      >
        <div className="mk-container">
          <h2 id="steps-headline" className="mk-section__headline">
            Three taps and a voice note. That&apos;s it.
          </h2>
          <div className="mk-steps__grid">
            {STEPS.map(({ num, label, body }) => (
              <div key={num} className="mk-step">
                <div className="mk-step__num" aria-hidden="true">
                  {num}
                </div>
                <div className="mk-step__content">
                  <h3 className="mk-step__label">{label}</h3>
                  <p className="mk-step__body">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mk-steps__cta">
            <TrackCTA
              location="how_it_works"
              href="/onboarding"
              className="mk-btn-primary mk-btn-primary--inline"
            >
              Try it free
              <ArrowRight size={16} aria-hidden="true" />
            </TrackCTA>
          </div>
        </div>
      </section>

      {/* ── DIFFERENTIATORS ──────────────────────────────────────────── */}
      <section
        className="mk-section mk-diff"
        aria-labelledby="diff-headline"
      >
        <div className="mk-container">
          <h2 id="diff-headline" className="mk-section__headline">
            Built different. On purpose.
          </h2>
          <p className="mk-section__sub">
            Other tools were built for office admins. We built this for the
            people doing the actual work.
          </p>
          <div className="mk-card-grid mk-card-grid--3">
            {FEATURES.map(({ Icon, headline, body }) => (
              <div key={headline} className="glass-card mk-feature-card">
                <div className="mk-feature-card__icon-wrap" aria-hidden="true">
                  <Icon size={22} />
                </div>
                <h3 className="mk-feature-card__headline">{headline}</h3>
                <p className="mk-feature-card__body">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOUNDER ──────────────────────────────────────────────────── */}
      <section
        className="mk-section mk-founder"
        aria-labelledby="founder-headline"
      >
        <div className="mk-container">
          <div className="glass-card mk-founder__card">
            <div className="mk-founder__avatar" aria-hidden="true">
              U
            </div>
            <div className="mk-founder__body">
              <h2 id="founder-headline" className="mk-founder__headline">
                Built by one person. Improved by every user.
              </h2>
              <p className="mk-founder__copy">
                VerityFlow isn&apos;t built by a faceless SaaS company.
                It&apos;s built by an indie founder who got tired of watching
                tradespeople lose their evenings to admin work that should take
                two minutes.
              </p>
              <p className="mk-founder__copy">
                That means: feedback hits a real person. Features ship in days,
                not quarters. Pricing stays fair. And every line of code is
                written with one question in mind —{" "}
                <em>
                  &ldquo;would this actually help someone in a truck?&rdquo;
                </em>
              </p>
              <p className="mk-founder__copy">
                Hit the feature board. I read every submission.
              </p>
              <p className="mk-founder__sig">— Ulises, founder</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────── */}
      <section
        id="pricing"
        className="mk-section mk-pricing"
        aria-labelledby="pricing-headline"
      >
        <div className="mk-container mk-pricing__inner">
          <h2 id="pricing-headline" className="mk-section__headline">
            One plan. One price. Everything included.
          </h2>
          <div className="glass-card mk-pricing-card">
            <p className="mk-pricing-card__tagline">VerityFlow Pro</p>
            <div className="mk-pricing-card__price">
              <span className="mk-pricing-card__amount">$29</span>
              <span className="mk-pricing-card__period">/month</span>
            </div>
            <p className="mk-pricing-card__billing">
              per business · whole team included ·{" "}
              <strong>$290/year</strong> (save $58)
            </p>
            <ul
              className="mk-pricing-card__features"
              aria-label="Plan features"
            >
              {PLAN_FEATURES.map((f) => (
                <li key={f} className="mk-pricing-card__feature">
                  <CheckCircle2
                    size={16}
                    className="mk-pricing-card__check"
                    aria-hidden="true"
                  />
                  {f}
                </li>
              ))}
            </ul>
            <TrackCTA
              location="pricing"
              href="/onboarding"
              className="mk-btn-primary"
            >
              Start 14-day free trial
              <ArrowRight size={18} aria-hidden="true" />
            </TrackCTA>
            <p className="mk-pricing-card__reassurance">
              No credit card required to start
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section
        id="faq"
        className="mk-section mk-faq-section"
        aria-labelledby="faq-headline"
      >
        <div className="mk-container mk-faq-section__inner">
          <h2 id="faq-headline" className="mk-section__headline">
            Questions, answered.
          </h2>
          <MarketingFAQ />
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section
        className="mk-final-cta"
        aria-labelledby="final-cta-headline"
      >
        <div className="mk-container mk-final-cta__inner">
          <h2 id="final-cta-headline" className="mk-final-cta__headline">
            Stop losing your evenings.
            <br />
            <span className="mk-gradient-text">Start your free trial.</span>
          </h2>
          <TrackCTA
            location="final"
            href="/onboarding"
            className="mk-btn-primary mk-btn-primary--lg"
          >
            Get started — free for 14 days
            <ArrowRight size={20} aria-hidden="true" />
          </TrackCTA>
          <p className="mk-final-cta__reassurance">
            No credit card. No long-term contract. Cancel anytime.
          </p>
        </div>
      </section>
    </main>
  );
}
