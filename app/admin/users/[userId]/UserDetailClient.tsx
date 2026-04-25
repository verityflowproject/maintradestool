"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { TRADES } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DetailUser {
  _id: string;
  email: string;
  firstName?: string;
  businessName?: string;
  trade?: string;
  plan?: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  trialEndsAt?: string;
  createdAt: string;
}

interface Job {
  _id: string;
  title?: string;
  status?: string;
  total?: number;
  createdAt: string;
  customerName?: string;
}

interface Invoice {
  _id: string;
  invoiceNumber?: string;
  status?: string;
  total?: number;
  createdAt: string;
  customerName?: string;
}

interface Customer {
  _id: string;
  fullName?: string;
  email?: string;
  createdAt: string;
}

interface BookingRequest {
  _id: string;
  name?: string;
  email?: string;
  status?: string;
  createdAt: string;
}

interface ActivityLog {
  _id: string;
  adminEmail: string;
  action: string;
  changes?: Record<string, unknown>;
  reason?: string;
  createdAt: string;
}

interface DetailData {
  user: DetailUser;
  jobCount: number;
  recentJobs: Job[];
  customerCount: number;
  recentCustomers: Customer[];
  invoiceCount: number;
  recentInvoices: Invoice[];
  totalInvoiceVolume: number;
  bookingCount: number;
  recentBookings: BookingRequest[];
  activityLog: ActivityLog[];
}

type TabKey = "overview" | "jobs" | "customers" | "invoices" | "bookings" | "activity";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTradeInfo(id?: string) {
  return TRADES.find((t) => t.id === id) ?? { label: "Unknown", emoji: "🛠️", color: "#9896A0" };
}

function getInitials(u: DetailUser) {
  if (u.firstName) return u.firstName.charAt(0).toUpperCase();
  return u.email.charAt(0).toUpperCase();
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatMoney(n?: number) {
  if (n == null) return "$0";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function accountAgeDays(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}

function PlanBadge({ plan }: { plan?: string }) {
  const color =
    plan === "pro" ? "var(--accent-text)" :
    plan === "cancelled" ? "var(--danger)" : "var(--text-secondary)";
  return (
    <span style={{
      fontFamily: "var(--font-dm-sans)", fontSize: 11, color,
      background: "var(--bg-elevated)", border: `1px solid ${color}33`,
      borderRadius: 4, padding: "2px 7px", textTransform: "capitalize",
    }}>
      {plan ?? "trial"}
    </span>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div
        className="signin-backdrop"
        style={{ display: "block" }}
        onClick={onClose}
      />
      <div className="signin-sheet open" style={{ padding: 24, maxWidth: 460, left: "50%", transform: "translateX(-50%)" }}>
        <h2 style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 18, margin: "0 0 20px", color: "var(--text-primary)" }}>
          {title}
        </h2>
        {children}
      </div>
    </>
  );
}

// ─── Extend Trial Modal ───────────────────────────────────────────────────────

function ExtendTrialModal({ open, onClose, user, onSuccess }: {
  open: boolean; onClose: () => void; user: DetailUser; onSuccess: () => void;
}) {
  const [days, setDays] = useState(14);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const currentEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : new Date();

  const submit = async () => {
    setLoading(true);
    const newEnd = new Date(currentEnd.getTime() + days * 86_400_000).toISOString();
    const res = await fetch(`/api/admin/users/${user._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trialEndsAt: newEnd, reason }),
    });
    setLoading(false);
    if (res.ok) { onSuccess(); onClose(); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Extend Trial">
      <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "var(--text-secondary)", margin: "0 0 16px" }}>
        Current trial ends: <strong>{formatDate(user.trialEndsAt)}</strong>
      </p>
      <label style={labelStyle}>Add days</label>
      <input
        type="number"
        min={1}
        max={365}
        value={days}
        onChange={(e) => setDays(parseInt(e.target.value) || 1)}
        className="input-field"
        style={{ marginBottom: 12 }}
      />
      <label style={labelStyle}>Reason (optional)</label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        className="input-field"
        style={{ resize: "vertical", marginBottom: 16 }}
      />
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn-accent" onClick={submit} disabled={loading} style={{ flex: 1 }}>
          {loading ? "Saving…" : "Extend Trial"}
        </button>
        <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
      </div>
    </Modal>
  );
}

// ─── Override Plan Modal ──────────────────────────────────────────────────────

function OverridePlanModal({ open, onClose, user, onSuccess }: {
  open: boolean; onClose: () => void; user: DetailUser; onSuccess: () => void;
}) {
  const [newPlan, setNewPlan] = useState(user.plan ?? "trial");
  const [subStatus, setSubStatus] = useState(user.subscriptionStatus ?? "active");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    const body: Record<string, string> = { plan: newPlan, reason };
    if (newPlan === "pro") body.subscriptionStatus = subStatus;
    const res = await fetch(`/api/admin/users/${user._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (res.ok) { onSuccess(); onClose(); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Override Plan">
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
        <AlertTriangle size={14} color="var(--warning)" />
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: 12, color: "var(--warning)", margin: 0 }}>
          This does not create a real Stripe subscription. Use for support/comp cases only.
        </p>
      </div>
      <label style={labelStyle}>Plan</label>
      <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)} style={selectStyle}>
        <option value="trial">Trial</option>
        <option value="pro">Pro</option>
        <option value="cancelled">Cancelled</option>
      </select>
      {newPlan === "pro" && (
        <>
          <label style={labelStyle}>Subscription Status</label>
          <select value={subStatus} onChange={(e) => setSubStatus(e.target.value)} style={selectStyle}>
            <option value="active">Active</option>
            <option value="past_due">Past Due</option>
            <option value="canceled">Canceled</option>
          </select>
        </>
      )}
      <label style={labelStyle}>Reason (required)</label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="Support case #, comp grant, etc."
        className="input-field"
        style={{ resize: "vertical", marginBottom: 16 }}
      />
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn-accent" onClick={submit} disabled={loading || !reason.trim()} style={{ flex: 1 }}>
          {loading ? "Saving…" : "Apply Override"}
        </button>
        <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
      </div>
    </Modal>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ open, onClose, user, onSuccess }: {
  open: boolean; onClose: () => void; user: DetailUser; onSuccess: () => void;
}) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (confirmEmail !== user.email) return;
    setLoading(true);
    const res = await fetch(`/api/admin/users/${user._id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setLoading(false);
    if (res.ok) { onSuccess(); onClose(); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Delete User">
      <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "var(--danger)", marginBottom: 16 }}>
        This permanently deletes <strong>{user.email}</strong> and all their jobs, customers, invoices, and booking requests. This cannot be undone.
      </p>
      <label style={labelStyle}>Type the user&apos;s email to confirm</label>
      <input
        type="text"
        value={confirmEmail}
        onChange={(e) => setConfirmEmail(e.target.value)}
        placeholder={user.email}
        className="input-field"
        style={{ marginBottom: 12 }}
      />
      <label style={labelStyle}>Reason (optional)</label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        className="input-field"
        style={{ resize: "vertical", marginBottom: 16 }}
      />
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={submit}
          disabled={loading || confirmEmail !== user.email}
          style={{
            flex: 1, background: "var(--danger)", color: "#fff",
            border: "none", borderRadius: "var(--radius-md)", padding: "12px 16px",
            fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 14,
            cursor: confirmEmail !== user.email ? "not-allowed" : "pointer",
            opacity: confirmEmail !== user.email ? 0.5 : 1,
          }}
        >
          {loading ? "Deleting…" : "Delete Permanently"}
        </button>
        <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
      </div>
    </Modal>
  );
}

// ─── Impersonate Confirm Modal ────────────────────────────────────────────────

function ImpersonateModal({ open, onClose, user }: {
  open: boolean; onClose: () => void; user: DetailUser;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/users/${user._id}/impersonate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      setLoading(false);
      setError("Failed to start impersonation.");
      return;
    }
    const json = await res.json();
    router.push(json.redirectTo);
    router.refresh();
  };

  return (
    <Modal open={open} onClose={onClose} title="Impersonate User">
      <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
        You will be signed in as <strong style={{ color: "var(--warning)" }}>{user.email}</strong> for up to 1 hour. A banner will remind you that you are impersonating.
      </p>
      <label style={labelStyle}>Reason (optional)</label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Debugging issue #123..."
        className="input-field"
        style={{ resize: "vertical", marginBottom: 16 }}
      />
      {error && <p style={{ color: "var(--danger)", fontSize: 12, marginBottom: 8 }}>{error}</p>}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={submit}
          disabled={loading}
          style={{
            flex: 1, background: "var(--warning)", color: "#0E0E16",
            border: "none", borderRadius: "var(--radius-md)", padding: "12px 16px",
            fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}
        >
          {loading ? "Starting…" : "Start Impersonation"}
        </button>
        <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
      </div>
    </Modal>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-syne)",
  fontWeight: 600,
  fontSize: 11,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  marginBottom: 6,
};

const selectStyle: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--quartz-border)",
  borderRadius: "var(--radius-md)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-dm-sans)",
  fontSize: 14,
  padding: "10px 14px",
  width: "100%",
  marginBottom: 12,
  outline: "none",
  cursor: "pointer",
};

// ─── Tab table ────────────────────────────────────────────────────────────────

function SimpleTable({ cols, rows }: { cols: string[]; rows: React.ReactNode[][] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-dm-sans)", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--quartz-border)" }}>
            {cols.map((c) => (
              <th key={c} style={{ padding: "8px 12px", textAlign: "left", fontFamily: "var(--font-syne)", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>No records</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--quartz-border)" }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function UserDetailClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showExtendTrial, setShowExtendTrial] = useState(false);
  const [showOverridePlan, setShowOverridePlan] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showImpersonate, setShowImpersonate] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${userId}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="admin-shell" style={{ textAlign: "center", paddingTop: 80, color: "var(--text-muted)", fontFamily: "var(--font-dm-sans)" }}>
        Loading…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="admin-shell" style={{ textAlign: "center", paddingTop: 80, color: "var(--danger)", fontFamily: "var(--font-dm-sans)" }}>
        User not found.
      </div>
    );
  }

  const { user } = data;
  const tradeInfo = getTradeInfo(user.trade);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "jobs", label: `Jobs (${data.jobCount})` },
    { key: "customers", label: `Customers (${data.customerCount})` },
    { key: "invoices", label: `Invoices (${data.invoiceCount})` },
    { key: "bookings", label: `Booking Requests (${data.bookingCount})` },
    { key: "activity", label: "Activity Log" },
  ];

  return (
    <div className="admin-shell">
      {/* Modals */}
      {showExtendTrial && (
        <ExtendTrialModal open user={user} onClose={() => setShowExtendTrial(false)} onSuccess={load} />
      )}
      {showOverridePlan && (
        <OverridePlanModal open user={user} onClose={() => setShowOverridePlan(false)} onSuccess={load} />
      )}
      {showDelete && (
        <DeleteConfirmModal open user={user} onClose={() => setShowDelete(false)} onSuccess={() => router.push("/admin/users")} />
      )}
      {showImpersonate && (
        <ImpersonateModal open user={user} onClose={() => setShowImpersonate(false)} />
      )}

      {/* Back */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <Link href="/admin/users" style={{ color: "var(--text-muted)", display: "flex" }}>
          <ArrowLeft size={18} />
        </Link>
        <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "var(--text-muted)" }}>Users</span>
      </div>

      {/* Top card */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%", background: tradeInfo.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 28, color: "#0E0E16",
            flexShrink: 0,
          }}>
            {getInitials(user)}
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 22, color: "var(--text-primary)", margin: "0 0 4px" }}>
              {user.firstName ?? "—"} {user.businessName ? `· ${user.businessName}` : ""}
            </h2>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "var(--text-secondary)", margin: "0 0 8px" }}>
              {user.email} · {tradeInfo.emoji} {tradeInfo.label}
            </p>
            <PlanBadge plan={user.plan} />
          </div>
          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
            <button
              onClick={() => setShowImpersonate(true)}
              style={{
                background: "rgba(251,191,36,0.12)", border: "1px solid var(--warning)",
                color: "var(--warning)", borderRadius: "var(--radius-md)", padding: "8px 14px",
                fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}
            >
              Impersonate
            </button>
            <button className="btn-ghost" onClick={() => setShowExtendTrial(true)} style={{ padding: "8px 14px", fontSize: 12 }}>
              Extend Trial
            </button>
            <button className="btn-ghost" onClick={() => setShowOverridePlan(true)} style={{ padding: "8px 14px", fontSize: 12 }}>
              Override Plan
            </button>
            <button
              onClick={() => setShowDelete(true)}
              style={{
                background: "rgba(248,113,113,0.1)", border: "1px solid var(--danger)",
                color: "var(--danger)", borderRadius: "var(--radius-md)", padding: "8px 14px",
                fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}
            >
              Delete User
            </button>
          </div>
        </div>
      </div>

      {/* Stats tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { value: String(data.jobCount), label: "Total Jobs" },
          { value: String(data.customerCount), label: "Total Customers" },
          { value: `${data.invoiceCount}`, label: "Invoices", sub: `${formatMoney(data.totalInvoiceVolume)} billed` },
          { value: `${accountAgeDays(user.createdAt)}d`, label: "Account Age" },
        ].map(({ value, label, sub }) => (
          <div key={label} className="glass-card" style={{ padding: "16px 20px" }}>
            <p style={{ fontFamily: "var(--font-jetbrains)", fontSize: 24, color: "var(--text-primary)", margin: 0, lineHeight: 1.2 }}>
              {value}
            </p>
            <p style={{ fontFamily: "var(--font-syne)", fontWeight: 600, fontSize: 10, color: "var(--text-muted)", margin: "6px 0 0", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {label}
            </p>
            {sub && <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, color: "var(--accent-text)", margin: "2px 0 0" }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--quartz-border)", marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              background: "none", border: "none",
              borderBottom: activeTab === key ? "2px solid var(--accent)" : "2px solid transparent",
              padding: "10px 16px",
              fontFamily: "var(--font-dm-sans)", fontSize: 13,
              color: activeTab === key ? "var(--text-primary)" : "var(--text-muted)",
              cursor: "pointer", fontWeight: activeTab === key ? 500 : 400,
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
        {activeTab === "overview" && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <p style={labelStyle}>Account Details</p>
                <dl style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "var(--text-secondary)" }}>
                  {[
                    ["Joined", formatDate(user.createdAt)],
                    ["Trial ends", formatDate(user.trialEndsAt)],
                    ["Sub status", user.subscriptionStatus ?? "—"],
                    ["Sub plan", user.subscriptionPlan ?? "—"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--quartz-border)", padding: "8px 0" }}>
                      <dt style={{ color: "var(--text-muted)" }}>{k}</dt>
                      <dd style={{ margin: 0 }}>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <p style={labelStyle}>Activity Summary</p>
                <dl style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "var(--text-secondary)" }}>
                  {[
                    ["Jobs logged", data.jobCount],
                    ["Customers", data.customerCount],
                    ["Invoices", data.invoiceCount],
                    ["Invoice volume", formatMoney(data.totalInvoiceVolume)],
                    ["Booking requests", data.bookingCount],
                  ].map(([k, v]) => (
                    <div key={k as string} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--quartz-border)", padding: "8px 0" }}>
                      <dt style={{ color: "var(--text-muted)" }}>{k}</dt>
                      <dd style={{ margin: 0, fontFamily: "var(--font-jetbrains)" }}>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        )}

        {activeTab === "jobs" && (
          <SimpleTable
            cols={["Title", "Status", "Total", "Date"]}
            rows={data.recentJobs.map((j) => [
              j.title ?? "Untitled",
              <span style={{ textTransform: "capitalize" }} key="s">{j.status}</span>,
              formatMoney(j.total),
              formatDate(j.createdAt),
            ])}
          />
        )}

        {activeTab === "customers" && (
          <SimpleTable
            cols={["Name", "Email", "Added"]}
            rows={data.recentCustomers.map((c) => [
              c.fullName ?? "—",
              c.email ?? "—",
              formatDate(c.createdAt),
            ])}
          />
        )}

        {activeTab === "invoices" && (
          <SimpleTable
            cols={["Invoice #", "Status", "Total", "Date"]}
            rows={data.recentInvoices.map((inv) => [
              inv.invoiceNumber ?? "—",
              <span style={{ textTransform: "capitalize" }} key="s">{inv.status}</span>,
              formatMoney(inv.total),
              formatDate(inv.createdAt),
            ])}
          />
        )}

        {activeTab === "bookings" && (
          <SimpleTable
            cols={["Name", "Email", "Status", "Date"]}
            rows={data.recentBookings.map((b) => [
              b.name ?? "—",
              b.email ?? "—",
              b.status ?? "—",
              formatDate(b.createdAt),
            ])}
          />
        )}

        {activeTab === "activity" && (
          <SimpleTable
            cols={["Action", "Admin", "Reason", "Date"]}
            rows={data.activityLog.map((a) => [
              <code key="a" style={{ fontFamily: "var(--font-jetbrains)", fontSize: 11, color: "var(--accent-text)" }}>{a.action}</code>,
              a.adminEmail,
              a.reason ?? "—",
              formatDate(a.createdAt),
            ])}
          />
        )}
      </div>
    </div>
  );
}
