import type { AppPage } from "../App";

type SidebarProps = {
  activePage: AppPage;
  onPageChange: (page: AppPage) => void;
};

const items: Array<{
  id: AppPage;
  label: string;
  icon: string;
}> = [
  { id: "telemetry", label: "Telemetry", icon: "▦" },
  { id: "approach", label: "Approach", icon: "⌁" },
  { id: "landing", label: "Landing", icon: "✈" },
];

export function Sidebar({ activePage, onPageChange }: SidebarProps) {
  return (
    <aside className="border-r-2 border-[#8a857d] bg-[#e7dfd3]">
      <div className="border-b-2 border-[#8a857d] p-5">
        <div className="text-[26px] font-bold leading-none">
          msfs.
        </div>
        <div className="text-[26px] font-bold leading-none text-[#1f4662]">
          turnaround
        </div>
      </div>

      <nav className="p-4">
        <div className="mb-3 text-[12px] uppercase tracking-[0.18em] text-[#555]">
          Modules
        </div>

        <div className="space-y-3">
          {items.map((item) => {
            const active = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={[
                  "flex w-full items-center gap-3 rounded-[6px] border-2 px-4 py-3 text-left text-[15px] font-semibold",
                  "shadow-[2px_2px_0_0_#b8b3aa]",
                  active
                    ? "border-[#2c2c2c] bg-[#1f4662] text-white"
                    : "border-[#2c2c2c] bg-[#f7f2e9] text-[#171717] hover:bg-[#efe6b8]",
                ].join(" ")}
              >
                <span className="text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="mt-8 border-t-2 border-[#8a857d] p-4">
        <div className="rounded-[6px] border-2 border-[#2c2c2c] bg-[#efe6b8] p-3 text-[13px] leading-relaxed">
          Open-source external panel for MSFS 2024.
        </div>
      </div>
    </aside>
  );
}