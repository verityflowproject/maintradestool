"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--bg-void)",
        gap: 16,
        textAlign: "center",
      }}
    >
      <AlertCircle size={40} color="var(--amber-400)" strokeWidth={1.5} />

      <h1
        style={{
          fontFamily: "var(--font-syne)",
          fontWeight: 700,
          fontSize: 20,
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        Something went wrong
      </h1>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <button className="btn-accent" onClick={reset}>
          Try again
        </button>
        <Link href="/dashboard" className="btn-ghost">
          Go home
        </Link>
      </div>
    </div>
  );
}
