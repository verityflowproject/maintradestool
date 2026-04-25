import type { StepProps } from "../types";

export default function BusinessStep({
  data,
  update,
  errors,
  setErrors,
  advanceStep,
  shaking,
}: StepProps) {
  return (
    <div className="step-body">
      <h2>Tell us about your business</h2>
      <p className="step-sub">This appears on every invoice you generate.</p>

      <div className="form-field">
        <label htmlFor="biz-name">Business name</label>
        <input
          id="biz-name"
          className="input-field"
          placeholder="e.g. Rodriguez Plumbing LLC"
          value={data.businessName}
          onChange={(e) => update({ businessName: e.target.value })}
        />
        {errors.businessName && (
          <p className="field-error">{errors.businessName}</p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="first-name">Your first name</label>
        <input
          id="first-name"
          className="input-field"
          placeholder="e.g. Marcus"
          value={data.firstName}
          onChange={(e) => update({ firstName: e.target.value })}
        />
        {errors.firstName && (
          <p className="field-error">{errors.firstName}</p>
        )}
      </div>

      <button
        type="button"
        className={`btn-accent step-cta${shaking ? " shake" : ""}`}
        style={{ marginTop: "28px" }}
        onClick={() =>
          advanceStep(() => {
            const next: Record<string, string> = {};
            if (data.businessName.trim().length < 2) {
              next.businessName =
                "Enter your business name (min 2 characters)";
            }
            if (!data.firstName.trim()) {
              next.firstName = "Enter your first name";
            }
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
