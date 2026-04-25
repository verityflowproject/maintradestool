'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Users, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { initials, pickColor } from '@/lib/utils/customerAvatar';
import AddCustomerModal from './AddCustomerModal';

// ── Types ──────────────────────────────────────────────────────────────

export interface CustomerRow {
  _id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  jobCount?: number;
  totalBilled?: number;
}

interface Props {
  initial: CustomerRow[];
}

function formatAddress(c: CustomerRow): string {
  if (c.city && c.state) return `${c.city}, ${c.state}`;
  return c.address ?? '';
}

// ── CustomerCard ───────────────────────────────────────────────────────

function CustomerCard({ c }: { c: CustomerRow }) {
  return (
    <Link href={`/customers/${c._id}`} className="glass-card customer-card">
      <div
        className="customer-avatar"
        style={{ background: pickColor(c.fullName) }}
        aria-hidden
      >
        {initials(c)}
      </div>

      <div className="customer-card__center">
        <span className="customer-card__name">{c.fullName}</span>
        {c.phone && (
          <span className="customer-card__phone">{c.phone}</span>
        )}
        <span className="customer-card__addr">{formatAddress(c)}</span>
      </div>

      <div className="customer-card__stats">
        <span className="customer-card__billed">
          {formatCurrency(c.totalBilled ?? 0)}
        </span>
        <span className="customer-card__jobs">
          {c.jobCount ?? 0} {(c.jobCount ?? 0) === 1 ? 'job' : 'jobs'}
        </span>
      </div>
    </Link>
  );
}

// ── Main client component ──────────────────────────────────────────────

export default function CustomersClient({ initial }: Props) {
  const [customers, setCustomers] = useState<CustomerRow[]>(initial);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter((c) => {
      return (
        c.fullName.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.address ?? '').toLowerCase().includes(q) ||
        (c.city ?? '').toLowerCase().includes(q) ||
        (c.state ?? '').toLowerCase().includes(q)
      );
    });
  }, [customers, search]);

  function handleCreated(c: CustomerRow) {
    setCustomers((prev) => [c, ...prev]);
  }

  return (
    <main className="customers-page">
      {/* ── Header ── */}
      <header className="customers-header">
        <div className="customers-header__left">
          <h1 className="customers-title">Customers</h1>
          <span className="customer-count-badge">
            {customers.length} total
          </span>
        </div>
        <button
          className="btn-ghost add-customer-btn"
          onClick={() => setModalOpen(true)}
          aria-label="Add a new customer"
        >
          <Plus size={15} />
          Add Customer
        </button>
      </header>

      {/* ── Search ── */}
      <div className="customers-search">
        <Search className="customers-search__icon" size={16} aria-hidden />
        <input
          className="input-field customers-search__input"
          type="search"
          placeholder="Search by name, phone, or address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search customers"
        />
        {search && (
          <button
            className="customers-search__clear"
            onClick={() => setSearch('')}
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {customers.length === 0 ? (
        <div className="customers-empty glass-card">
          <Users size={48} className="customers-empty__icon" aria-hidden />
          <span className="customers-empty__heading">No customers yet.</span>
          <p className="customers-empty__sub">
            Customers are created automatically when you log a job.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="customers-no-results">No customers match your search.</p>
      ) : (
        <div className="customers-list">
          {filtered.map((c) => (
            <CustomerCard key={c._id} c={c} />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      <AddCustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </main>
  );
}
