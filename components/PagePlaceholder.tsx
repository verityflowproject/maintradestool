type Props = {
  title: string;
};

export default function PagePlaceholder({ title }: Props) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg-void)",
        padding: "calc(24px + env(safe-area-inset-top)) 24px 24px",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-syne), sans-serif",
          fontWeight: 700,
          fontSize: "24px",
          color: "var(--text-primary)",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h1>
    </div>
  );
}
