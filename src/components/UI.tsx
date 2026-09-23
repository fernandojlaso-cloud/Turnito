import type { CSSProperties, ReactNode } from "react";
import { tokens } from "@/styles/tokens";

const { color, font, radius } = tokens;

export function SelectCard({
  selected,
  onClick,
  accent,
  code,
  title,
  subtitle
}: {
  selected: boolean;
  onClick: () => void;
  accent: string;
  code: string;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        height: 68,
        boxSizing: "border-box",
        padding: "0 16px",
        borderRadius: radius.md,
        textAlign: "left",
        background: selected ? accent : color.surface,
        border: `1px solid ${selected ? color.ink : color.border}`,
        color: color.ink
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          flex: "none",
          borderRadius: radius.sm,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: font.mono,
          fontSize: 13,
          fontWeight: 600,
          background: selected ? color.ink : color.bg,
          color: selected ? accent : color.ink
        }}
      >
        {code}
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
        <span style={{ fontSize: 13, color: color.textSoft }}>{subtitle}</span>
      </span>
    </button>
  );
}

export function SlotButton({
  time,
  sub,
  disabled,
  selected,
  accent,
  onClick
}: {
  time: string;
  sub: string;
  disabled: boolean;
  selected: boolean;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      style={{
        height: 64,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        borderRadius: radius.md,
        background: selected ? accent : disabled ? color.bg : color.surface,
        border: `1px solid ${selected ? color.ink : color.border}`,
        color: disabled ? "#8A8F96" : color.ink
      }}
    >
      <span
        style={{
          fontFamily: font.mono,
          fontSize: 16,
          fontWeight: 600,
          textDecoration: disabled ? "line-through" : "none"
        }}
      >
        {time}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600 }}>{sub}</span>
    </button>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  accent,
  type = "button"
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  accent: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 56,
        borderRadius: radius.md,
        border: 0,
        background: disabled ? color.borderStrong : accent,
        color: color.ink,
        fontWeight: 700,
        fontSize: 16,
        width: "100%"
      }}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ step, of, accent }: { step: number; of: number; accent?: string }) {
  const bars = Array.from({ length: of }, (_, i) => i < step);
  void accent; // el color de progreso usa tinta plena, no el acento
  const style: CSSProperties = { flex: 1, height: 4, borderRadius: 2 };
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {bars.map((filled, i) => (
        <div key={i} style={{ ...style, background: filled ? color.ink : color.borderStrong }} />
      ))}
    </div>
  );
}

export function Field({
  id,
  label,
  ...props
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 700 }}>
        {label}
      </label>
      <input
        id={id}
        {...props}
        style={{
          height: 52,
          boxSizing: "border-box",
          padding: "0 14px",
          borderRadius: radius.sm,
          border: `1px solid ${color.borderStrong}`,
          fontFamily: font.body,
          fontSize: 16,
          background: color.surface,
          color: color.ink
        }}
      />
    </div>
  );
}
