import { useEffect, useState } from "react";

export type Theme = "slate" | "phosphor" | "paper" | "amber" | "midnight" | "carbon" | "aurora";
export type Density = "compact" | "balanced" | "comfy";

export const DEFAULT_BRIDGE_URL = "ws://localhost:48787";

export type AppSettings = {
  theme: Theme;
  density: Density;
  bridgeUrl: string;
};

const DEFAULTS: AppSettings = {
  theme: "slate",
  density: "balanced",
  bridgeUrl: DEFAULT_BRIDGE_URL,
};
const STORAGE_KEY = "msfs-turnaround-settings";

function isValidWsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "ws:" || u.protocol === "wss:";
  } catch {
    return false;
  }
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw);
    return {
      theme: (["slate", "phosphor", "paper", "amber", "midnight", "carbon", "aurora"] as Theme[]).includes(p.theme)
        ? p.theme
        : DEFAULTS.theme,
      density: (["compact", "balanced", "comfy"] as Density[]).includes(p.density)
        ? p.density
        : DEFAULTS.density,
      bridgeUrl:
        typeof p.bridgeUrl === "string" && isValidWsUrl(p.bridgeUrl)
          ? p.bridgeUrl
          : DEFAULTS.bridgeUrl,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.setAttribute("data-theme", settings.theme);
    document.documentElement.setAttribute("data-density", settings.density);
  }, [settings]);

  const setTheme = (theme: Theme) => setSettings((s) => ({ ...s, theme }));
  const setDensity = (density: Density) => setSettings((s) => ({ ...s, density }));
  const setBridgeUrl = (bridgeUrl: string) => {
    if (isValidWsUrl(bridgeUrl)) {
      setSettings((s) => ({ ...s, bridgeUrl }));
    }
  };

  return { settings, setTheme, setDensity, setBridgeUrl, isValidWsUrl };
}
