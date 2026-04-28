export const fmt = (n: number | null | undefined, d = 0): string => {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
};

export const sign = (n: number): string => (n >= 0 ? "+" : "");

export const padHdg = (h: number): string =>
  String(Math.round(h)).padStart(3, "0");
