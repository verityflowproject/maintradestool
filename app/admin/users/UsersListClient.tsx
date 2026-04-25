"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TRADES } from "@/lib/constants";

interface AdminUser {
  _id: string;
  email: string;
  firstName?: string;
  businessName?: string;
  trade?: string;
  plan?: string;
  subscriptionStatus?: string;
  createdAt: string;
  jobCount: number;
  invoiceCount: number;
  totalInvoiceVolume: number;
}

interface ListResponse {
  users: AdminUser[];
  totalCount: number;
  page: number;
  totalPages: number;
}

function getTradeInfo(id?: string) {
  return TRADES.find((t) => t.id === id) ?? { label: "Unknown", emoji: "🛠️" };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PlanBadge({ plan }: { plan?: string }) {
  const color =
    plan === "pro"
      ? "var(--accent-text)"
      : plan === "cancelled"
      ? "var(--danger)"
      : "var(--text-secondary)";
  return (
    <span
      style={{
        fontFamily: "var(--font-dm-sans)",
        fontSize: 11,
        color,
        background: "var(--bg-elevated)",
        border: `1px solid ${color}33`,
        borderRadius: 4,
        padding: "2px 7px",
        textTransform: "capitalize",
      }}
    >
      {plan ?? "trial"}
    </span>
  );
}

export default function UsersListClient() {
  const router = useRouter();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("all");
  const [page, setPage] = useState(1);
  const [jumpPage, setJumpPage] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        plan,
        page: String(page),
        limit: "50",
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [search, plan, page]);

  useEffect(() => { load(); }, [load]);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="admin-shell">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/admin"
          style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}
        >
          <ArrowLeft size={18} />
        </Link>
        <h1
          style={{
            fontFamily: "var(--font-syne)",
            fontWeight: 700,
            fontSize: 22,
            color: "var(--text-primary)",
            margin: 0,
            flex: 1,
          }}
        >
          Users
        </h1>
        {data && (
          <span
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            {data.totalCount} users
          </span>
        )}
      </div>

      {/* Filters */}
      <div
        className="glass-card"
        style={{
          padding: "12px 16px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <input
          className="input-field"
          style={{ flex: 1, minWidth: 240, padding: "10px 14px", fontSize: 14 }}
          placeholder="Search by email, name, or business..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          value={plan}
          onChange={(e) => { setPlan(e.target.value); setPage(1); }}
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--quartz-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-dm-sans)",
            fontSize: 14,
            padding: "10px 14px",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="all">All Plans</option>
          <option value="trial">Trial</option>
          <option value="pro">Pro</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--font-dm-sans)",
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--quartz-border)",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-syne)",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                {["User", "Email", "Trade", "Plan", "Activity", "Joined", ""].map(
                  (col) => (
                    <th
                      key={col}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading && !data?.users.length ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                    Loading…
                  </td>
                </tr>
              ) : data?.users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                    No users found
                  </td>
                </tr>
              ) : (
                data?.users.map((u) => {
                  const trade = getTradeInfo(u.trade);
                  return (
                    <tr
                      key={u._id}
                      onClick={() => router.push(`/admin/users/${u._id}`)}
                      style={{
                        cursor: "pointer",
                        borderBottom: "1px solid var(--quartz-border)",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLTableRowElement).style.background =
                          "rgba(255,255,255,0.03)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLTableRowElement).style.background = "")
                      }
                    >
                      <td style={{ padding: "12px 16px", maxWidth: 200 }}>
                        <p style={{ margin: 0, color: "var(--text-primary)", fontWeight: 500 }}>
                          {u.firstName ?? "—"}
                        </p>
                        {u.businessName && (
                          <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>
                            {u.businessName}
                          </p>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)", maxWidth: 200 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                          {u.email}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        {trade.emoji} {trade.label}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <PlanBadge plan={u.plan} />
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {u.jobCount} jobs · {u.invoiceCount} inv
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {formatDate(u.createdAt)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          className="btn-ghost"
                          onClick={(e) => { e.stopPropagation(); router.push(`/admin/users/${u._id}`); }}
                          style={{ padding: "6px 14px", fontSize: 12 }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginTop: 16,
            fontFamily: "var(--font-dm-sans)",
            fontSize: 13,
            color: "var(--text-secondary)",
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn-ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ padding: "6px 14px", fontSize: 12, opacity: page <= 1 ? 0.4 : 1 }}
          >
            Previous
          </button>
          <span>
            Page {data.page} of {data.totalPages}
          </span>
          <button
            className="btn-ghost"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{ padding: "6px 14px", fontSize: 12, opacity: page >= totalPages ? 0.4 : 1 }}
          >
            Next
          </button>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            Go to
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const n = parseInt(jumpPage, 10);
                  if (!isNaN(n)) { setPage(Math.min(totalPages, Math.max(1, n))); setJumpPage(""); }
                }
              }}
              style={{
                width: 56,
                background: "var(--bg-surface)",
                border: "1px solid var(--quartz-border)",
                borderRadius: 6,
                color: "var(--text-primary)",
                fontFamily: "var(--font-dm-sans)",
                fontSize: 13,
                padding: "4px 8px",
                outline: "none",
              }}
            />
          </span>
        </div>
      )}
    </div>
  );
}
