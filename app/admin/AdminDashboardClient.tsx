"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { TRADES } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignupPoint {
  date: string;
  count: number;
}

interface MrrPoint {
  date: string;
  mrr: number;
}

interface TopTrade {
  _id: string;
  count: number;
}

interface RecentSignup {
  _id: string;
  email: string;
  firstName?: string;
  businessName?: string;
  trade?: string;
  plan?: string;
  createdAt: string;
}

interface OverviewData {
  totalUsers: number;
  trialUsers: number;
  proUsers: number;
  churnedUsers: number;
  mrr: number;
  arr: number;
  signupsToday: number;
  signupsThisWeek: number;
  signupsThisMonth: number;
  conversionRate: number;
  totalJobs: number;
  totalInvoices: number;
  totalInvoiceVolume: number;
  signupsChart: SignupPoint[];
  mrrChart: MrrPoint[];
  topTrades: TopTrade[];
  recentSignups: RecentSignup[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(n: number): string {
  return n.toLocaleString("en-US");
}

function getTradeInfo(tradeId?: string) {
  const t = TRADES.find((t) => t.id === tradeId);
  return t ?? { label: "Unknown", emoji: "🛠️", color: "#9896A0" };
}

function getInitials(u: RecentSignup): string {
  if (u.firstName) return u.firstName.charAt(0).toUpperCase();
  return u.email.charAt(0).toUpperCase();
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 1) return `${Math.round(diffHours * 60)}m ago`;
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  if (diffHours < 48) return "Yesterday";
  return `${Math.floor(diffHours / 24)}d ago`;
}

function sliceChartData<T>(data: T[], period: "7d" | "30d" | "90d"): T[] {
  const n = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  return data.slice(-n);
}

function conversionColor(rate: number): string {
  if (rate >= 15) return "var(--success)";
  if (rate >= 5) return "var(--warning)";
  return "var(--danger)";
}

function formatXAxisDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function GlassTooltip({
  active,
  payload,
  label,
  isCurrency,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  isCurrency?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const display = isCurrency ? `$${formatMoney(val)}` : `${val} signups`;
  return (
    <div
      className="glass-card"
      style={{
        padding: "8px 12px",
        fontSize: 12,
        fontFamily: "var(--font-dm-sans)",
        color: "var(--text-primary)",
        border: "1px solid var(--quartz-border)",
      }}
    >
      <span style={{ color: "var(--text-muted)", marginRight: 6 }}>{label}</span>
      {display}
    </div>
  );
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({
  value,
  valueColor,
  label,
  sub,
}: {
  value: string;
  valueColor?: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="glass-card" style={{ padding: "20px 24px" }}>
      <p
        style={{
          fontFamily: "var(--font-jetbrains)",
          fontSize: 32,
          fontWeight: 400,
          color: valueColor ?? "var(--text-primary)",
          margin: 0,
          lineHeight: 1.1,
          letterSpacing: "-0.5px",
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontFamily: "var(--font-syne)",
          fontWeight: 600,
          fontSize: 11,
          color: "var(--text-muted)",
          margin: "8px 0 4px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: 12,
          color: "var(--text-secondary)",
          margin: 0,
        }}
      >
        {sub}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminDashboardClient({
  adminEmail,
}: {
  adminEmail: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [chartPeriod, setChartPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [locking, setLocking] = useState(false);

  const handleLock = useCallback(async () => {
    setLocking(true);
    try {
      await fetch('/api/admin/lock', { method: 'POST' });
      router.push('/dashboard');
      router.refresh();
    } finally {
      setLocking(false);
    }
  }, [router]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overview");
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
      setLastUpdatedAt(Date.now());
      setSecondsAgo(0);
    } catch {
      // silently ignore — will retry in 60s
    }
  }, []);

  // Initial load + 60s interval
  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  // Tick "X seconds ago"
  useEffect(() => {
    const id = setInterval(() => {
      if (lastUpdatedAt) {
        setSecondsAgo(Math.floor((Date.now() - lastUpdatedAt) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [lastUpdatedAt]);

  const signupData = data ? sliceChartData(data.signupsChart, chartPeriod) : [];
  const mrrData = data ? sliceChartData(data.mrrChart, chartPeriod) : [];
  const maxTradeCount = data?.topTrades[0]?.count ?? 1;

  return (
    <div className="admin-shell">
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-syne)",
            fontWeight: 700,
            fontSize: 20,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          VerityFlow Admin
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            {adminEmail}
          </span>
          {lastUpdatedAt && (
            <span
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              Updated {secondsAgo}s ago
            </span>
          )}
          <Link
            href="/dashboard"
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontSize: 13,
              color: "var(--accent-text)",
              textDecoration: "none",
            }}
          >
            Back to App →
          </Link>
          <button
            onClick={handleLock}
            disabled={locking}
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontSize: 12,
              color: "var(--text-muted)",
              background: "none",
              border: "1px solid var(--quartz-border)",
              borderRadius: 6,
              padding: "3px 10px",
              cursor: "pointer",
            }}
          >
            {locking ? "Locking…" : "Lock admin"}
          </button>
        </div>
      </div>

      {!data ? (
        <div
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-dm-sans)",
            fontSize: 14,
            paddingTop: 60,
            textAlign: "center",
          }}
        >
          Loading…
        </div>
      ) : (
        <>
          {/* ── Hero tiles ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <StatTile
              value={`$${formatMoney(data.mrr)}`}
              valueColor="var(--accent-text)"
              label="MRR"
              sub={`ARR: $${formatMoney(data.arr)}`}
            />
            <StatTile
              value={String(data.proUsers + data.trialUsers)}
              label="Active Users"
              sub={`${data.trialUsers} trialing · ${data.proUsers} paid`}
            />
            <StatTile
              value={String(data.signupsThisMonth)}
              label="New This Month"
              sub={`${data.signupsThisWeek} this week · ${data.signupsToday} today`}
            />
            <StatTile
              value={`${data.conversionRate.toFixed(1)}%`}
              valueColor={conversionColor(data.conversionRate)}
              label="Trial → Pro"
              sub={`${data.churnedUsers} churned`}
            />
          </div>

          {/* ── Charts row ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {/* Signups chart */}
            <div className="glass-card" style={{ padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-syne)",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "var(--text-primary)",
                  }}
                >
                  Signups
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["7d", "30d", "90d"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setChartPeriod(p)}
                      style={{
                        fontFamily: "var(--font-dm-sans)",
                        fontSize: 11,
                        padding: "3px 8px",
                        borderRadius: 4,
                        border: "1px solid var(--quartz-border)",
                        cursor: "pointer",
                        background:
                          chartPeriod === p
                            ? "var(--accent)"
                            : "var(--bg-glass)",
                        color:
                          chartPeriod === p
                            ? "#fff"
                            : "var(--text-muted)",
                        transition: "all 0.15s",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={signupData}>
                  <defs>
                    <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--quartz-border)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatXAxisDate}
                    tick={{ fontSize: 10, fill: "var(--text-muted)", fontFamily: "var(--font-dm-sans)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--text-muted)", fontFamily: "var(--font-dm-sans)" }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip content={<GlassTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fill="url(#signupGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* MRR chart */}
            <div className="glass-card" style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <span
                  style={{
                    fontFamily: "var(--font-syne)",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "var(--text-primary)",
                  }}
                >
                  MRR Growth
                </span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={mrrData}>
                  <defs>
                    <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-text)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent-text)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--quartz-border)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatXAxisDate}
                    tick={{ fontSize: 10, fill: "var(--text-muted)", fontFamily: "var(--font-dm-sans)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `$${v}`}
                    tick={{ fontSize: 10, fill: "var(--text-muted)", fontFamily: "var(--font-dm-sans)" }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip content={<GlassTooltip isCurrency />} />
                  <Area
                    type="monotone"
                    dataKey="mrr"
                    stroke="var(--accent-text)"
                    strokeWidth={2}
                    fill="url(#mrrGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Distribution + Recent signups row ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {/* Top trades */}
            <div className="glass-card" style={{ padding: 24 }}>
              <p
                style={{
                  fontFamily: "var(--font-syne)",
                  fontWeight: 600,
                  fontSize: 14,
                  color: "var(--text-primary)",
                  margin: "0 0 16px",
                }}
              >
                Top Trades
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {data.topTrades.map((t) => {
                  const info = getTradeInfo(t._id);
                  const barPct = (t.count / maxTradeCount) * 100;
                  return (
                    <div key={t._id ?? "unknown"}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-dm-sans)",
                            fontWeight: 500,
                            fontSize: 13,
                            color: "var(--text-primary)",
                          }}
                        >
                          {info.emoji} {info.label}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-jetbrains)",
                            fontSize: 13,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {t.count}
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: 4,
                          background: "var(--bg-elevated)",
                          borderRadius: 2,
                        }}
                      >
                        <div
                          style={{
                            width: `${barPct}%`,
                            height: "100%",
                            background: "var(--accent)",
                            borderRadius: 2,
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent signups */}
            <div className="glass-card" style={{ padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-syne)",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  Recent Signups
                </p>
                <Link
                  href="/admin/users"
                  style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontSize: 12,
                    color: "var(--accent-text)",
                    textDecoration: "none",
                  }}
                >
                  View All →
                </Link>
              </div>
              <div
                style={{
                  maxHeight: 400,
                  overflowY: "auto",
                }}
              >
                {data.recentSignups.map((u, idx) => {
                  const tradeInfo = getTradeInfo(u.trade);
                  return (
                    <Link
                      key={u._id}
                      href={`/admin/users/${u._id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 0",
                        borderBottom:
                          idx < data.recentSignups.length - 1
                            ? "1px solid var(--quartz-border)"
                            : "none",
                        textDecoration: "none",
                        cursor: "pointer",
                      }}
                    >
                      {/* Avatar */}
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: tradeInfo.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontFamily: "var(--font-syne)",
                          fontWeight: 700,
                          fontSize: 13,
                          color: "#0E0E16",
                        }}
                      >
                        {getInitials(u)}
                      </div>

                      {/* Name + trade */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontFamily: "var(--font-dm-sans)",
                            fontWeight: 500,
                            fontSize: 13,
                            color: "var(--text-primary)",
                            margin: 0,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {u.firstName ?? u.email}{" "}
                          {u.businessName && (
                            <span style={{ color: "var(--text-muted)" }}>
                              · {u.businessName}
                            </span>
                          )}
                        </p>
                        <p
                          style={{
                            fontFamily: "var(--font-dm-sans)",
                            fontSize: 11,
                            color: "var(--text-muted)",
                            margin: "2px 0 0",
                          }}
                        >
                          {tradeInfo.emoji}{" "}
                          <span
                            style={{
                              background: "var(--bg-elevated)",
                              border: "1px solid var(--quartz-border)",
                              borderRadius: 4,
                              padding: "1px 5px",
                              fontSize: 10,
                              color:
                                u.plan === "pro"
                                  ? "var(--accent-text)"
                                  : "var(--text-secondary)",
                            }}
                          >
                            {u.plan ?? "trial"}
                          </span>
                        </p>
                      </div>

                      {/* Time */}
                      <span
                        style={{
                          fontFamily: "var(--font-jetbrains)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                          flexShrink: 0,
                        }}
                      >
                        {relativeTime(u.createdAt)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Platform stats footer ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {[
              {
                value: formatMoney(data.totalJobs),
                label: "Jobs Logged (all-time)",
              },
              {
                value: formatMoney(data.totalInvoices),
                label: "Invoices Created (all-time)",
              },
              {
                value: `$${formatMoney(data.totalInvoiceVolume)}`,
                label: "Total Invoice Volume",
              },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="glass-card"
                style={{ padding: "16px 20px" }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-jetbrains)",
                    fontSize: 18,
                    color: "var(--text-secondary)",
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {value}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontSize: 10,
                    color: "var(--text-muted)",
                    margin: "4px 0 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
