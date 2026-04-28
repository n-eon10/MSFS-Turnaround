import type { ReactNode } from "react";
import type { AppPage } from "../App";
import type { BridgeConnectionStatus } from "../types/telemetry";
import { Sidebar } from "./Sidebar";
import { TopWindowBar } from "./TopWindowBar";

type AppShellProps = {
  children: ReactNode;
  activePage: AppPage;
  onPageChange: (page: AppPage) => void;
  status: BridgeConnectionStatus;
};

export function AppShell({
  children,
  activePage,
  onPageChange,
  status,
}: AppShellProps) {
  return (
    <main className="min-h-screen bg-[#ebe7df] p-8 text-[#171717]">
      <div className="mx-auto max-w-[1400px] rounded-[10px] border-[3px] border-[#bcbcbc] bg-[#d8d5d0] p-3 shadow-[6px_6px_0_0_#c8c4be]">
        <div className="rounded-[4px] border-[3px] border-[#a7a4a0] bg-[#f7f2e9] p-3">
          <TopWindowBar title="MSFS TURNAROUND" status={status} />

          <div className="grid min-h-[760px] grid-cols-[230px_1fr] border-[3px] border-[#1f4662] bg-[#f7f2e9]">
            <Sidebar activePage={activePage} onPageChange={onPageChange} />

            <section className="min-w-0 bg-[#f3f0ea]">
              {children}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}