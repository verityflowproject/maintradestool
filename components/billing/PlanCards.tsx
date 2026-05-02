'use client';

import { Check } from 'lucide-react';

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
}

export default function PlanCards({ onSelect, loadingPlan = null }: Props) {
  return (
    <div className="billing-plan-grid">
      {/* Annual — shown first as the anchored default */}
      <div className="billing-plan-card billing-plan-card--featured">
        <span className="billing-plan-card__badge">Save 20%</span>
        <div style={{ paddingRight: 56 }}>
          <p className="billing-plan-card__price">
            $290
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>
              /yr
            </span>
          </p>
          <p className="billing-plan-card__cadence">$24/mo billed annually</p>
          <p className="billing-plan-card__save">Save $58 vs monthly</p>
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
          {loadingPlan === 'annual' ? 'Redirecting…' : 'Choose Annual — Best Value'}
        </button>
      </div>

      {/* Monthly */}
      <div className="billing-plan-card">
        <div>
          <p className="billing-plan-card__price">
            $29
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>
              /mo
            </span>
          </p>
          <p className="billing-plan-card__cadence">Billed monthly</p>
          <p className="billing-plan-card__save" style={{ color: 'var(--text-muted)' }}>
            or save 20% annually
          </p>
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
          {loadingPlan === 'monthly' ? 'Redirecting…' : 'Choose Monthly'}
        </button>
      </div>
    </div>
  );
}
