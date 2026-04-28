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

export function TodoValue({
  label = "TODO",
  title = "Not implemented end to end yet",
}: {
  label?: string;
  title?: string;
}) {
  return (
    <span className="todo" title={title}>
      {label}
    </span>
  );
}

export function valueOrTodo(
  value: string | number | null | undefined,
  title?: string
) {
  if (value === null || value === undefined || value === "") {
    return <TodoValue title={title} />;
  }

  return value;
}
