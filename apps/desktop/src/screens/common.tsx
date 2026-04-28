import type { ReactNode } from "react";

export type PillKind = "good" | "warn" | "bad" | "default";

export function StatusPill({
  kind = "good",
  children,
}: {
  kind?: PillKind;
  children: ReactNode;
}) {
  const cls = kind === "default" ? "pill" : `pill ${kind}`;
  return (
    <span className={cls}>
      <span className="dot"></span>
      {children}
    </span>
  );
}
