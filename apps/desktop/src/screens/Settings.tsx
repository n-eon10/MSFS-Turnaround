import { useState, useEffect } from "react";
import type { AppSettings, Theme, Density } from "../hooks/useSettings";
import type { BridgeConnectionStatus } from "../types/telemetry";

type Props = {
  settings: AppSettings;
  setTheme: (t: Theme) => void;
  setDensity: (d: Density) => void;
  setBridgeUrl: (url: string) => void;
  isValidWsUrl: (url: string) => boolean;
  bridgeStatus: BridgeConnectionStatus;
};

const THEMES: Array<{ id: Theme; label: string; desc: string }> = [
  { id: "slate", label: "Slate", desc: "Dark blue-grey (default)" },
  { id: "phosphor", label: "Phosphor", desc: "Green-on-dark, classic CRT" },
  { id: "paper", label: "Paper", desc: "Light parchment, low-emission" },
];

const DENSITIES: Array<{ id: Density; label: string; desc: string }> = [
  { id: "compact", label: "Compact", desc: "More data, less padding" },
  { id: "balanced", label: "Balanced", desc: "Default — comfortable reading" },
  { id: "comfy", label: "Comfy", desc: "Larger targets, more air" },
];

function OptionButton({
  active,
  onClick,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 12px",
        borderRadius: 6,
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        background: active ? "var(--accent-bg)" : "var(--panel-2)",
        cursor: "pointer",
        textAlign: "left",
        transition: "border-color 0.12s, background 0.12s",
        appearance: "none",
      }}
    >
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          fontWeight: 700,
          color: active ? "var(--accent)" : "var(--fg)",
          marginBottom: 3,
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 11, color: "var(--fg-3)", lineHeight: 1.3 }}>{desc}</div>
    </button>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 9.5,
        textTransform: "uppercase" as const,
        letterSpacing: "0.14em",
        color: "var(--fg-3)",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function bridgeStatusColor(status: BridgeConnectionStatus): string {
  if (status === "connected") return "var(--good)";
  if (status === "error") return "var(--bad)";
  return "var(--warn)";
}

function bridgeStatusLabel(status: BridgeConnectionStatus): string {
  switch (status) {
    case "connected": return "CONNECTED";
    case "connecting": return "CONNECTING…";
    case "error": return "ERROR";
    default: return "DISCONNECTED";
  }
}

export function Settings({
  settings,
  setTheme,
  setDensity,
  setBridgeUrl,
  isValidWsUrl,
  bridgeStatus,
}: Props) {
  const [urlDraft, setUrlDraft] = useState(settings.bridgeUrl);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlApplied, setUrlApplied] = useState(false);

  // Keep draft in sync if bridgeUrl changes externally (e.g. reset)
  useEffect(() => {
    setUrlDraft(settings.bridgeUrl);
  }, [settings.bridgeUrl]);

  const isDirty = urlDraft !== settings.bridgeUrl;

  function applyUrl() {
    const trimmed = urlDraft.trim();
    if (!isValidWsUrl(trimmed)) {
      setUrlError("Must be a valid WebSocket URL (ws:// or wss://)");
      return;
    }
    setUrlError(null);
    setBridgeUrl(trimmed);
    setUrlApplied(true);
    setTimeout(() => setUrlApplied(false), 2000);
  }

  function resetUrl() {
    setUrlDraft(settings.bridgeUrl);
    setUrlError(null);
  }

  return (
    <>
      <div className="card">
        <div className="card-head">
          <span className="lbl">APPEARANCE</span>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <SectionLabel>Theme</SectionLabel>
            <div style={{ display: "flex", gap: 8 }}>
              {THEMES.map((t) => (
                <OptionButton
                  key={t.id}
                  active={settings.theme === t.id}
                  onClick={() => setTheme(t.id)}
                  label={t.label}
                  desc={t.desc}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Density</SectionLabel>
            <div style={{ display: "flex", gap: 8 }}>
              {DENSITIES.map((d) => (
                <OptionButton
                  key={d.id}
                  active={settings.density === d.id}
                  onClick={() => setDensity(d.id)}
                  label={d.label}
                  desc={d.desc}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="lbl">CONNECTION</span>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9,
              letterSpacing: "0.1em",
              color: bridgeStatusColor(bridgeStatus),
            }}
          >
            {bridgeStatusLabel(bridgeStatus)}
          </span>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <SectionLabel>Bridge URL</SectionLabel>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={urlDraft}
                onChange={(e) => {
                  setUrlDraft(e.target.value);
                  setUrlError(null);
                  setUrlApplied(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyUrl();
                  if (e.key === "Escape") resetUrl();
                }}
                spellCheck={false}
                style={{
                  flex: 1,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 12,
                  padding: "7px 10px",
                  background: "var(--panel-2)",
                  border: `1px solid ${urlError ? "var(--bad)" : isDirty ? "var(--accent)" : "var(--border-2)"}`,
                  borderRadius: 6,
                  color: "var(--fg)",
                  outline: "none",
                  transition: "border-color 0.12s",
                }}
              />
              <button
                className="btn primary"
                style={{ flexShrink: 0 }}
                onClick={applyUrl}
                disabled={!isDirty && !urlApplied}
                title="Apply URL and reconnect"
              >
                {urlApplied ? "Applied" : "Apply"}
              </button>
              {isDirty && (
                <button
                  className="btn ghost"
                  style={{ flexShrink: 0 }}
                  onClick={resetUrl}
                  title="Revert changes"
                >
                  Reset
                </button>
              )}
            </div>
            {urlError && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: "var(--bad)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {urlError}
              </div>
            )}
            {!urlError && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: "var(--fg-3)",
                  lineHeight: 1.5,
                }}
              >
                Changing the URL disconnects the current socket and reconnects immediately.
                Press Enter or click Apply to confirm.
              </div>
            )}
          </div>

          <div className="kv">
            <div className="k">Active URL</div>
            <div className="v mono" style={{ fontSize: 10.5 }}>{settings.bridgeUrl}</div>
            <div className="k">Protocol</div>
            <div className="v mono">WebSocket</div>
            <div className="k">Reconnect</div>
            <div className="v">1 second interval</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="lbl">ABOUT</span>
        </div>
        <div className="card-body">
          <div className="kv">
            <div className="k">App</div>
            <div className="v">MSFS Turnaround</div>
            <div className="k">Version</div>
            <div className="v mono">0.1.0</div>
            <div className="k">Framework</div>
            <div className="v mono">Tauri 2 + React 19</div>
            <div className="k">Identifier</div>
            <div className="v mono">com.neon10.msfsturnaround</div>
            <div className="k">Window</div>
            <div className="v mono">660 × 750 px</div>
          </div>
        </div>
      </div>
    </>
  );
}
