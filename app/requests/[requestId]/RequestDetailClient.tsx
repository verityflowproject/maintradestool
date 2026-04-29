'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  MessageSquare,
  Briefcase,
  ArrowRight,
  Link as LinkIcon,
} from 'lucide-react';
import { useToast } from '@/components/Toast/ToastProvider';

type RequestStatus = 'new' | 'viewed' | 'accepted' | 'declined' | 'converted';

interface RequestDetail {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  serviceNeeded: string;
  preferredDate: string;
  preferredTime: string;
  message: string;
  status: RequestStatus;
  linkedJobId?: string | null;
  createdAt: string;
}

interface Props {
  request: RequestDetail;
}

const STATUS_LABEL: Record<RequestStatus, string> = {
  new: 'New',
  viewed: 'Viewed',
  accepted: 'Accepted',
  declined: 'Declined',
  converted: 'Converted',
};

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export default function RequestDetailClient({ request: initial }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<RequestStatus>(initial.status);
  const [linkedJobId, setLinkedJobId] = useState<string | null>(initial.linkedJobId ?? null);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);

  // Auto-mark viewed
  useEffect(() => {
    if (initial.status === 'new') {
      fetch(`/api/requests/${initial._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'viewed' }),
      }).catch(() => {});
      setStatus('viewed');
    }
  }, [initial._id, initial.status]);

  const patch = useCallback(
    async (newStatus: 'accepted' | 'declined') => {
      setLoading(true);
      try {
        const res = await fetch(`/api/requests/${initial._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
          setStatus(newStatus);
          toast.success(
            newStatus === 'accepted'
              ? 'Request accepted! Confirmation sent.'
              : 'Request declined.',
          );
        } else {
          toast.error('Failed to update request.');
        }
      } finally {
        setLoading(false);
      }
    },
    [initial._id, toast],
  );

  const handleConvertToJob = useCallback(async () => {
    if (converting) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/requests/${initial._id}/convert`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = (await res.json()) as { jobId: string };
        setStatus('converted');
        setLinkedJobId(data.jobId);
        toast.success('Job created! Redirecting…');
        router.push(`/jobs/${data.jobId}`);
      } else {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? 'Failed to convert request.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setConverting(false);
    }
  }, [initial._id, converting, toast, router]);

  return (
    <div className="request-detail page-padding">
      <div className="request-detail__header">
        <button className="icon-btn" onClick={() => router.back()} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <h1 className="request-detail__title">Request</h1>
        <span className="status-badge-request" data-status={status}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="glass-card request-detail__card">
        <div className="request-detail__row">
          <p className="request-detail__name">{initial.name}</p>
          <p className="request-detail__date">{DATE_FMT.format(new Date(initial.createdAt))}</p>
        </div>

        <div className="request-detail__contacts">
          {initial.phone && (
            <a href={`tel:${initial.phone}`} className="request-detail__contact">
              <Phone size={14} /> {initial.phone}
            </a>
          )}
          {initial.email && (
            <a href={`mailto:${initial.email}`} className="request-detail__contact">
              <Mail size={14} /> {initial.email}
            </a>
          )}
          {initial.address && (
            <span className="request-detail__contact">
              <MapPin size={14} /> {initial.address}
            </span>
          )}
        </div>

        <div className="request-detail__field">
          <p className="request-detail__field-label">What they need</p>
          <p className="request-detail__field-value">{initial.serviceNeeded}</p>
        </div>

        {(initial.preferredDate || initial.preferredTime) && (
          <div className="request-detail__field">
            <p className="request-detail__field-label">Preferred time</p>
            <div className="request-detail__contacts">
              {initial.preferredDate && (
                <span className="request-detail__contact">
                  <Calendar size={14} /> {initial.preferredDate}
                </span>
              )}
              {initial.preferredTime && (
                <span className="request-detail__contact">
                  <Clock size={14} /> {initial.preferredTime}
                </span>
              )}
            </div>
          </div>
        )}

        {initial.message && (
          <div className="request-detail__field">
            <p className="request-detail__field-label">Additional notes</p>
            <p className="request-detail__field-value">
              <MessageSquare size={13} style={{ marginRight: 4, opacity: 0.6 }} />
              {initial.message}
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="request-detail__actions">
        {status === 'converted' && linkedJobId ? (
          /* Converted — show link back to job */
          <button
            className="btn-accent"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={() => router.push(`/jobs/${linkedJobId}`)}
          >
            <LinkIcon size={15} />
            Job created · View job
            <ArrowRight size={15} />
          </button>
        ) : (
          <>
            {status !== 'accepted' && status !== 'declined' && (
              <>
                <button
                  className="btn-success"
                  onClick={() => patch('accepted')}
                  disabled={loading || converting}
                >
                  Accept
                </button>
                <button
                  className="btn-danger"
                  onClick={() => patch('declined')}
                  disabled={loading || converting}
                >
                  Decline
                </button>
              </>
            )}
            <button
              className="btn-secondary"
              onClick={handleConvertToJob}
              disabled={converting || loading}
            >
              <Briefcase size={15} />
              {converting ? 'Creating job…' : 'Convert to Job'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
