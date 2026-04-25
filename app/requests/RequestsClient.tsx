'use client';

import Link from 'next/link';
import { Inbox } from 'lucide-react';

export interface RequestRow {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  serviceNeeded: string;
  preferredDate: string;
  preferredTime: string;
  message: string;
  status: 'new' | 'viewed' | 'accepted' | 'declined';
  createdAt: string;
}

interface Props {
  initialRequests: RequestRow[];
}

const STATUS_LABEL: Record<RequestRow['status'], string> = {
  new: 'New',
  viewed: 'Viewed',
  accepted: 'Accepted',
  declined: 'Declined',
};

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export default function RequestsClient({ initialRequests }: Props) {
  return (
    <div className="requests-page page-padding">
      <div className="requests-page__header">
        <h1 className="requests-page__title">Requests</h1>
      </div>

      {initialRequests.length === 0 ? (
        <div className="requests-empty">
          <Inbox size={48} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <p className="requests-empty__heading">No requests yet</p>
          <p className="requests-empty__sub">
            Share your booking link to start receiving job requests.
          </p>
        </div>
      ) : (
        <div className="requests-list">
          {initialRequests.map((r) => (
            <Link key={r._id} href={`/requests/${r._id}`} className="request-card glass-card">
              <div className="request-card__top">
                <div>
                  <p className="request-card__name">{r.name}</p>
                  <p className="request-card__phone">{r.phone}</p>
                </div>
                <span
                  className="status-badge-request"
                  data-status={r.status}
                >
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
              <p className="request-card__body">{r.serviceNeeded}</p>
              <div className="request-card__meta">
                {r.preferredDate && <span>{r.preferredDate}</span>}
                <span>{DATE_FMT.format(new Date(r.createdAt))}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
