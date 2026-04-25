"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft } from "lucide-react";
import { type OnboardingData, type StepProps, defaultState } from "./types";
import WelcomeStep from "./steps/WelcomeStep";
import TradeStep from "./steps/TradeStep";
import BusinessStep from "./steps/BusinessStep";
import TeamSizeStep from "./steps/TeamSizeStep";
import WorkDetailsStep from "./steps/WorkDetailsStep";
import PainPointsStep from "./steps/PainPointsStep";
import RatesStep from "./steps/RatesStep";
import InvoiceMethodStep from "./steps/InvoiceMethodStep";
import AccountStep from "./steps/AccountStep";
import CompletionScreen from "./steps/CompletionScreen";

type Direction = "forward" | "back";
type AnimPhase = "idle" | "exiting" | "entering";

// 0 = Welcome, 1–8 = onboarding steps, 9 = Completion
// Google users: steps 1–7 only (no Welcome, no AccountStep)
const TOTAL_STEPS = 9;

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();

  const [data, setData] = useState<OnboardingData>(defaultState);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<Direction>("forward");
  const [animPhase, setAnimPhase] = useState<AnimPhase>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shaking, setShaking] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  // A Google OAuth user who signed in but hasn't completed onboarding yet
  const isGoogleUser =
    status === "authenticated" &&
    !!session?.user?.id &&
    session.user.onboardingCompleted === false;

  // On mount: if this is a Google user, skip Welcome and pre-fill name/email
  useEffect(() => {
    if (isGoogleUser && currentStep === 0) {
      setCurrentStep(1);
      setData((d) => ({
        ...d,
        email: session?.user?.email ?? d.email,
        firstName: session?.user?.firstName ?? d.firstName,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGoogleUser]);

  const update = useCallback((patch: Partial<OnboardingData>) => {
    setData((d) => ({ ...d, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  }, []);

  const runTransition = useCallback((nextStep: number, dir: Direction) => {
    setDirection(dir);
    setAnimPhase("exiting");

    setTimeout(() => {
      setCurrentStep(nextStep);
      setAnimPhase("entering");
      setTimeout(() => setAnimPhase("idle"), 300);
    }, 220);
  }, []);

  const advanceStep = useCallback(
    (validationFn: () => boolean) => {
      if (!validationFn()) {
        setShaking(true);
        setTimeout(() => setShaking(false), 400);
        return;
      }
      const next = Math.min(currentStep + 1, TOTAL_STEPS);
      runTransition(next, "forward");
    },
    [currentStep, runTransition]
  );

  const goBack = useCallback(() => {
    // Google users cannot go back past step 1
    const floor = isGoogleUser ? 1 : 0;
    const prev = Math.max(currentStep - 1, floor);
    runTransition(prev, "back");
  }, [currentStep, isGoogleUser, runTransition]);

  // Called when a Google user completes step 7 (InvoiceMethodStep)
  const handleGoogleSubmit = useCallback(async () => {
    setGoogleSubmitting(true);
    try {
      const payload = {
        firstName: data.firstName,
        businessName: data.businessName,
        trade: data.trade,
        teamSize: data.teamSize,
        jobType: data.jobType,
        experienceYears: data.experienceYears,
        painPoints: data.painPoints,
        hourlyRate: Number(data.hourlyRate),
        partsMarkup: Number(data.partsMarkup),
        region: data.region,
        invoiceMethod: data.invoiceMethod,
        onboardingCompleted: true,
      };

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Refresh the JWT so middleware sees onboardingCompleted: true
        await updateSession();
        router.push("/dashboard");
      } else {
        console.error("Profile update failed", await res.json());
      }
    } catch (err) {
      console.error("Google submit error:", err);
    } finally {
      setGoogleSubmitting(false);
    }
  }, [data, updateSession, router]);

  const stepClass =
    animPhase === "exiting"
      ? direction === "forward"
        ? "step-exit-forward"
        : "step-exit-back"
      : animPhase === "entering"
      ? direction === "forward"
        ? "step-enter-forward"
        : "step-enter-back"
      : "";

  // Chrome (progress bar + back button): steps 1–7 for Google users, 1–8 for new users
  const chromeMax = isGoogleUser ? 7 : 8;
  const showChrome = currentStep >= 1 && currentStep <= chromeMax;

  const stepProps: StepProps = {
    data,
    update,
    errors,
    setErrors,
    advanceStep,
    shaking,
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep advanceStep={advanceStep} />;
      case 1:
        return <TradeStep {...stepProps} />;
      case 2:
        return <BusinessStep {...stepProps} />;
      case 3:
        return <TeamSizeStep {...stepProps} />;
      case 4:
        return <WorkDetailsStep {...stepProps} />;
      case 5:
        return <PainPointsStep {...stepProps} />;
      case 6:
        return <RatesStep {...stepProps} />;
      case 7:
        if (isGoogleUser) {
          return (
            <InvoiceMethodStep
              {...stepProps}
              ctaLabel={googleSubmitting ? "Saving…" : "Save & Continue"}
              advanceStep={(validate) => {
                if (!validate()) {
                  setShaking(true);
                  setTimeout(() => setShaking(false), 400);
                  return;
                }
                void handleGoogleSubmit();
              }}
            />
          );
        }
        return <InvoiceMethodStep {...stepProps} />;
      case 8:
        return <AccountStep {...stepProps} />;
      case 9:
        return <CompletionScreen data={data} />;
      default:
        return null;
    }
  };

  return (
    <main className="onboarding-container">
      {showChrome && (
        <div className="onboarding-progress" aria-hidden>
          <div
            className="onboarding-progress-fill"
            style={{ width: `${(currentStep / chromeMax) * 100}%` }}
          />
        </div>
      )}

      {showChrome && (
        <button
          type="button"
          className="onboarding-back"
          onClick={goBack}
          aria-label="Go back"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      <div className={`onboarding-step ${stepClass}`.trim()}>
        {renderStep()}
      </div>
    </main>
  );
}
