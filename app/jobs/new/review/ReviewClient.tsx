'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import JobForm from '../JobForm';

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

interface ParsedJobRaw {
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  title?: string | null;
  description?: string | null;
  jobType?: string | null;
  laborHours?: number | null;
  laborRate?: number | null;
  parts?: Array<{
    name?: string;
    quantity?: number;
    unitCost?: number;
    markup?: number;
  }> | null;
  scheduledDate?: string | null;
  internalNotes?: string | null;
  confidence?: number | null;
}

interface StoredData {
  transcript?: string;
  parsedJob?: ParsedJobRaw;
}

interface Props {
  defaultRate: number;
  defaultMarkup: number;
}

function toISODateString(val: string | null | undefined): string {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function safeJobType(v: string | null | undefined): 'residential' | 'commercial' | 'other' {
  if (v === 'residential' || v === 'commercial' || v === 'other') return v;
  return 'residential';
}

function mapParsedToForm(
  parsed: ParsedJobRaw,
  defaultMarkup: number,
): Partial<FormState> {
  return {
    customerName: parsed.customerName ?? '',
    customerPhone: parsed.customerPhone ?? '',
    customerAddress: parsed.customerAddress ?? '',
    title: parsed.title ?? '',
    description: parsed.description ?? '',
    jobType: safeJobType(parsed.jobType),
    laborHours: parsed.laborHours ?? '',
    laborRate: parsed.laborRate ?? '',
    scheduledDate: toISODateString(parsed.scheduledDate),
    parts: (parsed.parts ?? []).map((p) => ({
      name: p.name ?? '',
      quantity: p.quantity ?? 1,
      unitCost: p.unitCost ?? 0,
      markup: p.markup ?? defaultMarkup,
    })),
  };
}

function buildUncertainFields(parsed: ParsedJobRaw): Set<keyof FormState> {
  const uncertain = new Set<keyof FormState>();
  const checks: Array<[keyof ParsedJobRaw, keyof FormState]> = [
    ['customerName', 'customerName'],
    ['customerPhone', 'customerPhone'],
    ['customerAddress', 'customerAddress'],
    ['title', 'title'],
    ['description', 'description'],
    ['laborHours', 'laborHours'],
    ['laborRate', 'laborRate'],
    ['scheduledDate', 'scheduledDate'],
  ];
  for (const [parsedKey, formKey] of checks) {
    if (parsed[parsedKey] === null || parsed[parsedKey] === undefined) {
      uncertain.add(formKey);
    }
  }
  return uncertain;
}

export default function ReviewClient({ defaultRate, defaultMarkup }: Props) {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [initialValues, setInitialValues] = useState<Partial<FormState>>({});
  const [transcript, setTranscript] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [internalNotes, setInternalNotes] = useState<string | null>(null);
  const [uncertainFields, setUncertainFields] = useState<Set<keyof FormState>>(new Set());

  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem('verityflow_parsed_job');
      sessionStorage.removeItem('verityflow_parsed_job');
    } catch {
      // sessionStorage unavailable
    }

    if (!raw) {
      router.replace('/jobs/new/voice');
      return;
    }

    let stored: StoredData;
    try {
      stored = JSON.parse(raw) as StoredData;
    } catch {
      router.replace('/jobs/new/voice');
      return;
    }

    const parsed = stored.parsedJob ?? {};

    let prefillRaw: string | null = null;
    try {
      prefillRaw = sessionStorage.getItem('verityflow_prefill_customer');
      sessionStorage.removeItem('verityflow_prefill_customer');
    } catch {
      // noop
    }

    const prefill = prefillRaw
      ? (JSON.parse(prefillRaw) as { _id: string; fullName: string; phone?: string; address?: string })
      : null;

    const base = mapParsedToForm(parsed, defaultMarkup);
    setInitialValues(
      prefill
        ? {
            ...base,
            customerId: prefill._id,
            customerName: prefill.fullName,
            customerPhone: prefill.phone ?? base.customerPhone,
            customerAddress: prefill.address ?? base.customerAddress,
          }
        : base,
    );
    setUncertainFields(buildUncertainFields(parsed));
    setTranscript(stored.transcript ?? null);
    setConfidence(parsed.confidence ?? null);
    setInternalNotes(parsed.internalNotes ?? null);
    setReady(true);
  }, [router, defaultMarkup]);

  if (!ready) return null;

  return (
    <JobForm
      defaultRate={defaultRate}
      defaultMarkup={defaultMarkup}
      initialValues={initialValues}
      transcript={transcript}
      aiParsed
      uncertainFields={uncertainFields}
      confidence={confidence}
      internalNotes={internalNotes}
      pageTitle="Review Job"
      backHref="/jobs/new/voice"
    />
  );
}
