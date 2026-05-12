'use client';

import { useEffect, useRef, useState } from 'react';
import type { CustomerRow } from './CustomersClient';
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

type FormKey = keyof typeof EMPTY;
type FieldErrors = Partial<Record<FormKey, string>>;

const FIELD_ORDER: FormKey[] = ['firstName', 'lastName', 'businessName', 'phone', 'email', 'address'];

export default function AddCustomerModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FormKey, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const fieldRefs = useRef<Partial<Record<FormKey, HTMLInputElement | null>>>({});

  useEffect(() => {
    if (open) setTimeout(() => firstRef.current?.focus(), 320);
  }, [open]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  function set(field: FormKey) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      if (field === 'phone') {
        value = formatPhoneAsYouType(sanitizePhone(value));
      } else if (field === 'firstName' || field === 'lastName') {
        value = sanitizeName(value);
      }
      setForm((prev) => ({ ...prev, [field]: value }));
      if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  function markTouched(field: FormKey) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function reset() {
    setForm(EMPTY);
    setFieldErrors({});
    setTouched({});
    setError(null);
  }

  function focusFirstError(errs: FieldErrors) {
    for (const field of FIELD_ORDER) {
      if (errs[field]) {
        fieldRefs.current[field]?.focus();
        break;
      }
    }
  }

  function validate(): boolean {
    setTouched({ firstName: true, lastName: true, businessName: true, phone: true, email: true, address: true });
    if (!form.firstName.trim() && !form.businessName.trim()) {
      setError('Please enter a first name or business name.');
      fieldRefs.current.firstName?.focus();
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
      focusFirstError(errs as FieldErrors);
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

  function inputProps(field: FormKey, ref?: React.Ref<HTMLInputElement>) {
    const id = `add-customer-${field}`;
    const errId = `add-customer-${field}-err`;
    const hasErr = touched[field] && !!fieldErrors[field];
    return {
      id,
      'aria-invalid': hasErr ? (true as const) : undefined,
      'aria-describedby': fieldErrors[field] ? errId : undefined,
      className: `input-field${hasErr ? ' input-field--error' : ''}`,
      ref: (el: HTMLInputElement | null) => {
        fieldRefs.current[field] = el;
        if (ref && typeof ref === 'function') ref(el);
        else if (ref && 'current' in ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
      },
    };
  }

  return (
    <>
      <div
        className={`add-customer-backdrop${open ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`add-customer-sheet${open ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Add new customer"
      >
        <div className="add-customer-handle" aria-hidden />
        <h2 className="add-customer-title">New Customer</h2>

        <form onSubmit={handleSubmit} noValidate className="add-customer-form">
          <div>
            <input
              {...inputProps('firstName', firstRef)}
              type="text"
              placeholder="First name *"
              value={form.firstName}
              onChange={set('firstName')}
              onBlur={() => markTouched('firstName')}
              autoComplete="given-name"
              maxLength={100}
              disabled={loading}
            />
            {touched.firstName && fieldErrors.firstName && (
              <p id="add-customer-firstName-err" className="field-error" role="alert">
                {fieldErrors.firstName}
              </p>
            )}
          </div>

          <div>
            <input
              {...inputProps('lastName')}
              type="text"
              placeholder="Last name"
              value={form.lastName}
              onChange={set('lastName')}
              onBlur={() => markTouched('lastName')}
              autoComplete="family-name"
              maxLength={100}
              disabled={loading}
            />
            {touched.lastName && fieldErrors.lastName && (
              <p id="add-customer-lastName-err" className="field-error" role="alert">
                {fieldErrors.lastName}
              </p>
            )}
          </div>

          <div>
            <input
              {...inputProps('businessName')}
              type="text"
              placeholder="Business name"
              value={form.businessName}
              onChange={set('businessName')}
              onBlur={() => markTouched('businessName')}
              autoComplete="organization"
              maxLength={100}
              disabled={loading}
            />
            {touched.businessName && fieldErrors.businessName && (
              <p id="add-customer-businessName-err" className="field-error" role="alert">
                {fieldErrors.businessName}
              </p>
            )}
          </div>

          <div>
            <input
              {...inputProps('phone')}
              type="tel"
              placeholder="Phone — like (555) 123-4567"
              value={form.phone}
              onChange={set('phone')}
              onBlur={() => markTouched('phone')}
              autoComplete="tel"
              maxLength={25}
              inputMode="tel"
              disabled={loading}
            />
            {touched.phone && fieldErrors.phone && (
              <p id="add-customer-phone-err" className="field-error" role="alert">
                {fieldErrors.phone}
              </p>
            )}
          </div>

          <div>
            <input
              {...inputProps('email')}
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={set('email')}
              onBlur={() => markTouched('email')}
              autoComplete="email"
              maxLength={254}
              inputMode="email"
              disabled={loading}
            />
            {touched.email && fieldErrors.email && (
              <p id="add-customer-email-err" className="field-error" role="alert">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <input
            id="add-customer-address"
            className="input-field"
            type="text"
            placeholder="Address"
            value={form.address}
            onChange={set('address')}
            onBlur={() => markTouched('address')}
            autoComplete="street-address"
            maxLength={500}
            disabled={loading}
            ref={(el) => { fieldRefs.current.address = el; }}
          />
          {touched.address && fieldErrors.address && (
            <p id="add-customer-address-err" className="field-error" role="alert">
              {fieldErrors.address}
            </p>
          )}

          {error && <p className="add-customer-error" role="alert">{error}</p>}

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
