'use client';

import { useEffect, useState } from 'react';
import JobForm from '@/app/jobs/new/JobForm';

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

interface JobValues {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
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
  internalNotes: string;
  status: string;
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
  mergeJobId?: string;
}

interface Props {
  jobId: string;
  jobValues: JobValues;
  defaultRate: number;
  defaultMarkup: number;
  fromVoice?: boolean;
}

function safeJobType(v: string | null | undefined): 'residential' | 'commercial' | 'other' {
  if (v === 'residential' || v === 'commercial' || v === 'other') return v;
  return 'residential';
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

export default function EditClient({ jobId, jobValues, defaultRate, defaultMarkup, fromVoice = false }: Props) {
  const [ready, setReady] = useState(false);
  const [initialValues, setInitialValues] = useState<Partial<FormState>>({});
  const [transcript, setTranscript] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [mergedInternalNotes, setMergedInternalNotes] = useState<string | null>(null);
  const [isAiParsed, setIsAiParsed] = useState(false);

  useEffect(() => {
    const base: Partial<FormState> = {
      customerId: jobValues.customerId,
      customerName: jobValues.customerName,
      customerPhone: jobValues.customerPhone,
      customerAddress: jobValues.customerAddress,
      customerEmail: '',
      title: jobValues.title,
      description: jobValues.description,
      jobType: jobValues.jobType,
      scheduledDate: jobValues.scheduledDate,
      scheduledStart: jobValues.scheduledStart,
      scheduledEnd: jobValues.scheduledEnd,
      laborHours: jobValues.laborHours,
      laborRate: jobValues.laborRate,
      parts: jobValues.parts,
      taxRate: jobValues.taxRate,
    };

    if (fromVoice) {
      let raw: string | null = null;
      try {
        raw = sessionStorage.getItem('verityflow_parsed_job');
        sessionStorage.removeItem('verityflow_parsed_job');
      } catch {
        // sessionStorage unavailable
      }

      if (raw) {
        let stored: StoredData = {};
        try {
          stored = JSON.parse(raw) as StoredData;
        } catch {
          stored = {};
        }

        // Only use this voice data if it was recorded for this specific job
        if (!stored.mergeJobId || stored.mergeJobId === jobId) {
          const parsed = stored.parsedJob ?? {};

          if (parsed.customerName) base.customerName = parsed.customerName;
          if (parsed.customerPhone) base.customerPhone = parsed.customerPhone;
          if (parsed.customerAddress) base.customerAddress = parsed.customerAddress;
          if (parsed.title) base.title = parsed.title;
          if (parsed.description) base.description = parsed.description;
          if (parsed.jobType) base.jobType = safeJobType(parsed.jobType);
          if (parsed.laborHours != null) base.laborHours = parsed.laborHours;
          if (parsed.laborRate != null) base.laborRate = parsed.laborRate;
          if (parsed.scheduledDate) base.scheduledDate = toISODateString(parsed.scheduledDate);
          if (parsed.parts && parsed.parts.length > 0) {
            base.parts = parsed.parts.map((p) => ({
              name: p.name ?? '',
              quantity: p.quantity ?? 1,
              unitCost: p.unitCost ?? 0,
              markup: p.markup ?? defaultMarkup,
            }));
          }

          setTranscript(stored.transcript ?? null);
          setConfidence(parsed.confidence ?? null);
          setMergedInternalNotes(parsed.internalNotes ?? null);
          setIsAiParsed(true);
        }
      }
    }

    setInitialValues(base);
    setReady(true);
    // intentionally run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return null;

  return (
    <JobForm
      editJobId={jobId}
      currentStatus={jobValues.status}
      defaultRate={defaultRate}
      defaultMarkup={defaultMarkup}
      initialValues={initialValues}
      transcript={transcript}
      aiParsed={isAiParsed}
      uncertainFields={new Set()}
      confidence={confidence}
      internalNotes={mergedInternalNotes ?? jobValues.internalNotes}
      pageTitle="Edit Job"
      backHref={`/jobs/${jobId}`}
    />
  );
}
