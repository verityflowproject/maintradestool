import type { StepProps } from "../types";

const FIRST_NAME_RE = /^[a-zA-Z\s'-]*$/;
const BUSINESS_NAME_HAS_LETTER_RE = /[a-zA-Z]/;

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
          maxLength={80}
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
          maxLength={40}
          value={data.firstName}
          onChange={(e) => {
            const v = e.target.value;
            if (FIRST_NAME_RE.test(v)) update({ firstName: v });
          }}
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
            const biz = data.businessName.trim();
            const first = data.firstName.trim();

            if (biz.length < 2) {
              next.businessName = "Enter your business name (min 2 characters)";
            } else if (biz.length > 80) {
              next.businessName = "Business name must be 80 characters or fewer";
            } else if (!BUSINESS_NAME_HAS_LETTER_RE.test(biz)) {
              next.businessName = "Business name must contain at least one letter";
            }

            if (!first) {
              next.firstName = "Enter your first name";
            } else if (first.length > 40) {
              next.firstName = "First name must be 40 characters or fewer";
            } else if (!FIRST_NAME_RE.test(first)) {
              next.firstName = "First name can only contain letters, spaces, hyphens, and apostrophes";
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
