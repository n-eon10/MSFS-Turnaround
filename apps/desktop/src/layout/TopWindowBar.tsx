import type { BridgeConnectionStatus } from "../types/telemetry";

type TopWindowBarProps = {
  title: string;
  status: BridgeConnectionStatus;
};

function statusText(status: BridgeConnectionStatus): string {
  switch (status) {
    case "connected":
      return "CONNECTED";
    case "connecting":
      return "CONNECTING";
    case "disconnected":
      return "OFFLINE";
    case "error":
      return "ERROR";
  }
}

export function TopWindowBar({ title, status }: TopWindowBarProps) {
  const online = status === "connected";

  return (
    <div className="mb-3 flex items-center justify-between rounded-[3px] border-2 border-[#2c2c2c] bg-[#171fa8] px-5 py-2 text-white">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 rounded-full border border-white bg-[#df625d]" />
        <span className="h-3 w-3 rounded-full border border-white bg-[#e6d45a]" />
        <span className="h-3 w-3 rounded-full border border-white bg-[#a9c59a]" />
        <span className="ml-3 text-[18px] tracking-wide">{title}</span>
      </div>

      <div className="flex items-center gap-4">
        <span
          className={[
            "rounded-[4px] border border-white/70 px-3 py-1 text-[12px] font-bold tracking-[0.14em]",
            online ? "bg-[#a9c59a] text-[#171717]" : "bg-[#df625d] text-white",
          ].join(" ")}
        >
          {statusText(status)}
        </span>

        <span className="text-[22px] leading-none">✕</span>
      </div>
    </div>
  );
}