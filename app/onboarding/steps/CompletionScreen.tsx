"use client";

import { useRouter } from "next/navigation";
import { TRADES, TEAM_SIZES, PAIN_POINTS } from "@/lib/constants";
import type { OnboardingData } from "../types";

const TRADE_COPY: Record<string, string> = {
  plumber: "Your VerityFlow is wired up. Let's bury the paperwork.",
  electrician: "Fully wired. Time to run a tighter operation.",
  hvac: "All systems go. Your business just got smarter.",
  roofer: "Solid foundation. Let's get you organized.",
  carpenter: "Frame's up. Time to build a tighter business.",
  painter: "Fresh coat of organization. Let's get to work.",
  landscaper: "Roots down. Let's grow your operation.",
  welder: "Solid build. Let's get your business tight.",
  mason: "Built to last. Your business is next.",
  appliance: "All systems running. Let's get organized.",
  general: "Blueprint's ready. Let's run a tighter operation.",
  default: "Your second brain is live. Let's get to work.",
};

type Props = { data: OnboardingData };

export default function CompletionScreen({ data }: Props) {
  const router = useRouter();

  const trade = TRADES.find((t) => t.id === data.trade);
  const teamSize = TEAM_SIZES.find((s) => s.id === data.teamSize);
  const topPain = PAIN_POINTS.find((p) => p.id === data.painPoints[0]);
  const extraPainCount = Math.max(0, data.painPoints.length - 1);
  const tradeCopy = TRADE_COPY[data.trade] ?? TRADE_COPY.default;

  return (
    <div className="completion-screen">
      {/* Animated SVG checkmark */}
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <circle
          cx="36"
          cy="36"
          r="30"
          stroke="var(--accent)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          className="check-circle"
        />
        <path
          d="M20 36 L30 46 L52 26"
          stroke="white"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="check-mark"
        />
      </svg>

      <h2 className="completion-title">
        You&apos;re all set, {data.firstName}.
      </h2>

      <p className="completion-sub fade-in">{tradeCopy}</p>

      <div className="completion-summary">
        {/* Card 1 — Trade + team size */}
        <div className="glass-card summary-card">
          {trade?.emoji} {trade?.label}&nbsp;&nbsp;·&nbsp;&nbsp;{teamSize?.label}
        </div>

        {/* Card 2 — Rates (JetBrains Mono) */}
        <div className="glass-card summary-card summary-card--rates">
          ${data.hourlyRate}/hr&nbsp;&nbsp;·&nbsp;&nbsp;{data.partsMarkup}%
          markup&nbsp;&nbsp;·&nbsp;&nbsp;{data.region}
        </div>

        {/* Card 3 — Pain points */}
        <div className="glass-card summary-card">
          {topPain?.emoji} {topPain?.label}
          {extraPainCount > 0 && (
            <span className="summary-extra">&nbsp;&nbsp;+{extraPainCount} more</span>
          )}
        </div>
      </div>

      <button
        type="button"
        className="btn-accent completion-cta"
        onClick={() => router.push("/dashboard")}
      >
        Enter VerityFlow
      </button>
    </div>
  );
}
