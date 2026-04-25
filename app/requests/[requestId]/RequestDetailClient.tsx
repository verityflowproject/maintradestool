'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Phone, Mail, MapPin, Calendar, Clock, MessageSquare, Briefcase } from 'lucide-react';
import { useToast } from '@/components/Toast/ToastProvider';

type RequestStatus = 'new' | 'viewed' | 'accepted' | 'declined';

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
  const [loading, setLoading] = useState(false);

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

  const handleConvertToJob = useCallback(() => {
    const prefill = {
      name: initial.name,
      phone: initial.phone,
      email: initial.email,
      address: initial.address,
      serviceNeeded: initial.serviceNeeded,
    };
    sessionStorage.setItem('verityflow_prefill_customer', JSON.stringify(prefill));
    router.push('/jobs/new/voice');
  }, [initial, router]);

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
        {status !== 'accepted' && status !== 'declined' && (
          <>
            <button
              className="btn-success"
              onClick={() => patch('accepted')}
              disabled={loading}
            >
              Accept
            </button>
            <button
              className="btn-danger"
              onClick={() => patch('declined')}
              disabled={loading}
            >
              Decline
            </button>
          </>
        )}
        <button className="btn-secondary" onClick={handleConvertToJob}>
          <Briefcase size={15} />
          Convert to Job
        </button>
      </div>
    </div>
  );
}
