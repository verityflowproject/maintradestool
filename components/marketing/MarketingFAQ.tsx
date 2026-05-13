"use client";

import { track } from "@vercel/analytics";

const FAQS = [
  {
    q: "Do I need a credit card to start?",
    a: "No. The 14-day free trial requires zero payment info. You only add a card if you decide to keep using VerityFlow after the trial.",
  },
  {
    q: "Will this work on my phone in the field?",
    a: "Yes — VerityFlow is built mobile-first. It works on any modern phone, in any browser, with one hand. Most people use it more on their phone than their laptop.",
  },
  {
    q: "How long does setup take?",
    a: "About 5 minutes. You answer a few questions about your trade and rates, and you're ready to log your first job. No implementation specialist, no onboarding calls.",
  },
  {
    q: "Can I import my existing customers?",
    a: "You can add customers manually as jobs come in — most users create a new customer record the first time a job comes in. Bulk CSV import is on the feature board and actively planned.",
  },
  {
    q: "What happens if I cancel?",
    a: "You can export all your data — jobs, customers, invoices — as a CSV from Settings at any time. Cancellation is one click and takes effect at the end of your billing period. Your account stays accessible until then.",
  },
  {
    q: "How is this different from Jobber or Housecall Pro?",
    a: "Jobber and Housecall Pro are built for big crews and office admins. They cost $50–$300+/month and take days to learn. VerityFlow is built for solo operators and small crews who want to start logging jobs in 5 minutes for one flat price.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is encrypted in transit (HTTPS) and at rest. Logins use industry-standard authentication. We never sell your data or share it with third parties.",
  },
  {
    q: "Can I have multiple people on my team use it?",
    a: "Yes. Invite as many team members as you have. Assign jobs, track hours, coordinate work. Everyone included in the one flat price — no per-seat charges.",
  },
  {
    q: "Does it work offline?",
    a: "VerityFlow is a Progressive Web App. Job entries are held locally if you lose signal and sync automatically when you reconnect. So if you're in a basement with no service, you can still log the job — it'll upload when you walk outside.",
  },
];

export default function MarketingFAQ() {
  return (
    <div className="mk-faq" role="list">
      {FAQS.map(({ q, a }) => (
        <details
          key={q}
          className="mk-faq__item"
          role="listitem"
          onToggle={(e) => {
            if ((e.currentTarget as HTMLDetailsElement).open) {
              track("faq_opened", { question: q });
            }
          }}
        >
          <summary className="mk-faq__question">{q}</summary>
          <p className="mk-faq__answer">{a}</p>
        </details>
      ))}
    </div>
  );
}
