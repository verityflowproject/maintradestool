'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronDown, ChevronUp, Trash2, Wand2 } from 'lucide-react';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useToast } from '@/components/Toast/ToastProvider';

interface JobPart {
  name: string;
  quantity: number | '';
  unitCost: number | '';
  markup: number | '';
}

interface FormState {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerEmail: string;
  createNewCustomer: boolean;
  title: string;
  description: string;
  jobType: 'residential' | 'commercial' | 'other';
  scheduledDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  laborHours: number | '';
  laborRate: number | '';
  parts: JobPart[];
  taxRate: number | '';
}

interface CustomerResult {
  _id: string;
  fullName: string;
  phone: string;
  address: string;
}

interface Props {
  defaultRate: number;
  defaultMarkup: number;
  initialValues?: Partial<FormState>;
  transcript?: string | null;
  aiParsed?: boolean;
  uncertainFields?: Set<keyof FormState>;
  confidence?: number | null;
  internalNotes?: string | null;
  pageTitle?: string;
  backHref?: string;
  /** When set, the form PATCHes an existing job instead of POSTing a new one */
  editJobId?: string;
  /** Current status of the job being edited — controls which buttons to show */
  currentStatus?: string;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcPartTotal(p: JobPart): number {
  const qty = Number(p.quantity) || 0;
  const cost = Number(p.unitCost) || 0;
  const markup = Number(p.markup) || 0;
  return +(cost * qty * (1 + markup / 100)).toFixed(2);
}

function inputCls(
  base: string,
  field: keyof FormState,
  uncertainFields?: Set<keyof FormState>,
  editedFields?: Set<string>,
): string {
  const warn =
    uncertainFields?.has(field) && !editedFields?.has(field as string)
      ? ' input-field--warn'
      : '';
  return `${base}${warn}`;
}

// ── Step header component ─────────────────────────────────────────────────────

function StepHeader({
  step,
  title,
  helper,
}: {
  step: number;
  title: string;
  helper?: string;
}) {
  return (
    <div className="job-form-step-header">
      <div className="job-form-step-badge">{step}</div>
      <div>
        <p className="job-form-step-title">{title}</p>
        {helper && <p className="job-form-step-helper">{helper}</p>}
      </div>
    </div>
  );
}

export default function JobForm({
  defaultRate,
  defaultMarkup,
  initialValues,
  transcript,
  aiParsed,
  uncertainFields,
  confidence,
  internalNotes,
  pageTitle = 'New Job',
  backHref = '/jobs',
  editJobId,
  currentStatus,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const baseDefaults: FormState = {
    customerId: null,
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    customerEmail: '',
    createNewCustomer: false,
    title: '',
    description: '',
    jobType: 'residential',
    scheduledDate: '',
    scheduledStart: '',
    scheduledEnd: '',
    laborHours: '',
    laborRate: defaultRate || '',
    parts: [],
    taxRate: '',
  };

  const [form, setForm] = useState<FormState>({ ...baseDefaults, ...initialValues });
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());

  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [showSchedule, setShowSchedule] = useState(!!(initialValues?.scheduledDate));
  const [customerQuery, setCustomerQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CustomerResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebouncedValue(customerQuery, 300);

  function markEdited(field: string) {
    setEditedFields((prev) => {
      if (prev.has(field)) return prev;
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  }

  // Customer search
  useEffect(() => {
    if (debouncedQuery.length < 1) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    fetch(`/api/customers/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((json: { results?: CustomerResult[] }) => {
        setSearchResults(json.results ?? []);
        setShowDropdown((json.results ?? []).length > 0);
      })
      .catch(() => {});
  }, [debouncedQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectCustomer(r: CustomerResult) {
    setForm((f) => ({
      ...f,
      customerId: r._id,
      customerName: r.fullName,
      customerPhone: r.phone,
      customerAddress: r.address,
    }));
    setCustomerQuery('');
    setShowDropdown(false);
  }

  function patchForm(patch: Partial<FormState>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function updatePart(index: number, patch: Partial<JobPart>) {
    setForm((f) => {
      const parts = f.parts.map((p, i) => (i === index ? { ...p, ...patch } : p));
      return { ...f, parts };
    });
  }

  function addPart() {
    setForm((f) => ({
      ...f,
      parts: [
        ...f.parts,
        { name: '', quantity: 1, unitCost: 0, markup: defaultMarkup },
      ],
    }));
  }

  function removePart(index: number) {
    setForm((f) => ({ ...f, parts: f.parts.filter((_, i) => i !== index) }));
  }

  // Live calculations
  const laborTotal = (Number(form.laborHours) || 0) * (Number(form.laborRate) || 0);
  const partsTotal = form.parts.reduce((sum, p) => sum + calcPartTotal(p), 0);
  const subtotal = +(laborTotal + partsTotal).toFixed(2);
  const taxRateNum = Number(form.taxRate) || 0;
  const taxTotal = +(subtotal * (taxRateNum / 100)).toFixed(2);
  const total = +(subtotal + taxTotal).toFixed(2);

  const shake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 400);
  }, []);

  async function handleSubmit(action: 'draft' | 'complete' | 'save') {
    if (!form.title.trim()) {
      setTitleError('Job title is required.');
      shake();
      return;
    }
    setTitleError('');
    setSubmitError('');
    setSubmitting(true);

    const effectiveStatus: string =
      action === 'save'
        ? (currentStatus ?? 'draft')
        : action;

    try {
      const payload = {
        customerId: form.customerId,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerAddress: form.customerAddress,
        customerEmail: form.customerEmail,
        createNewCustomer: newCustomerMode && !form.customerId,
        title: form.title,
        description: form.description,
        jobType: form.jobType,
        scheduledDate: form.scheduledDate,
        scheduledStart: form.scheduledStart,
        scheduledEnd: form.scheduledEnd,
        laborHours: Number(form.laborHours) || 0,
        laborRate: Number(form.laborRate) || 0,
        parts: form.parts.map((p) => ({
          name: p.name,
          quantity: Number(p.quantity) || 0,
          unitCost: Number(p.unitCost) || 0,
          markup: Number(p.markup) || 0,
        })),
        taxRate: Number(form.taxRate) || 0,
        status: effectiveStatus,
        aiParsed: !!aiParsed,
        voiceTranscript: transcript ?? null,
        internalNotes: internalNotes ?? '',
      };

      if (editJobId) {
        // ── Edit mode: PATCH existing job ──────────────────────────────
        const res = await fetch(`/api/jobs/${editJobId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json() as {
          success?: boolean;
          jobId?: string;
          error?: string;
          invoiceAction?: 'none' | 'reset' | 'updated';
        };

        if (res.ok && json.jobId) {
          if (json.invoiceAction === 'reset') {
            toast.info('Invoice was reset — regenerate when ready.');
          } else if (json.invoiceAction === 'updated') {
            toast.success('Job saved. Invoice totals updated.');
          }
          router.push(`/jobs/${json.jobId}`);
          router.refresh();
        } else {
          setSubmitError(json.error ?? 'Something went wrong. Please try again.');
        }
      } else {
        // ── Create mode: POST new job ──────────────────────────────────
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json() as { success?: boolean; jobId?: string; error?: string };

        if (res.status === 201 && json.jobId) {
          if (aiParsed && effectiveStatus === 'complete') {
            router.push(`/jobs/${json.jobId}/invoice`);
          } else {
            router.push(`/jobs/${json.jobId}`);
          }
        } else {
          setSubmitError(json.error ?? 'Something went wrong. Please try again.');
        }
      }
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const isLowConfidence = typeof confidence === 'number' && confidence < 0.6;
  const showWarnBanner = typeof confidence === 'number' && confidence < 0.8;

  return (
    <div className="job-form-wrapper">

      {/* ── Page header ── */}
      <header className="job-form-header">
        <button
          type="button"
          className="job-form-back"
          onClick={() => router.push(backHref)}
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="job-form-title">{pageTitle}</h1>
        {!aiParsed && (
          <button
            type="button"
            className="link-accent"
            style={{ marginLeft: 'auto' }}
            onClick={() =>
              router.push(editJobId ? `/jobs/${editJobId}/voice` : '/jobs/new/voice')
            }
          >
            Use voice
          </button>
        )}
      </header>

      {/* ── AI Banner + Transcript (review mode only) ── */}
      {transcript && (
        <div className="job-form-ai-section">
          <div className={`ai-banner glass-card${isLowConfidence ? ' ai-banner--warn' : ''}`}>
            <Wand2 size={16} color={isLowConfidence ? 'var(--warning)' : 'var(--accent)'} />
            <span>
              {isLowConfidence
                ? 'Low confidence parse — please review carefully.'
                : 'AI parsed your recording — review and edit anything below.'}
            </span>
          </div>
          <details className="ai-transcript-details">
            <summary className="ai-transcript-toggle">Show transcript ▾</summary>
            <textarea
              className="input-field ai-transcript-textarea"
              value={transcript}
              readOnly
            />
          </details>
        </div>
      )}

      {/* ══════════════════════════════════
          STEP 1 — Who's it for?
      ══════════════════════════════════ */}
      <section className="job-form-section">
        <StepHeader
          step={1}
          title="Who's it for?"
          helper="Search an existing customer or fill in their details."
        />

        {/* Customer search */}
        <div className="customer-search-wrap" ref={dropdownRef}>
          <input
            className="input-field job-form-customer-search"
            placeholder="Search existing customers…"
            value={customerQuery}
            onChange={(e) => setCustomerQuery(e.target.value)}
            autoComplete="off"
          />
          {showDropdown && (
            <div className="glass-card customer-search-results">
              {searchResults.map((r) => (
                <button
                  key={r._id}
                  type="button"
                  className="customer-result-row"
                  onClick={() => selectCustomer(r)}
                >
                  <span className="customer-result-name">{r.fullName}</span>
                  {r.phone && (
                    <span className="customer-result-meta">{r.phone}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Snapshot fields — in a card for visual grouping */}
        <div className="job-form-customer-card glass-card">
          <input
            className={inputCls('input-field job-form-customer-field', 'customerName', uncertainFields, editedFields)}
            placeholder="Full name  e.g. Mike Johnson"
            value={form.customerName}
            onChange={(e) => {
              patchForm({ customerName: e.target.value, customerId: null });
              markEdited('customerName');
            }}
          />
          <input
            className={inputCls('input-field job-form-customer-field', 'customerPhone', uncertainFields, editedFields)}
            type="tel"
            placeholder="Phone  e.g. 817-555-0192"
            value={form.customerPhone}
            onChange={(e) => {
              patchForm({ customerPhone: e.target.value, customerId: null });
              markEdited('customerPhone');
            }}
          />
          <input
            className={inputCls('input-field job-form-customer-field job-form-customer-field--last', 'customerAddress', uncertainFields, editedFields)}
            placeholder="Address  e.g. 123 Main St, Fort Worth"
            value={form.customerAddress}
            onChange={(e) => {
              patchForm({ customerAddress: e.target.value, customerId: null });
              markEdited('customerAddress');
            }}
          />
        </div>

        {/* New customer email toggle */}
        {!newCustomerMode ? (
          <button
            type="button"
            className="link-accent"
            onClick={() => {
              setNewCustomerMode(true);
              patchForm({ createNewCustomer: true, customerId: null });
            }}
          >
            + Save as new customer
          </button>
        ) : (
          <div className="new-customer-block">
            <p className="section-sublabel">New customer email (optional)</p>
            <input
              className="input-field"
              type="email"
              placeholder="email@example.com"
              value={form.customerEmail}
              onChange={(e) => patchForm({ customerEmail: e.target.value })}
            />
            <button
              type="button"
              className="link-accent"
              onClick={() => {
                setNewCustomerMode(false);
                patchForm({ createNewCustomer: false });
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════
          STEP 2 — What's the work?
      ══════════════════════════════════ */}
      <section className="job-form-section">
        <StepHeader
          step={2}
          title="What's the work?"
          helper="Title is required. Schedule is optional."
        />

        {/* Title — required, primary focus */}
        <input
          className={`${inputCls('input-field', 'title', uncertainFields, editedFields)}${titleError ? ' input-field--error' : ''}`}
          placeholder="Job title  e.g. Water heater replacement *"
          value={form.title}
          onChange={(e) => {
            patchForm({ title: e.target.value });
            markEdited('title');
            if (e.target.value.trim()) setTitleError('');
          }}
        />
        {titleError && <p className="field-error">{titleError}</p>}

        {/* Description */}
        <textarea
          className={`${inputCls('input-field', 'description', uncertainFields, editedFields)} job-textarea`}
          placeholder="What was done, what was found, any follow-up needed…"
          value={form.description}
          onChange={(e) => {
            patchForm({ description: e.target.value });
            markEdited('description');
          }}
        />

        {/* Job type pills */}
        <div>
          <p className="job-form-field-label">Job type</p>
          <div className="pill-group">
            {(['residential', 'commercial', 'other'] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={`btn-ghost pill${form.jobType === type ? ' selected' : ''}`}
                onClick={() => {
                  patchForm({ jobType: type });
                  markEdited('jobType');
                }}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule — collapsible sub-block inside this section */}
        <div className="job-form-schedule-block">
          <button
            type="button"
            className="job-form-schedule-toggle"
            onClick={() => {
              if (showSchedule) {
                setShowSchedule(false);
                patchForm({ scheduledDate: '', scheduledStart: '', scheduledEnd: '' });
              } else {
                setShowSchedule(true);
              }
            }}
          >
            <span>Date &amp; time</span>
            {showSchedule
              ? <ChevronUp size={16} />
              : <ChevronDown size={16} />}
          </button>

          {showSchedule && (
            <div className="schedule-fields" style={{ marginTop: 10 }}>
              <input
                className={inputCls('input-field', 'scheduledDate', uncertainFields, editedFields)}
                type="date"
                value={form.scheduledDate}
                onChange={(e) => {
                  patchForm({ scheduledDate: e.target.value });
                  markEdited('scheduledDate');
                }}
              />
              <div className="schedule-time-row">
                <input
                  className="input-field"
                  type="time"
                  placeholder="Start time"
                  value={form.scheduledStart}
                  onChange={(e) => patchForm({ scheduledStart: e.target.value })}
                />
                <input
                  className="input-field"
                  type="time"
                  placeholder="End time"
                  value={form.scheduledEnd}
                  onChange={(e) => patchForm({ scheduledEnd: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════
          STEP 3 — Pricing
      ══════════════════════════════════ */}
      <section className="job-form-section">
        <StepHeader
          step={3}
          title="Pricing"
          helper="Labour hours, rate, and any parts or materials used."
        />

        {/* Labor sub-block */}
        <div className="job-form-pricing-block glass-card">
          <p className="job-form-field-label" style={{ marginBottom: 8 }}>Labour</p>
          <div className="labor-row">
            <input
              className={inputCls('input-field', 'laborHours', uncertainFields, editedFields)}
              type="number"
              min={0}
              step={0.5}
              placeholder="Hours  e.g. 2.5"
              value={form.laborHours}
              onChange={(e) => {
                patchForm({ laborHours: e.target.value === '' ? '' : Number(e.target.value) });
                markEdited('laborHours');
              }}
            />
            <input
              className={inputCls('input-field', 'laborRate', uncertainFields, editedFields)}
              type="number"
              min={0}
              placeholder="Rate $"
              value={form.laborRate}
              onChange={(e) => {
                patchForm({ laborRate: e.target.value === '' ? '' : Number(e.target.value) });
                markEdited('laborRate');
              }}
            />
          </div>
          {laborTotal > 0 && (
            <p className="money-display" style={{ marginTop: 8 }}>
              Labour total: ${fmt(laborTotal)}
            </p>
          )}
        </div>

        {/* Parts sub-block */}
        <div>
          <p className="job-form-field-label">Parts &amp; materials</p>

          {form.parts.map((p, i) => (
            <div key={i} className="glass-card part-row">
              {/* Row 1: name full-width */}
              <input
                className="input-field part-name"
                placeholder="Part name"
                value={p.name}
                onChange={(e) => updatePart(i, { name: e.target.value })}
              />
              {/* Row 2: qty / cost / markup / total / remove */}
              <input
                className="input-field part-qty"
                type="number"
                min={0}
                placeholder="Qty"
                value={p.quantity}
                onChange={(e) =>
                  updatePart(i, { quantity: e.target.value === '' ? '' : Number(e.target.value) })
                }
              />
              <input
                className="input-field part-cost"
                type="number"
                min={0}
                placeholder="Cost $"
                value={p.unitCost}
                onChange={(e) =>
                  updatePart(i, { unitCost: e.target.value === '' ? '' : Number(e.target.value) })
                }
              />
              <input
                className="input-field part-markup"
                type="number"
                min={0}
                placeholder="Markup %"
                value={p.markup}
                onChange={(e) =>
                  updatePart(i, { markup: e.target.value === '' ? '' : Number(e.target.value) })
                }
              />
              <span className="money-display part-total">
                ${fmt(calcPartTotal(p))}
              </span>
              <button
                type="button"
                className="part-remove"
                onClick={() => removePart(i)}
                aria-label="Remove part"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <button
            type="button"
            className="btn-ghost add-part-btn"
            onClick={addPart}
          >
            + Add Part
          </button>

          {form.parts.length > 0 && partsTotal > 0 && (
            <p className="money-display" style={{ marginTop: 4 }}>
              Parts total: ${fmt(partsTotal)}
            </p>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════
          STEP 4 — Review & Save
      ══════════════════════════════════ */}
      <section className="job-form-section">
        <StepHeader
          step={4}
          title="Review &amp; save"
          helper="Set tax rate, check your total, then save."
        />

        <div className="glass-card totals-card">
          <div className="totals-row">
            <span className="totals-label">Subtotal</span>
            <span className="money-display">${fmt(subtotal)}</span>
          </div>
          <div className="totals-row">
            <span className="totals-label">Tax rate</span>
            <div className="tax-rate-input-wrap">
              <input
                className={`${inputCls('input-field', 'taxRate', uncertainFields, editedFields)} tax-input`}
                type="number"
                min={0}
                placeholder="0"
                value={form.taxRate}
                onChange={(e) => {
                  patchForm({ taxRate: e.target.value === '' ? '' : Number(e.target.value) });
                  markEdited('taxRate');
                }}
              />
              <span className="tax-suffix">%</span>
            </div>
          </div>
          <div className="totals-row">
            <span className="totals-label">Tax</span>
            <span className="money-display">${fmt(taxTotal)}</span>
          </div>
          <hr className="totals-divider" />
          <div className="totals-row">
            <span className="totals-label totals-label--total">Total</span>
            <span className="money-display money-display--total">${fmt(total)}</span>
          </div>
        </div>

        {/* Warnings */}
        {submitError && <p className="field-error">{submitError}</p>}
        {showWarnBanner && !isLowConfidence && (
          <p className="field-error" style={{ color: 'var(--warning)' }}>
            Some fields may need review — highlighted in amber above.
          </p>
        )}

        {/* Action buttons */}
        {editJobId ? (
          // ── Edit mode ─────────────────────────────────────────────────
          <div className="job-form-actions">
            <button
              type="button"
              className={`btn-accent${shaking ? ' shake' : ''}`}
              disabled={submitting}
              onClick={() => handleSubmit('save')}
            >
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
            {currentStatus === 'draft' && (
              <button
                type="button"
                className="job-form-draft-btn"
                disabled={submitting}
                onClick={() => handleSubmit('complete')}
              >
                {submitting ? 'Saving…' : 'Mark Complete'}
              </button>
            )}
          </div>
        ) : (
          // ── Create mode ───────────────────────────────────────────────
          <div className="job-form-actions">
            <button
              type="button"
              className={`btn-accent${shaking ? ' shake' : ''}`}
              disabled={submitting}
              onClick={() => handleSubmit('complete')}
            >
              {submitting ? 'Saving…' : aiParsed ? 'Save & Generate Invoice →' : 'Mark Complete'}
            </button>
            <button
              type="button"
              className="job-form-draft-btn"
              disabled={submitting}
              onClick={() => handleSubmit('draft')}
            >
              {submitting ? 'Saving…' : 'Save as draft'}
            </button>
          </div>
        )}
      </section>

      {/* ── Sticky running total chip ── */}
      {total > 0 && (
        <div className="job-form-sticky-total" aria-live="polite">
          <span className="job-form-sticky-total__label">Running total</span>
          <span className="job-form-sticky-total__amount">${fmt(total)}</span>
        </div>
      )}
    </div>
  );
}
