"use client";

import { useState, useMemo } from "react";
import { signIn } from "next-auth/react";
import { track } from "@vercel/analytics";
import type { StepProps } from "../types";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];

function computeScore(p: string): number {
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p) && /[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4);
}

export default function AccountStep({
  data,
  update,
  errors,
  setErrors,
  advanceStep,
  shaking,
}: StepProps) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const score = useMemo(() => computeScore(password), [password]);

  async function handleSubmit() {
    setSubmitError(null);

    const next: Record<string, string> = {};
    if (!EMAIL_RX.test(data.email)) {
      next.email = "Enter a valid email.";
    }
    if (password.length < 8) {
      next.password = "At least 8 characters.";
    }
    if (Object.keys(next).length) {
      setErrors((e) => ({ ...e, ...next }));
      advanceStep(() => false);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          password,
          hourlyRate: Number(data.hourlyRate),
          partsMarkup: Number(data.partsMarkup),
        }),
      });

      const json = await res.json();

      if (res.status === 201) {
        localStorage.setItem("verityflow_profile", JSON.stringify(data));
        track("signup_completed", { method: "email" });
        await signIn("credentials", {
          email: data.email,
          password,
          redirect: false,
        });
        advanceStep(() => true);
      } else if (res.status === 409) {
        setErrors((e) => ({
          ...e,
          email: "An account with this email already exists.",
        }));
      } else {
        setSubmitError(
          json?.error ?? "Something went wrong. Please try again."
        );
      }
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="step-body">
      <h2>Secure your VerityFlow</h2>
      <p className="step-sub">Create your account to save everything.</p>

      <div className="form-field">
        <label htmlFor="acct-email">Email address</label>
        <input
          id="acct-email"
          type="email"
          className="input-field"
          placeholder="you@email.com"
          value={data.email}
          onChange={(e) => update({ email: e.target.value })}
          autoComplete="email"
        />
        {errors.email && <p className="field-error">{errors.email}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="acct-password">Create a password</label>
        <input
          id="acct-password"
          type="password"
          className="input-field"
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />

        <div className="strength-row" data-score={score}>
          <span className="strength-seg" />
          <span className="strength-seg" />
          <span className="strength-seg" />
          <span className="strength-seg" />
          {score > 0 && (
            <span className="strength-label">{STRENGTH_LABELS[score]}</span>
          )}
        </div>

        {errors.password && <p className="field-error">{errors.password}</p>}
      </div>

      <p className="free-trial-note">
        No credit card required. Free for 30 days.
      </p>

      <button
        type="button"
        className={`btn-accent step-cta${shaking ? " shake" : ""}`}
        style={{ marginTop: "28px" }}
        disabled={submitting}
        onClick={handleSubmit}
      >
        {submitting ? "Creating account…" : "Create My Account →"}
      </button>

      {submitError && <p className="field-error">{submitError}</p>}
    </div>
  );
}
