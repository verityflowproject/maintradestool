import { PAIN_POINTS } from "@/lib/constants";
import type { StepProps } from "../types";

export default function PainPointsStep({
  data,
  update,
  errors,
  setErrors,
  advanceStep,
  shaking,
}: StepProps) {
  const toggle = (id: string) => {
    const has = data.painPoints.includes(id);
    const next = has
      ? data.painPoints.filter((p) => p !== id)
      : [...data.painPoints, id];
    update({ painPoints: next });
  };

  return (
    <div className="step-body">
      <h2>What&apos;s your biggest headache?</h2>
      <p className="step-sub">
        Pick all that apply — we&apos;ll prioritize these for you.
      </p>

      <div className="pain-grid">
        {PAIN_POINTS.map((p) => {
          const selected = data.painPoints.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              className={`glass-card pain-card${selected ? " selected" : ""}`}
              onClick={() => toggle(p.id)}
              aria-pressed={selected}
            >
              <span className="pain-emoji">{p.emoji}</span>
              <span className="pain-label">{p.label}</span>
              {selected && (
                <span className="pain-check" aria-hidden>
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {errors.painPoints && (
        <p className="field-error">{errors.painPoints}</p>
      )}

      <button
        type="button"
        className={`btn-accent step-cta${shaking ? " shake" : ""}`}
        onClick={() =>
          advanceStep(() => {
            if (data.painPoints.length < 1) {
              setErrors((e) => ({
                ...e,
                painPoints: "Select at least one to continue.",
              }));
              return false;
            }
            return true;
          })
        }
      >
        Continue →
      </button>
    </div>
  );
}
