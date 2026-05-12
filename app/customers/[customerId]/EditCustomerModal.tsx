'use client';

import { useEffect, useRef, useState } from 'react';
import type { CustomerData } from './CustomerDetailClient';
import {
  sanitizePhone,
  sanitizeName,
  formatPhoneAsYouType,
  validatePhone,
  validateEmail,
  validatePersonName,
  validateBusinessName,
  validateAddress,
  collectErrors,
} from '@/lib/utils/validators';

interface Props {
  customer: CustomerData;
  onSaved: (customer: CustomerData) => void;
  onClose: () => void;
}

type FormState = {
  firstName: string;
  lastName: string;
  businessName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

export default function EditCustomerModal({ customer, onSaved, onClose }: Props) {
  const [form, setForm] = useState<FormState>({
    firstName: customer.firstName ?? '',
    lastName: customer.lastName ?? '',
    businessName: customer.businessName ?? '',
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    address: customer.address ?? '',
    city: customer.city ?? '',
    state: customer.state ?? '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      if (field === 'phone') value = formatPhoneAsYouType(sanitizePhone(value));
      if (field === 'firstName' || field === 'lastName') value = sanitizeName(value);
      setForm((prev) => ({ ...prev, [field]: value }));
      if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  function validate(): boolean {
    if (!form.firstName.trim() && !form.businessName.trim()) {
      setError('Please enter a first name or business name.');
      firstRef.current?.focus();
      return false;
    }
    const errs = collectErrors({
      firstName: validatePersonName(form.firstName, 'First name'),
      lastName: validatePersonName(form.lastName, 'Last name'),
      businessName: validateBusinessName(form.businessName),
      phone: validatePhone(form.phone),
      email: validateEmail(form.email),
      address: validateAddress(form.address),
    });
    if (errs) {
      setFieldErrors(errs as FieldErrors);
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);
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

          <div>
            <input
              ref={firstRef}
              id="edit-customer-firstName"
              aria-invalid={!!fieldErrors.firstName || undefined}
              aria-describedby={fieldErrors.firstName ? 'edit-customer-firstName-err' : undefined}
              className={`input-field${fieldErrors.firstName ? ' input-field--error' : ''}`}
              type="text"
              placeholder="First name *"
              value={form.firstName}
              onChange={set('firstName')}
              autoComplete="given-name"
              maxLength={100}
              disabled={loading}
            />
            {fieldErrors.firstName && (
              <p id="edit-customer-firstName-err" className="field-error" role="alert">
                {fieldErrors.firstName}
              </p>
            )}
          </div>

          <div>
            <input
              id="edit-customer-lastName"
              aria-invalid={!!fieldErrors.lastName || undefined}
              aria-describedby={fieldErrors.lastName ? 'edit-customer-lastName-err' : undefined}
              className={`input-field${fieldErrors.lastName ? ' input-field--error' : ''}`}
              type="text"
              placeholder="Last name"
              value={form.lastName}
              onChange={set('lastName')}
              autoComplete="family-name"
              maxLength={100}
              disabled={loading}
            />
            {fieldErrors.lastName && (
              <p id="edit-customer-lastName-err" className="field-error" role="alert">
                {fieldErrors.lastName}
              </p>
            )}
          </div>

          <div>
            <input
              id="edit-customer-businessName"
              aria-invalid={!!fieldErrors.businessName || undefined}
              aria-describedby={fieldErrors.businessName ? 'edit-customer-businessName-err' : undefined}
              className={`input-field${fieldErrors.businessName ? ' input-field--error' : ''}`}
              type="text"
              placeholder="Business name"
              value={form.businessName}
              onChange={set('businessName')}
              autoComplete="organization"
              maxLength={100}
              disabled={loading}
            />
            {fieldErrors.businessName && (
              <p id="edit-customer-businessName-err" className="field-error" role="alert">
                {fieldErrors.businessName}
              </p>
            )}
          </div>

          <div>
            <input
              id="edit-customer-phone"
              aria-invalid={!!fieldErrors.phone || undefined}
              aria-describedby={fieldErrors.phone ? 'edit-customer-phone-err' : undefined}
              className={`input-field${fieldErrors.phone ? ' input-field--error' : ''}`}
              type="tel"
              placeholder="Phone — like (555) 123-4567"
              value={form.phone}
              onChange={set('phone')}
              autoComplete="tel"
              maxLength={25}
              inputMode="tel"
              disabled={loading}
            />
            {fieldErrors.phone && (
              <p id="edit-customer-phone-err" className="field-error" role="alert">
                {fieldErrors.phone}
              </p>
            )}
          </div>

          <div>
            <input
              id="edit-customer-email"
              aria-invalid={!!fieldErrors.email || undefined}
              aria-describedby={fieldErrors.email ? 'edit-customer-email-err' : undefined}
              className={`input-field${fieldErrors.email ? ' input-field--error' : ''}`}
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
              maxLength={254}
              inputMode="email"
              disabled={loading}
            />
            {fieldErrors.email && (
              <p id="edit-customer-email-err" className="field-error" role="alert">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <input
            className="input-field"
            type="text"
            placeholder="Address"
            value={form.address}
            onChange={set('address')}
            autoComplete="street-address"
            maxLength={500}
            disabled={loading}
          />

          <input
            className="input-field"
            type="text"
            placeholder="City"
            value={form.city}
            onChange={set('city')}
            autoComplete="address-level2"
            maxLength={100}
            disabled={loading}
          />

          <input
            className="input-field"
            type="text"
            placeholder="State"
            value={form.state}
            onChange={set('state')}
            autoComplete="address-level1"
            maxLength={100}
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
