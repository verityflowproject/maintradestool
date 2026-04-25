import { JOB_TYPES, EXPERIENCE_YEARS } from "@/lib/constants";
import type { StepProps } from "../types";

export default function WorkDetailsStep({
  data,
  update,
  errors,
  setErrors,
  advanceStep,
  shaking,
}: StepProps) {
  return (
    <div className="step-body">
      <h2>A bit more about your work</h2>

      <section className="step-section">
        <p className="section-label">What kind of jobs do you mainly do?</p>
        <div className="pill-group">
          {JOB_TYPES.map((j) => (
            <button
              key={j.id}
              type="button"
              className={`btn-ghost pill${data.jobType === j.id ? " selected" : ""}`}
              onClick={() => update({ jobType: j.id })}
              aria-pressed={data.jobType === j.id}
            >
              <span className="pill-emoji">{j.emoji}</span>
              <span className="pill-label">{j.label}</span>
            </button>
          ))}
        </div>
        {errors.jobType && <p className="field-error">{errors.jobType}</p>}
      </section>

      <section className="step-section">
        <p className="section-label">Years in the trade</p>
        <div className="exp-list">
          {EXPERIENCE_YEARS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`glass-card exp-card${
                data.experienceYears === opt.id ? " selected" : ""
              }`}
              onClick={() => update({ experienceYears: opt.id })}
              aria-pressed={data.experienceYears === opt.id}
            >
              <span className="exp-text">
                <span className="exp-label">{opt.label}</span>
                <span className="exp-sub">{opt.sub}</span>
              </span>
              <span className="team-radio" aria-hidden />
            </button>
          ))}
        </div>
        {errors.experienceYears && (
          <p className="field-error">{errors.experienceYears}</p>
        )}
      </section>

      <button
        type="button"
        className={`btn-accent step-cta${shaking ? " shake" : ""}`}
        onClick={() =>
          advanceStep(() => {
            const next: Record<string, string> = {};
            if (!data.jobType)
              next.jobType = "Select a job type.";
            if (!data.experienceYears)
              next.experienceYears = "Select your experience level.";
            if (Object.keys(next).length) {
              setErrors((e) => ({ ...e, ...next }));
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
