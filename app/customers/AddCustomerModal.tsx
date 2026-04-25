'use client';

import { useEffect, useRef, useState } from 'react';
import type { CustomerRow } from './CustomersClient';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: CustomerRow) => void;
}

const EMPTY = {
  firstName: '',
  lastName: '',
  businessName: '',
  phone: '',
  email: '',
  address: '',
};

export default function AddCustomerModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  // Focus first field when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => firstRef.current?.focus(), 320);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  function set(field: keyof typeof EMPTY) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function reset() {
    setForm(EMPTY);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() && !form.businessName.trim()) {
      setError('Please enter a first name or business name.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = (await res.json().catch(() => null)) as
        | { customer?: CustomerRow; error?: string }
        | null;
      if (!res.ok || !json?.customer) {
        throw new Error(json?.error ?? 'Failed to create customer');
      }
      onCreated(json.customer);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`add-customer-backdrop${open ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className={`add-customer-sheet${open ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Add new customer"
      >
        {/* Drag handle */}
        <div className="add-customer-handle" aria-hidden />

        <h2 className="add-customer-title">New Customer</h2>

        <form onSubmit={handleSubmit} noValidate className="add-customer-form">
          <input
            ref={firstRef}
            className="input-field"
            type="text"
            placeholder="First name *"
            value={form.firstName}
            onChange={set('firstName')}
            autoComplete="given-name"
            disabled={loading}
          />
          <input
            className="input-field"
            type="text"
            placeholder="Last name"
            value={form.lastName}
            onChange={set('lastName')}
            autoComplete="family-name"
            disabled={loading}
          />
          <input
            className="input-field"
            type="text"
            placeholder="Business name"
            value={form.businessName}
            onChange={set('businessName')}
            autoComplete="organization"
            disabled={loading}
          />
          <input
            className="input-field"
            type="tel"
            placeholder="Phone"
            value={form.phone}
            onChange={set('phone')}
            autoComplete="tel"
            disabled={loading}
          />
          <input
            className="input-field"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={set('email')}
            autoComplete="email"
            disabled={loading}
          />
          <input
            className="input-field"
            type="text"
            placeholder="Address"
            value={form.address}
            onChange={set('address')}
            autoComplete="street-address"
            disabled={loading}
          />

          {error && <p className="add-customer-error">{error}</p>}

          <button
            type="submit"
            className="btn-accent add-customer-submit"
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Save Customer'}
          </button>
        </form>
      </div>
    </>
  );
}
