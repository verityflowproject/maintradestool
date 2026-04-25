import type React from "react";
import type { StepProps } from "../types";

export default function RatesStep({
  data,
  update,
  errors,
  setErrors,
  advanceStep,
  shaking,
}: StepProps) {
  const onNumber =
    (key: "hourlyRate" | "partsMarkup") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      update({ [key]: v === "" ? "" : Number(v) } as Parameters<typeof update>[0]);
    };

  return (
    <div className="step-body">
      <h2>Set your default rates</h2>
      <p className="step-sub">
        Pre-fills your invoices automatically. Edit anytime.
      </p>

      <div className="form-field">
        <label htmlFor="rate-hourly">Hourly labor rate</label>
        <div className="input-affix">
          <span className="affix-prefix">$</span>
          <input
            id="rate-hourly"
            type="number"
            min={1}
            inputMode="decimal"
            placeholder="85"
            className="input-field input-with-prefix"
            value={data.hourlyRate}
            onChange={onNumber("hourlyRate")}
          />
        </div>
        {errors.hourlyRate && (
          <p className="field-error">{errors.hourlyRate}</p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="rate-markup">Parts markup</label>
        <div className="input-affix">
          <input
            id="rate-markup"
            type="number"
            min={0}
            max={200}
            inputMode="decimal"
            placeholder="20"
            className="input-field input-with-suffix"
            value={data.partsMarkup}
            onChange={onNumber("partsMarkup")}
          />
          <span className="affix-suffix">%</span>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="rate-region">Your state or province</label>
        <input
          id="rate-region"
          type="text"
          placeholder="e.g. Texas"
          className="input-field"
          value={data.region}
          onChange={(e) => update({ region: e.target.value })}
        />
        {errors.region && <p className="field-error">{errors.region}</p>}
      </div>

      <div className="glass-card info-card">
        <p>
          💡 Your rates are private and only used to generate your invoices.
        </p>
      </div>

      <button
        type="button"
        className={`btn-accent step-cta${shaking ? " shake" : ""}`}
        onClick={() =>
          advanceStep(() => {
            const next: Record<string, string> = {};
            if (
              typeof data.hourlyRate !== "number" ||
              data.hourlyRate <= 0
            ) {
              next.hourlyRate = "Enter your hourly rate.";
            }
            if (!data.region.trim()) {
              next.region = "Enter your state or province.";
            }
            if (Object.keys(next).length) {
              setErrors((e) => ({ ...e, ...next }));
              return false;
            }
            if (data.partsMarkup === "") update({ partsMarkup: 20 });
            return true;
          })
        }
      >
        Continue →
      </button>
    </div>
  );
}
