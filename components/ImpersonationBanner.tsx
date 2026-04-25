"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ImpersonationData } from "@/lib/admin/impersonation";

const ONE_HOUR_MS = 60 * 60 * 1000;

export default function ImpersonationBanner({ data }: { data: ImpersonationData }) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(Date.now() - data.startedAt);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - data.startedAt), 1000);
    return () => clearInterval(id);
  }, [data.startedAt]);

  const remaining = Math.max(0, ONE_HOUR_MS - elapsed);
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const countdown = `${minutes}m ${seconds}s`;

  const stop = async () => {
    setStopping(true);
    const res = await fetch("/api/admin/stop-impersonation", { method: "POST" });
    if (res.ok) {
      const json = await res.json();
      router.push(json.redirectTo);
      router.refresh();
    } else {
      setStopping(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        height: 36,
        background: "var(--warning)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        gap: 12,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: 13,
          fontWeight: 500,
          color: "#0E0E16",
        }}
      >
        ⚠ Impersonating{" "}
        <strong>{data.targetEmail}</strong>
        {" · "}
        <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: 12 }}>
          {countdown} remaining
        </span>
      </span>
      <button
        onClick={stop}
        disabled={stopping}
        style={{
          background: "rgba(0,0,0,0.15)",
          border: "1px solid rgba(0,0,0,0.2)",
          borderRadius: 6,
          color: "#0E0E16",
          fontFamily: "var(--font-syne)",
          fontWeight: 700,
          fontSize: 11,
          padding: "4px 10px",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {stopping ? "Stopping…" : "Stop Impersonation"}
      </button>
    </div>
  );
}
