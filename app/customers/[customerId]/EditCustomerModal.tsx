'use client';

import { useEffect, useRef, useState } from 'react';
import type { CustomerData } from './CustomerDetailClient';

interface Props {
  customer: CustomerData;
  onSaved: (customer: CustomerData) => void;
  onClose: () => void;
}

export default function EditCustomerModal({ customer, onSaved, onClose }: Props) {
  const [form, setForm] = useState({
    firstName: customer.firstName ?? '',
    lastName: customer.lastName ?? '',
    businessName: customer.businessName ?? '',
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    address: customer.address ?? '',
    city: customer.city ?? '',
    state: customer.state ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => firstRef.current?.focus(), 320);
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
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
      const res = await fetch(`/api/customers/${customer._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = (await res.json().catch(() => null)) as
        | { customer?: CustomerData; error?: string }
        | null;
      if (!res.ok || !json?.customer) {
        throw new Error(json?.error ?? 'Failed to save changes');
      }
      onSaved(json.customer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="add-customer-backdrop open" onClick={onClose} aria-hidden />
      <div
        className="add-customer-sheet open"
        role="dialog"
        aria-modal="true"
        aria-label="Edit customer"
      >
        <div className="add-customer-handle" aria-hidden />
        <h2 className="add-customer-title">Edit Customer</h2>
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
          <input
            className="input-field"
            type="text"
            placeholder="City"
            value={form.city}
            onChange={set('city')}
            autoComplete="address-level2"
            disabled={loading}
          />
          <input
            className="input-field"
            type="text"
            placeholder="State"
            value={form.state}
            onChange={set('state')}
            autoComplete="address-level1"
            disabled={loading}
          />
          {error && <p className="add-customer-error">{error}</p>}
          <button type="submit" className="btn-accent add-customer-submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </>
  );
}
