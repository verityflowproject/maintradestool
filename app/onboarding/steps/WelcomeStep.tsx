'use client';

import { useState } from 'react';
import SignInModal from '@/components/SignInModal';

type WelcomeStepProps = {
  advanceStep: (validator: () => boolean) => void;
};

export default function WelcomeStep({ advanceStep }: WelcomeStepProps) {
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100dvh - 48px)",
        padding: "0 8px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "320px" }}>
        {/* Diamond SVG logo */}
        <div className="welcome-item stagger-0">
          <svg
            className="welcome-logo"
            width="52"
            height="52"
            viewBox="0 0 52 52"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <defs>
              <linearGradient
                id="diamondGold"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
                gradientTransform="rotate(135, 0.5, 0.5)"
              >
                <stop offset="0%" stopColor="#4338CA">
                  <animate
                    attributeName="stop-color"
                    values="#4338CA;#7C3AED;#4338CA"
                    dur="8s"
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="100%" stopColor="#C7B9FF">
                  <animate
                    attributeName="stop-color"
                    values="#C7B9FF;#6366F1;#C7B9FF"
                    dur="8s"
                    repeatCount="indefinite"
                  />
                </stop>
              </linearGradient>
            </defs>
            <path
              d="M26 2 L50 26 L26 50 L2 26 Z"
              fill="url(#diamondGold)"
            />
          </svg>
        </div>

        {/* Title */}
        <div className="welcome-item stagger-1">
          <h1 className="welcome-title">VerityFlow</h1>
        </div>

        {/* Tagline */}
        <div className="welcome-item stagger-2">
          <p className="welcome-tagline">
            Voice in. Invoice out.
          </p>
        </div>

        {/* Sub */}
        <div className="welcome-item stagger-3">
          <p className="welcome-sub">Set up in 2 minutes.</p>
        </div>

        {/* Get Started */}
        <div className="welcome-item stagger-4">
          <button
            type="button"
            className="btn-accent welcome-cta"
            onClick={() => advanceStep(() => true)}
          >
            Get Started
          </button>
        </div>

        {/* Sign in */}
        <div className="welcome-item stagger-5">
          <button
            type="button"
            className="welcome-signin"
            onClick={() => setSignInOpen(true)}
          >
            Already have an account?{" "}
            <span style={{ fontWeight: 500 }}>Sign in</span>
          </button>
        </div>
      </div>

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>
  );
}
