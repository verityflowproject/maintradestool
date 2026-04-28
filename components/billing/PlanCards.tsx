'use client';

import { Check, Zap } from 'lucide-react';

const FEATURES = [
  'Unlimited voice-logged jobs',
  'Unlimited invoices',
  'Customer management',
  'Booking page',
  'Priority support',
];

interface Props {
  onSelect: (plan: 'monthly' | 'annual') => void;
  loadingPlan?: 'monthly' | 'annual' | null;
  earlyBird?: boolean;
}

export default function PlanCards({ onSelect, loadingPlan = null, earlyBird = false }: Props) {
  return (
    <div className="billing-plan-grid">
      {/* Annual — shown first as the anchored default */}
      <div className="billing-plan-card billing-plan-card--featured">
        {earlyBird ? (
          <span className="billing-plan-card__badge billing-plan-card__badge--earlybird">
            <Zap size={11} fill="currentColor" style={{ display: 'inline', marginRight: 3 }} />
            EARLY BIRD
          </span>
        ) : (
          <span className="billing-plan-card__badge">Save 20%</span>
        )}
        <div style={{ paddingRight: 56 }}>
          {earlyBird ? (
            <>
              <p className="billing-plan-card__price">
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 400,
                    color: 'var(--text-muted)',
                    textDecoration: 'line-through',
                    marginRight: 6,
                  }}
                >
                  $290
                </span>
                $190
                <span
                  style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}
                >
                  /yr
                </span>
              </p>
              <p className="billing-plan-card__cadence" style={{ color: '#f59e0b', fontWeight: 600 }}>
                $15.83/mo billed annually
              </p>
              <p className="billing-plan-card__save" style={{ color: '#f59e0b' }}>
                Save $100/yr · Locked in forever
              </p>
            </>
          ) : (
            <>
              <p className="billing-plan-card__price">
                $290
                <span
                  style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}
                >
                  /yr
                </span>
              </p>
              <p className="billing-plan-card__cadence">$24/mo billed annually</p>
              <p className="billing-plan-card__save">Save $58 vs monthly</p>
            </>
          )}
        </div>
        <ul className="billing-features">
          {FEATURES.map((f) => (
            <li key={f}>
              <Check size={13} className="billing-features__icon" />
              {f}
            </li>
          ))}
        </ul>
        <button
          className="btn-accent"
          style={{ padding: '10px 0', marginTop: 'auto' }}
          onClick={() => onSelect('annual')}
          disabled={loadingPlan !== null}
        >
          {loadingPlan === 'annual'
            ? 'Redirecting…'
            : earlyBird
            ? 'Claim Early Bird — Annual ($190/yr) →'
            : 'Choose Annual — Best Value'}
        </button>
      </div>

      {/* Monthly */}
      <div className="billing-plan-card">
        <div>
          {earlyBird ? (
            <>
              <p className="billing-plan-card__price">
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 400,
                    color: 'var(--text-muted)',
                    textDecoration: 'line-through',
                    marginRight: 6,
                  }}
                >
                  $29
                </span>
                $19
                <span
                  style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}
                >
                  /mo
                </span>
              </p>
              <p className="billing-plan-card__cadence" style={{ color: '#f59e0b', fontWeight: 600 }}>
                Early bird price · locked in forever
              </p>
              <p className="billing-plan-card__save" style={{ color: 'var(--text-muted)' }}>
                or save even more with annual ($190/yr)
              </p>
            </>
          ) : (
            <>
              <p className="billing-plan-card__price">
                $29
                <span
                  style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}
                >
                  /mo
                </span>
              </p>
              <p className="billing-plan-card__cadence">Billed monthly</p>
              <p className="billing-plan-card__save" style={{ color: 'var(--text-muted)' }}>
                or save 20% annually
              </p>
            </>
          )}
        </div>
        <ul className="billing-features">
          {FEATURES.map((f) => (
            <li key={f}>
              <Check size={13} className="billing-features__icon" />
              {f}
            </li>
          ))}
        </ul>
        <button
          className="btn-ghost"
          style={{ padding: '10px 0', marginTop: 'auto' }}
          onClick={() => onSelect('monthly')}
          disabled={loadingPlan !== null}
        >
          {loadingPlan === 'monthly'
            ? 'Redirecting…'
            : earlyBird
            ? 'Choose Monthly ($19/mo) →'
            : 'Choose Monthly'}
        </button>
      </div>

      {earlyBird && (
        <p
          style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--text-muted)',
            marginTop: -4,
          }}
        >
          Discount stays as long as your subscription stays active. Never increases.
        </p>
      )}
    </div>
  );
}
