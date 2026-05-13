"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { track } from "@vercel/analytics";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

function UTMCaptureInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const captured: Record<string, string> = {};
    for (const key of UTM_KEYS) {
      const val = searchParams.get(key);
      if (val) captured[key] = val;
    }

    const hasUtm = Object.keys(captured).length > 0;

    captured.referrer = document.referrer || "";
    captured.landedAt = new Date().toISOString();

    try {
      // Always persist landing info; only overwrite UTM if params are present
      const existing = sessionStorage.getItem("vf_utm");
      if (hasUtm || !existing) {
        sessionStorage.setItem("vf_utm", JSON.stringify(captured));
      }
    } catch {
      // sessionStorage unavailable (private mode, etc.) — silently skip
    }

    track("landing_page_viewed", {
      utm_source: captured.utm_source ?? "(none)",
      utm_medium: captured.utm_medium ?? "(none)",
      utm_campaign: captured.utm_campaign ?? "(none)",
    });
  }, [searchParams]);

  return null;
}

export default function UTMCapture() {
  return (
    <Suspense fallback={null}>
      <UTMCaptureInner />
    </Suspense>
  );
}
