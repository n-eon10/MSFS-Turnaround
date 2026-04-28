type DataCellProps = {
  label: string;
  value: string | number;
  unit?: string;
  tone?: "default" | "blue" | "red" | "yellow" | "green";
};

const toneStyles = {
  default: "bg-[#f7f2e9]",
  blue: "bg-[#dbe7ef]",
  red: "bg-[#f1d4cf]",
  yellow: "bg-[#efe6b8]",
  green: "bg-[#d7e6d1]",
};

export function DataCell({
  label,
  value,
  unit,
  tone = "default",
}: DataCellProps) {
  return (
    <div
      className={[
        "rounded-[6px] border-2 border-[#2c2c2c] p-4",
        "shadow-[3px_3px_0_0_#b8b3aa]",
        toneStyles[tone],
      ].join(" ")}
    >
      <div className="mb-3 text-[12px] uppercase tracking-[0.16em] text-[#444]">
        {label}
      </div>

      <div className="flex items-end gap-2">
        <span className="text-[34px] font-bold leading-none text-[#171717]">
          {value}
        </span>
        {unit ? (
          <span className="pb-1 text-[13px] uppercase tracking-[0.12em] text-[#555]">
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}