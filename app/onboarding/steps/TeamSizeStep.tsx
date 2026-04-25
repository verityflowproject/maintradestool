import { TEAM_SIZES } from "@/lib/constants";
import type { StepProps } from "../types";

export default function TeamSizeStep({
  data,
  update,
  errors,
  setErrors,
  advanceStep,
  shaking,
}: StepProps) {
  return (
    <div className="step-body">
      <h2>How big is your operation?</h2>
      <p className="step-sub">Helps us configure the right features for you.</p>

      <div className="team-list">
        {TEAM_SIZES.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`glass-card team-card${
              data.teamSize === opt.id ? " selected" : ""
            }`}
            onClick={() => update({ teamSize: opt.id })}
            aria-pressed={data.teamSize === opt.id}
          >
            <span className="team-text">
              <span className="team-label">{opt.label}</span>
              <span className="team-sub">{opt.sub}</span>
            </span>
            <span className="team-radio" aria-hidden />
          </button>
        ))}
      </div>

      {errors.teamSize && <p className="field-error">{errors.teamSize}</p>}

      <button
        type="button"
        className={`btn-accent step-cta${shaking ? " shake" : ""}`}
        onClick={() =>
          advanceStep(() => {
            if (!data.teamSize) {
              setErrors((e) => ({
                ...e,
                teamSize: "Please select your team size.",
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
