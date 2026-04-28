import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AircraftKey = "A320" | "B737" | "C172";
export type ApproachKey = "ILS" | "RNAV" | "VISUAL";
export type Stability = "stable" | "caution" | "unstable";
export type Phase = "preflight" | "approach" | "landing" | "landed";

export type AircraftProfile = {
  code: string;
  name: string;
  operator: string;
  icao: string;
  flapStops: string[];
  vRef: number;
  vApp: number;
  gearSpeed: number;
  flapsLandingIdx: number;
  weightKg: number;
  color: string;
};

export type ApproachPreset = {
  name: string;
  full: string;
  course: number;
  freq: string;
  minimumsFt: number;
  minimumsKind: string;
  glideslopeDeg: number;
};

export type Runway = typeof RWY;

export const AIRCRAFT_PROFILES: Record<AircraftKey, AircraftProfile> = {
  A320: {
    code: "A320",
    name: "Airbus A320-251N",
    operator: "FlyByWire A32NX",
    icao: "A320",
    flapStops: ["UP", "1", "2", "3", "FULL"],
    vRef: 138,
    vApp: 142,
    gearSpeed: 250,
    flapsLandingIdx: 4,
    weightKg: 64200,
    color: "#5b8dbf",
  },
  B737: {
    code: "B738",
    name: "Boeing 737-800",
    operator: "PMDG",
    icao: "B738",
    flapStops: ["UP", "1", "5", "15", "25", "30", "40"],
    vRef: 142,
    vApp: 147,
    gearSpeed: 270,
    flapsLandingIdx: 5,
    weightKg: 65300,
    color: "#3f6d99",
  },
  C172: {
    code: "C172",
    name: "Cessna 172 Skyhawk",
    operator: "Asobo",
    icao: "C172",
    flapStops: ["UP", "10°", "20°", "30°"],
    vRef: 65,
    vApp: 70,
    gearSpeed: 0,
    flapsLandingIdx: 3,
    weightKg: 1080,
    color: "#a08860",
  },
};

export const APPROACH_PRESETS: Record<ApproachKey, ApproachPreset> = {
  ILS: {
    name: "ILS",
    full: "ILS Z RWY 28R",
    course: 281,
    freq: "111.70",
    minimumsFt: 211,
    minimumsKind: "DH",
    glideslopeDeg: 3.0,
  },
  RNAV: {
    name: "RNAV",
    full: "RNAV (GPS) Y RWY 28R",
    course: 281,
    freq: "—",
    minimumsFt: 250,
    minimumsKind: "DA",
    glideslopeDeg: 3.0,
  },
  VISUAL: {
    name: "VISUAL",
    full: "Visual Approach RWY 28R",
    course: 281,
    freq: "—",
    minimumsFt: 0,
    minimumsKind: "—",
    glideslopeDeg: 3.0,
  },
};

const PHASES: Array<{ id: Phase; label: string; t: number }> = [
  { id: "preflight", label: "PREFLIGHT", t: 0 },
  { id: "approach", label: "APPROACH", t: 0.05 },
  { id: "landing", label: "LANDING", t: 0.85 },
  { id: "landed", label: "LANDED", t: 1.0 },
];

export const RWY = {
  airport: "KSFO",
  airportName: "San Francisco Intl",
  runway: "28R",
  oppositeRunway: "10L",
  course: 281,
  lengthFt: 11870,
  widthFt: 200,
  thresholdElevFt: 13,
  ilsFreq: "111.70",
};

export type TrajectorySample = {
  distNm: number;
  altAGL: number;
  altMSL: number;
  ias: number;
  groundSpeedKt: number;
  vs: number;
  locDev: number;
  gsDev: number;
  hdgErr: number;
  heading: number;
  flapsIdx: number;
  gearDown: boolean;
  lat: number;
  lon: number;
};

export type TrajectoryRecord = {
  t: number;
  distNm: number;
  altAGL: number;
  ias: number;
  vs: number;
  locDev: number;
  gsDev: number;
  heading: number;
};

export type LandingReport = {
  vsTouchdown: number;
  iasTouchdown: number;
  pitchDeg: number;
  bankDeg: number;
  gForce: number;
  distFromThreshFt: number;
  centerlineDevFt: number;
  headingDevDeg: number;
  flareQuality: "Good" | "Late" | "Flat";
  bounce: number;
  overall: number;
  letter: "A" | "B" | "C" | "D" | "E";
  breakdown: Array<{ k: string; v: number; weight: number }>;
};

function trajectory(t: number, stability: Stability = "stable"): TrajectorySample {
  const distNm = 12 - t * 12.4;
  const distFt = Math.max(0, distNm * 6076);
  let altAGL = Math.tan((3 * Math.PI) / 180) * distFt;
  if (t > 0.96) {
    const k = (t - 0.96) / 0.04;
    altAGL = altAGL * Math.max(0, 1 - k * 1.2);
  }
  if (t >= 1) altAGL = 0;
  const altMSL = altAGL + RWY.thresholdElevFt;

  let ias: number;
  if (t < 0.7) ias = 220 - (220 - 160) * (t / 0.7);
  else if (t < 0.95) ias = 160 - (160 - 142) * ((t - 0.7) / 0.25);
  else if (t < 1.0) ias = 142 - 8 * ((t - 0.95) / 0.05);
  else ias = Math.max(40, 134 - (t - 1.0) * 800);

  const groundSpeedKt = Math.max(45, ias - 8);
  const vsFpm = -groundSpeedKt * 101.27 * Math.tan((3 * Math.PI) / 180);
  let vs = vsFpm;
  if (t > 0.96 && t < 1.0) vs = vsFpm * (1 - ((t - 0.96) / 0.04) * 0.85);
  if (t >= 1) vs = 0;

  const wob = (freq: number, amp: number, phase = 0) =>
    Math.sin(t * freq + phase) * amp + Math.sin(t * freq * 2.7 + phase) * amp * 0.4;

  let locDev = 0,
    gsDev = 0,
    hdgErr = 0;
  if (stability === "stable") {
    locDev = wob(11, 0.18);
    gsDev = wob(13, 0.2, 1);
    hdgErr = wob(7, 0.6);
  } else if (stability === "caution") {
    locDev = wob(9, 0.55, 0.3) + (t < 0.5 ? 0.3 : 0);
    gsDev = wob(8, 0.55, 1.1);
    hdgErr = wob(6, 1.8);
  } else {
    locDev = wob(7, 1.1, 0.6) + 0.4;
    gsDev = wob(6, 1.0, 0.2) - 0.3;
    hdgErr = wob(5, 3.5);
  }

  const heading = (RWY.course + hdgErr + 360) % 360;

  let flapsIdx = 0;
  if (t > 0.05) flapsIdx = 1;
  if (t > 0.2) flapsIdx = 2;
  if (t > 0.45) flapsIdx = 3;
  if (t > 0.65) flapsIdx = 4;
  const gearDown = t > 0.55;

  const thrLat = 37.6213,
    thrLon = -122.3568;
  const bearingRad = ((281 + 180) * Math.PI) / 180;
  const distMeters = Math.max(0, distNm * 1852);
  const dLat = (distMeters * Math.cos(bearingRad)) / 111320;
  const dLon =
    (distMeters * Math.sin(bearingRad)) / (111320 * Math.cos((thrLat * Math.PI) / 180));

  return {
    distNm,
    altAGL: Math.max(0, altAGL),
    altMSL: Math.max(RWY.thresholdElevFt, altMSL),
    ias: Math.max(0, ias),
    groundSpeedKt: Math.max(0, groundSpeedKt),
    vs,
    locDev,
    gsDev,
    hdgErr,
    heading,
    flapsIdx,
    gearDown,
    lat: thrLat + dLat,
    lon: thrLon + dLon,
  };
}

function computeLandingReport(
  stability: Stability,
  aircraftProfile: AircraftProfile
): LandingReport {
  const isStable = stability === "stable";
  const isCaution = stability === "caution";

  const vsTouchdown = isStable ? -142 : isCaution ? -245 : -440;
  const iasTouchdown = aircraftProfile.vRef + (isStable ? -3 : isCaution ? 4 : 12);
  const pitchDeg = isStable ? 4.2 : isCaution ? 2.8 : 1.1;
  const bankDeg = isStable ? 0.4 : isCaution ? 1.6 : 3.4;
  const gForce = isStable ? 1.18 : isCaution ? 1.42 : 1.85;
  const distFromThreshFt = isStable ? 1280 : isCaution ? 1850 : 2640;
  const centerlineDevFt = isStable ? 4 : isCaution ? 9 : 22;
  const headingDevDeg = isStable ? 0.3 : isCaution ? 1.4 : 3.8;
  const flareQuality: "Good" | "Late" | "Flat" = isStable
    ? "Good"
    : isCaution
      ? "Late"
      : "Flat";
  const bounce = !isStable && Math.random() > 0.5 ? 1 : 0;

  const grade = (v: number, ranges: number[]) => {
    for (let i = 0; i < ranges.length; i++) {
      if (Math.abs(v) <= ranges[i]) return 100 - i * 18;
    }
    return 10;
  };
  const sVS = grade(vsTouchdown, [180, 280, 400, 500]);
  const sCL = grade(centerlineDevFt, [6, 12, 20, 30]);
  const sHdg = grade(headingDevDeg, [0.6, 1.6, 3.0, 5]);
  const sG = grade(gForce - 1, [0.25, 0.45, 0.7, 1]);
  const sIAS = grade(iasTouchdown - aircraftProfile.vRef, [3, 6, 10, 15]);

  const overall = Math.round(sVS * 0.35 + sCL * 0.2 + sHdg * 0.15 + sG * 0.2 + sIAS * 0.1);
  const letter: LandingReport["letter"] =
    overall >= 90 ? "A" : overall >= 80 ? "B" : overall >= 70 ? "C" : overall >= 60 ? "D" : "E";

  return {
    vsTouchdown,
    iasTouchdown,
    pitchDeg,
    bankDeg,
    gForce,
    distFromThreshFt,
    centerlineDevFt,
    headingDevDeg,
    flareQuality,
    bounce,
    overall,
    letter,
    breakdown: [
      { k: "Touchdown rate", v: sVS, weight: 35 },
      { k: "Centerline", v: sCL, weight: 20 },
      { k: "G-load", v: sG, weight: 20 },
      { k: "Heading", v: sHdg, weight: 15 },
      { k: "Speed control", v: sIAS, weight: 10 },
    ],
  };
}

export type SimState = {
  connected: boolean;
  bridgeOk: boolean;
  simRate: string;
  aircraft: AircraftProfile;
  approach: ApproachPreset;
  runway: typeof RWY;
  phase: Phase;
  t: number;
  ias: number;
  groundSpeedKt: number;
  altMSL: number;
  altAGL: number;
  vs: number;
  heading: number;
  headingTarget: number;
  hdgErr: number;
  locDev: number;
  gsDev: number;
  flapsIdx: number;
  flapsLabel: string;
  gearDown: boolean;
  distNm: number;
  lat: number;
  lon: number;
  onApproachIas: boolean;
  stability: Stability;
  trajectoryHistory: TrajectoryRecord[];
  report: LandingReport | null;
};

export type SimActions = {
  setPhase: (p: Phase) => void;
  jumpTo: (p: Phase) => void;
  setPaused: (v: boolean) => void;
  paused: boolean;
  setAircraft: (k: AircraftKey) => void;
  setApproach: (k: ApproachKey) => void;
  setStability: (s: Stability) => void;
};

export type UseSimResult = { state: SimState; actions: SimActions };

export type UseSimOptions = {
  aircraft?: AircraftKey;
  approach?: ApproachKey;
  stability?: Stability;
  initialPhase?: Phase;
  running?: boolean;
};

export function useSim({
  aircraft = "A320",
  approach = "ILS",
  stability = "stable",
  initialPhase = "approach",
  running = true,
}: UseSimOptions = {}): UseSimResult {
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [t, setT] = useState<number>(
    () => PHASES.find((p) => p.id === initialPhase)?.t ?? 0.05
  );
  const [paused, setPaused] = useState<boolean>(!running);
  const [aircraftKey, setAircraftKey] = useState<AircraftKey>(aircraft);
  const [approachKey, setApproachKey] = useState<ApproachKey>(approach);
  const [stab, setStab] = useState<Stability>(stability);
  const [trajectoryHistory, setTrajectoryHistory] = useState<TrajectoryRecord[]>([]);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const jumpTo = useCallback((phaseId: Phase) => {
    const p = PHASES.find((pp) => pp.id === phaseId);
    if (!p) return;
    setPhase(phaseId);
    setT(p.t);
    if (phaseId !== "landed") {
      setTrajectoryHistory([]);
    }
  }, []);

  useEffect(() => {
    if (paused) return;
    if (phase === "preflight" || phase === "landed") return;
    let raf = 0;
    let last = performance.now();
    const speed = phase === "approach" ? 0.0034 : 0.006;
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setT((prev) => {
        const next = prev + dt * speed;
        if (next >= 1) {
          setPhase("landed");
          return 1;
        }
        if (next >= 0.85 && phaseRef.current === "approach") {
          setPhase("landing");
        }
        return next;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [paused, phase]);

  const sample: TrajectorySample = useMemo(() => {
    if (phase === "preflight") {
      return {
        distNm: 12,
        altAGL: 0,
        altMSL: RWY.thresholdElevFt,
        ias: 0,
        groundSpeedKt: 0,
        vs: 0,
        locDev: 0,
        gsDev: 0,
        hdgErr: 0,
        heading: RWY.course,
        flapsIdx: 0,
        gearDown: false,
        lat: 37.6213,
        lon: -122.3568,
      };
    }
    return trajectory(t, stab);
  }, [t, stab, phase]);

  useEffect(() => {
    if (phase === "preflight" || phase === "landed") return;
    setTrajectoryHistory((prev) => {
      const last = prev[prev.length - 1];
      if (!last || Math.abs(last.t - t) > 0.005) {
        return [
          ...prev,
          {
            t,
            distNm: sample.distNm,
            altAGL: sample.altAGL,
            ias: sample.ias,
            vs: sample.vs,
            locDev: sample.locDev,
            gsDev: sample.gsDev,
            heading: sample.heading,
          },
        ];
      }
      return prev;
    });
  }, [t, phase, sample]);

  const aircraftProfile = AIRCRAFT_PROFILES[aircraftKey];
  const approachData = APPROACH_PRESETS[approachKey];

  const report = useMemo<LandingReport | null>(() => {
    if (phase !== "landed") return null;
    return computeLandingReport(stab, aircraftProfile);
  }, [phase, stab, aircraftProfile]);

  const flapsLabel = aircraftProfile.flapStops[sample.flapsIdx] ?? "UP";
  const onApproachIas = phase === "approach" || phase === "landing";

  return {
    state: {
      connected: true,
      bridgeOk: true,
      simRate: "1.0×",
      aircraft: aircraftProfile,
      approach: approachData,
      runway: RWY,
      phase,
      t,
      ias: sample.ias,
      groundSpeedKt: sample.groundSpeedKt,
      altMSL: sample.altMSL,
      altAGL: sample.altAGL,
      vs: sample.vs,
      heading: sample.heading,
      headingTarget: RWY.course,
      hdgErr: sample.hdgErr,
      locDev: sample.locDev,
      gsDev: sample.gsDev,
      flapsIdx: sample.flapsIdx,
      flapsLabel,
      gearDown: sample.gearDown,
      distNm: sample.distNm,
      lat: sample.lat,
      lon: sample.lon,
      onApproachIas,
      stability: stab,
      trajectoryHistory,
      report,
    },
    actions: {
      setPhase,
      jumpTo,
      setPaused,
      paused,
      setAircraft: setAircraftKey,
      setApproach: setApproachKey,
      setStability: setStab,
    },
  };
}
