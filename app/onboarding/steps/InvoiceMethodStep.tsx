import { CheckCircle } from "lucide-react";
import type { StepProps } from "../types";

const INVOICE_METHODS = [
  {
    id: "email",
    emoji: "📧",
    title: "PDF via Email",
    sub: "Professional PDF sent to client's inbox",
  },
  {
    id: "sms",
    emoji: "💬",
    title: "Text Message Link",
    sub: "Send a payment link via SMS — fastest",
  },
  {
    id: "download",
    emoji: "📥",
    title: "I'll Download It",
    sub: "Generate the PDF, I'll send it myself",
  },
];

export default function InvoiceMethodStep({
  data,
  update,
  errors,
  setErrors,
  advanceStep,
  shaking,
  ctaLabel = "Continue →",
}: StepProps & { ctaLabel?: string }) {
  return (
    <div className="step-body">
      <h2>How do you send invoices?</h2>
      <p className="step-sub">
        Set your default — you can always change per job.
      </p>

      <div className="invoice-list">
        {INVOICE_METHODS.map((m) => {
          const selected = data.invoiceMethod === m.id;
          return (
            <button
              key={m.id}
              type="button"
              className={`glass-card invoice-card${selected ? " selected" : ""}`}
              onClick={() => update({ invoiceMethod: m.id })}
              aria-pressed={selected}
            >
              <span className="invoice-emoji">{m.emoji}</span>
              <span className="invoice-text">
                <span className="invoice-title">{m.title}</span>
                <span className="invoice-sub">{m.sub}</span>
              </span>
              <span
                className={`invoice-check${selected ? " on" : ""}`}
                aria-hidden
              >
                <CheckCircle size={20} />
              </span>
            </button>
          );
        })}
      </div>

      {errors.invoiceMethod && (
        <p className="field-error">{errors.invoiceMethod}</p>
      )}

      <button
        type="button"
        className={`btn-accent step-cta${shaking ? " shake" : ""}`}
        onClick={() =>
          advanceStep(() => {
            if (!data.invoiceMethod) {
              setErrors((e) => ({
                ...e,
                invoiceMethod: "Please select how you'll send invoices.",
              }));
              return false;
            }
            return true;
          })
        }
        >
        {ctaLabel}
      </button>
    </div>
  );
}
