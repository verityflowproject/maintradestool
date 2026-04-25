import { TRADES } from "@/lib/constants";
import type { StepProps } from "../types";

export default function TradeStep({
  data,
  update,
  errors,
  setErrors,
  advanceStep,
  shaking,
}: StepProps) {
  return (
    <div className="step-body">
      <h2>What&apos;s your trade?</h2>
      <p className="step-sub">We&apos;ll tailor everything to how your trade works.</p>

      <div className="trade-grid">
        {TRADES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`glass-card trade-card${data.trade === t.id ? " selected" : ""}`}
            onClick={() => update({ trade: t.id })}
            aria-pressed={data.trade === t.id}
          >
            <span className="trade-emoji">{t.emoji}</span>
            <span className="trade-label">{t.label}</span>
            {data.trade === t.id && (
              <span className="trade-check" aria-hidden>
                ✓
              </span>
            )}
          </button>
        ))}
      </div>

      {errors.trade && <p className="field-error">{errors.trade}</p>}

      <button
        type="button"
        className={`btn-accent step-cta${shaking ? " shake" : ""}`}
        onClick={() =>
          advanceStep(() => {
            if (!data.trade) {
              setErrors((e) => ({ ...e, trade: "Please select your trade." }));
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
