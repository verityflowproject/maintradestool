'use client';

import Link from 'next/link';
import { Lock, ArrowRight } from 'lucide-react';

interface Props {
  /** Human-readable page label, e.g. "invoices" */
  noun: string;
  /** How many records the user has (shown as social proof) */
  count?: number;
}

/**
 * Full-page overlay shown on list pages when the user's trial/subscription has
 * expired.  Renders above the existing list content so users can still see
 * their data through the blur, motivating them to upgrade.
 */
export default function ExpiredOverlay({ noun, count }: Props) {
  return (
    <div
      className="expired-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-label="Trial expired — upgrade required"
    >
      <div className="expired-overlay__card">
        <span className="expired-overlay__icon">
          <Lock size={28} strokeWidth={2} />
        </span>

        <h2 className="expired-overlay__title">Your free trial has ended</h2>

        <p className="expired-overlay__body">
          {count != null && count > 0
            ? `You have ${count} ${noun} saved in your account.`
            : `Your ${noun} are safely stored in your account.`}{' '}
          Upgrade to Pro to keep managing your business.
        </p>

        <Link href="/settings/billing" className="expired-overlay__cta">
          Upgrade to Pro
          <ArrowRight size={16} strokeWidth={2.5} />
        </Link>

        <p className="expired-overlay__sub">
          No contract · cancel anytime
        </p>
      </div>

      <style>{`
        .expired-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(7, 7, 12, 0.72);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          padding: 24px;
        }

        .expired-overlay__card {
          background: #13131f;
          border: 1px solid rgba(200, 180, 250, 0.18);
          border-radius: 16px;
          padding: 40px 32px;
          max-width: 440px;
          width: 100%;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
        }

        .expired-overlay__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(200, 180, 250, 0.12);
          color: #c8b4fa;
        }

        .expired-overlay__title {
          font-size: 1.35rem;
          font-weight: 700;
          color: #e2e2e8;
          margin: 0;
          line-height: 1.3;
        }

        .expired-overlay__body {
          font-size: 0.9375rem;
          color: #9898aa;
          margin: 0;
          line-height: 1.6;
        }

        .expired-overlay__cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #c8b4fa;
          color: #07070c;
          font-weight: 700;
          font-size: 0.9375rem;
          padding: 12px 28px;
          border-radius: 10px;
          text-decoration: none;
          transition: background 0.15s, transform 0.1s;
          margin-top: 4px;
        }

        .expired-overlay__cta:hover {
          background: #ddd0fc;
          transform: translateY(-1px);
        }

        .expired-overlay__cta:active {
          transform: translateY(0);
        }

        .expired-overlay__sub {
          font-size: 0.8125rem;
          color: #5a5a6e;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
