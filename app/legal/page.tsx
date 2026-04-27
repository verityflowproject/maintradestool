'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

type Tab = 'terms' | 'privacy';

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="legal-section">
      <p className="legal-section__heading">{heading}</p>
      <div className="legal-section__body">{children}</div>
    </div>
  );
}

function TermsContent() {
  return (
    <>
      <p className="legal-last-updated">Last updated: April 2026</p>

      <Section heading="1. Acceptance of Terms">
        <p>
          By creating an account or using VerityFlow ("Service", "we", "us"), you agree to these Terms of Service.
          If you do not agree, do not use the Service. These terms form a binding agreement between you and VerityFlow.
        </p>
      </Section>

      <Section heading="2. Eligibility">
        <p>
          You must be at least 18 years old and have the legal capacity to enter into a contract to use VerityFlow.
          The Service is intended for tradespeople, contractors, and small business owners operating legally in their
          jurisdiction. By using VerityFlow you represent that you meet these requirements.
        </p>
      </Section>

      <Section heading="3. Account & Security">
        <p>
          You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us
          immediately at{' '}
          <a href="mailto:contact@verityflow.io">contact@verityflow.io</a> if you suspect any unauthorised access.
          We are not liable for losses resulting from unauthorised use of your account where you failed to keep
          credentials secure.
        </p>
        <p>
          You may not share your account with others or create accounts for third parties without our written
          permission. We reserve the right to suspend or terminate accounts that violate this policy.
        </p>
      </Section>

      <Section heading="4. Subscription & Billing">
        <p>
          VerityFlow offers a free trial followed by a paid Pro subscription billed through Stripe. By subscribing
          you authorise us to charge the card on file on a recurring monthly basis at the current listed price.
        </p>
        <p>
          <strong>Cancellations:</strong> You may cancel at any time from{' '}
          <Link href="/settings/billing" style={{ color: 'var(--accent-text)' }}>Settings → Subscription</Link>.
          Your access continues until the end of the current billing period. We do not provide refunds for partial
          billing periods unless required by applicable law.
        </p>
        <p>
          <strong>Trial:</strong> The free trial period is stated at sign-up. At the end of your trial, your account
          will be downgraded to read-only mode unless you upgrade to Pro.
        </p>
        <p>
          <strong>Price changes:</strong> We will give at least 30 days' notice before changing subscription prices.
          Continued use after the notice period constitutes acceptance of the new price.
        </p>
      </Section>

      <Section heading="5. Acceptable Use">
        <p>You agree not to:</p>
        <p>
          • Use the Service for any unlawful purpose or in violation of any applicable law or regulation.<br />
          • Upload or transmit harmful, fraudulent, or misleading content.<br />
          • Attempt to reverse-engineer, scrape, or systematically extract data from the Service.<br />
          • Interfere with or disrupt the integrity or performance of the Service or its infrastructure.<br />
          • Use the Service to store or process sensitive personal data of third parties without appropriate consent.
        </p>
      </Section>

      <Section heading="6. User Content & Ownership">
        <p>
          Your data is yours. Any content you upload — including voice recordings, job notes, customer information,
          and invoices — remains your property. You grant VerityFlow a limited licence to store and process that
          content solely for the purpose of providing the Service to you.
        </p>
        <p>
          We do not sell your data to third parties. You can export or delete your data at any time from{' '}
          <Link href="/settings/delete" style={{ color: 'var(--accent-text)' }}>Settings → Delete Account</Link>.
        </p>
      </Section>

      <Section heading="7. Service Availability & Changes">
        <p>
          We strive for high availability but do not guarantee uninterrupted access. Scheduled maintenance,
          infrastructure outages, or circumstances beyond our control may temporarily affect the Service.
        </p>
        <p>
          We may modify, suspend, or discontinue features at any time. We will provide reasonable notice for material
          changes that affect core functionality.
        </p>
      </Section>

      <Section heading="8. Disclaimer & Limitation of Liability">
        <p>
          The Service is provided "as is" and "as available" without warranties of any kind, express or implied,
          including fitness for a particular purpose or non-infringement.
        </p>
        <p>
          To the maximum extent permitted by law, VerityFlow's total liability for any claim arising from your use
          of the Service is limited to the amount you paid us in the 3 months preceding the claim. We are not liable
          for indirect, incidental, special, consequential, or punitive damages.
        </p>
      </Section>

      <Section heading="9. Termination">
        <p>
          You may close your account at any time. We may suspend or terminate your account if you materially breach
          these terms, fail to pay subscription fees, or engage in prohibited activities. Upon termination your right
          to access the Service ends and we will retain your data for 30 days before deletion, except where legally
          required to hold it longer.
        </p>
      </Section>

      <Section heading="10. Governing Law">
        <p>
          These terms are governed by and construed in accordance with applicable law. Any disputes will be resolved
          by binding arbitration or in a court of competent jurisdiction, depending on the nature of the claim.
          You agree that claims must be brought individually and not as part of a class action.
        </p>
      </Section>

      <Section heading="11. Contact">
        <p>
          For questions about these Terms, email us at{' '}
          <a href="mailto:contact@verityflow.io">contact@verityflow.io</a>.
        </p>
      </Section>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <p className="legal-last-updated">Last updated: April 2026</p>

      <Section heading="1. What We Collect">
        <p>
          <strong>Account data:</strong> Name, email address, and password (hashed) provided during sign-up.
        </p>
        <p>
          <strong>Business data:</strong> Business name, trade type, rates, invoice defaults, and booking page
          settings you enter.
        </p>
        <p>
          <strong>Job & voice data:</strong> Voice recordings you submit are processed by our AI pipeline to generate
          job summaries and invoices. Audio files are not stored long-term after transcription is complete.
        </p>
        <p>
          <strong>Customer data:</strong> Names, contact details, addresses, and job history you log for your
          customers.
        </p>
        <p>
          <strong>Usage data:</strong> Pages visited, features used, error logs, and device/browser information
          (used for debugging and improving the product, not for advertising).
        </p>
        <p>
          <strong>Payment data:</strong> Payment card details are handled entirely by Stripe. We never see or store
          your full card number. We do store Stripe customer IDs and subscription status.
        </p>
      </Section>

      <Section heading="2. How We Use It">
        <p>We use your data to:</p>
        <p>
          • Provide, operate, and improve the Service.<br />
          • Generate job summaries, invoices, and PDFs from your voice recordings.<br />
          • Send transactional emails (job confirmations, invoices, payment receipts).<br />
          • Respond to support requests and feature submissions.<br />
          • Detect and prevent fraud, abuse, or security incidents.<br />
          • Comply with legal obligations.
        </p>
        <p>We do not use your data for targeted advertising and we never sell it to third parties.</p>
      </Section>

      <Section heading="3. Third Parties">
        <p>We share data only with the service providers necessary to run VerityFlow:</p>
        <p>
          • <strong>Stripe</strong> — payment processing and subscription management.<br />
          • <strong>MongoDB Atlas</strong> — secure cloud database hosting.<br />
          • <strong>Google / Gmail & Resend</strong> — transactional email delivery.<br />
          • <strong>OpenAI / AI provider</strong> — processing voice recordings to generate job notes.<br />
          • <strong>Vercel</strong> — application hosting and edge network.
        </p>
        <p>
          All third-party providers are contractually bound to protect your data and use it only for the services
          they provide to us.
        </p>
      </Section>

      <Section heading="4. Cookies & Local Storage">
        <p>
          We use session cookies for authentication and local/session storage for app state (e.g. offline job drafts).
          We do not use tracking or advertising cookies. You can clear stored data through your browser settings at
          any time.
        </p>
      </Section>

      <Section heading="5. Data Retention">
        <p>
          We retain your account and business data for as long as your account is active. Voice recordings are
          deleted after the transcription pipeline completes (typically within minutes). If you delete your account,
          we will permanently delete your personal data within 30 days, except where we are required by law to retain
          it longer (e.g. financial records).
        </p>
      </Section>

      <Section heading="6. Your Rights">
        <p>You have the right to:</p>
        <p>
          • <strong>Access</strong> the personal data we hold about you (email us to request an export).<br />
          • <strong>Correct</strong> inaccurate data via your Settings pages.<br />
          • <strong>Delete</strong> your account and all associated data from{' '}
          <Link href="/settings/delete" style={{ color: 'var(--accent-text)' }}>Settings → Delete Account</Link>.<br />
          • <strong>Port</strong> your data — contact us for a machine-readable export.<br />
          • <strong>Object</strong> to processing in certain circumstances.
        </p>
        <p>
          To exercise any of these rights, email{' '}
          <a href="mailto:contact@verityflow.io">contact@verityflow.io</a>. We will respond within 30 days.
        </p>
      </Section>

      <Section heading="7. Security">
        <p>
          We use industry-standard security measures including HTTPS/TLS encryption in transit, hashed passwords,
          and access-controlled infrastructure. No system is perfectly secure, but we take reasonable precautions to
          protect your data. If we become aware of a breach affecting your data we will notify you promptly.
        </p>
      </Section>

      <Section heading="8. Children">
        <p>
          VerityFlow is not directed at, and we do not knowingly collect personal data from, anyone under 18 years
          of age. If we learn we have collected data from a minor, we will delete it promptly.
        </p>
      </Section>

      <Section heading="9. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be communicated via in-app
          notice or email at least 14 days before taking effect. The "Last updated" date at the top reflects the
          most recent revision.
        </p>
      </Section>

      <Section heading="10. Contact">
        <p>
          For privacy-related questions or data requests, email us at{' '}
          <a href="mailto:contact@verityflow.io">contact@verityflow.io</a>.
        </p>
      </Section>
    </>
  );
}

export default function LegalPage() {
  const [tab, setTab] = useState<Tab>('terms');

  return (
    <div className="settings-page page-padding">
      {/* Header */}
      <div className="settings-page__header">
        <Link href="/settings" className="icon-btn" aria-label="Back">
          <ChevronLeft size={22} />
        </Link>
        <h1
          className="settings-page__title"
          style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 22 }}
        >
          Terms &amp; Privacy
        </h1>
      </div>

      {/* Tab toggle */}
      <div className="legal-tabs">
        <button
          className={`legal-tab${tab === 'terms' ? ' active' : ''}`}
          onClick={() => setTab('terms')}
        >
          Terms of Service
        </button>
        <button
          className={`legal-tab${tab === 'privacy' ? ' active' : ''}`}
          onClick={() => setTab('privacy')}
        >
          Privacy Policy
        </button>
      </div>

      {/* Content card */}
      <div className="glass-card" style={{ padding: '24px 20px' }}>
        {tab === 'terms' ? <TermsContent /> : <PrivacyContent />}

        <div className="legal-contact-footer">
          Questions? Email us at{' '}
          <a href="mailto:contact@verityflow.io">contact@verityflow.io</a>
        </div>
      </div>
    </div>
  );
}
