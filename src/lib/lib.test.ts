import { describe, expect, it } from "vitest";
import { align, blend, buildGrid, modelSeries } from "./blend";
import { parseRawMetar } from "./metar";
import { MODEL_BY_ID } from "./models";
import { normalize } from "./openmeteo";
import { beginnerScore, freeflyScore, hourInput, ramp, summarizeDays, type SpotHourly } from "./scoring";
import { summarizeEnsemble } from "./server/ensemble";
import { hourlyObs } from "./server/observations";
import { SPOT_BY_ID, SPOTS } from "./spots";
import { localParts } from "./time";
import { angleDiff, compassName, dirQuality, meanDirection } from "./wind";

const T0 = Date.UTC(2026, 9, 10, 0) / 1000; // 10 oct. 2026 00:00 UTC (02:00 à Rome)

describe("wind helpers", () => {
  it("compass names", () => {
    expect(compassName(0)).toBe("N");
    expect(compassName(315)).toBe("NW");
    expect(compassName(359)).toBe("N");
    expect(compassName(-45)).toBe("NW");
  });
  it("angleDiff wraps around", () => {
    expect(angleDiff(350, 10)).toBe(20);
    expect(angleDiff(90, 270)).toBe(180);
  });
  it("vector mean of directions", () => {
    expect(Math.round(meanDirection([350, 10])!)).toBe(0);
    expect(meanDirection([0, 180])).toBeNull();
  });
  it("Poetto: Mistral is offshore, Scirocco is fine", () => {
    const poetto = SPOT_BY_ID["poetto"];
    expect(dirQuality(poetto, 330)).toBe("offshore");
    expect(["good", "ok"]).toContain(dirQuality(poetto, 135));
  });
  it("Capo Mannu: Mistral works", () => {
    expect(["good", "ok"]).toContain(dirQuality(SPOT_BY_ID["capo-mannu"], 315));
  });
  it("Punta Trettu lagoon: Mistral is good, never offshore", () => {
    const pt = SPOT_BY_ID["punta-trettu"];
    expect(dirQuality(pt, 315)).toBe("good");
    for (let d = 0; d < 360; d += 22.5) expect(dirQuality(pt, d)).not.toBe("offshore");
  });
  it("every spot has at least 3 good sectors and valid coordinates", () => {
    for (const s of SPOTS) {
      let good = 0;
      for (let d = 0; d < 360; d += 22.5) if (dirQuality(s, d) === "good") good++;
      expect(good, s.id).toBeGreaterThanOrEqual(3);
      expect(s.lat).toBeGreaterThan(38.8);
      expect(s.lat).toBeLessThan(41.35);
      expect(s.lon).toBeGreaterThan(8.1);
      expect(s.lon).toBeLessThan(9.85);
    }
  });
});

describe("scoring", () => {
  it("ramp interpolates and clamps", () => {
    expect(ramp(5, [[0, 0], [10, 1]])).toBe(0.5);
    expect(ramp(-1, [[0, 0], [10, 1]])).toBe(0);
    expect(ramp(99, [[0, 0], [10, 1]])).toBe(1);
  });
  const pt = SPOT_BY_ID["punta-trettu"];
  const base = { cloud: 10, precip: 0, temp: 23, wave: 0.3 };
  it("beginner: 15 kn NW at Punta Trettu is ideal", () => {
    expect(beginnerScore(pt, { ...base, w: 15, g: 19, d: 315 })).toBeGreaterThan(90);
  });
  it("beginner: too much wind or offshore gives ~0", () => {
    expect(beginnerScore(pt, { ...base, w: 28, g: 36, d: 315 })).toBe(0);
    expect(beginnerScore(SPOT_BY_ID["poetto"], { ...base, w: 15, g: 19, d: 330 })).toBe(0);
  });
  it("beginner: wave spot is penalised", () => {
    const cm = SPOT_BY_ID["capo-mannu"];
    expect(beginnerScore(cm, { ...base, w: 15, g: 19, d: 300, wave: 2 })).toBeLessThan(10);
  });
  it("freefly: Capo Mannu with 20 kn Mistral and 1.5 m swell is great", () => {
    const cm = SPOT_BY_ID["capo-mannu"];
    expect(freeflyScore(cm, { ...base, w: 20, g: 26, d: 320, wave: 1.5 })).toBeGreaterThan(70);
  });
  it("10 kn established is the minimum", () => {
    expect(beginnerScore(pt, { ...base, w: 9, g: 12, d: 315 })).toBe(0);
    expect(beginnerScore(pt, { ...base, w: 10, g: 13, d: 315 })).toBeGreaterThan(40);
    expect(freeflyScore(SPOT_BY_ID["capo-mannu"], { ...base, w: 9, g: 12, d: 315, wave: 1.5 })).toBe(0);
  });
  it("thermal correction only applies to thermal spots in the afternoon", () => {
    const t = [Date.UTC(2026, 9, 12, 7) / 1000, Date.UTC(2026, 9, 12, 13) / 1000]; // 9h et 15h à Rome
    const s = { time: t, w: [10, 10], g: [12, 12], d: [315, 315], wave: [0, 0], cloud: [0, 0], precip: [0, 0], temp: [20, 20] } as unknown as SpotHourly;
    expect(hourInput(s, 0, pt, 0.2).w).toBe(10);
    expect(hourInput(s, 1, pt, 0.2).w).toBe(12);
    expect(hourInput(s, 1, SPOT_BY_ID["capo-mannu"], 0.2).w).toBe(10);
  });
  it("summarizeDays groups by local date within riding hours", () => {
    const time = buildGrid(T0, 48);
    const n = time.length;
    const s: SpotHourly = {
      time,
      w: time.map(() => 15),
      g: time.map(() => 19),
      d: time.map(() => 315),
      spread: time.map(() => 3),
      n: time.map(() => 3),
      temp: time.map(() => 22),
      cloud: time.map(() => 10),
      precip: time.map(() => 0),
      wave: time.map(() => 0.3),
      wavePer: Array(n).fill(5),
      waveDir: Array(n).fill(300),
      swell: Array(n).fill(0.2),
      sst: Array(n).fill(22),
    };
    const days = summarizeDays(pt, s, "debutante");
    expect(days.map((d) => d.date)).toEqual(["2026-10-10", "2026-10-11"]);
    expect(days[0].score).toBeGreaterThan(90);
    expect(days[0].goodHours).toBe(9); // 10h..18h inclus
    expect(days[0].window).toBe("10h–19h");
  });
});

describe("blend", () => {
  const grid = buildGrid(T0, 4);
  const p = (w: number) => ({
    time: grid,
    vars: {
      wind_speed_10m: grid.map(() => w),
      wind_gusts_10m: grid.map(() => null),
      wind_direction_10m: grid.map(() => 300),
      temperature_2m: grid.map(() => 20),
      cloud_cover: grid.map(() => 50),
      precipitation: grid.map(() => 0),
    },
  });
  it("short range: AROME HD (1) + ICON-2I (1) + ICON-EU (0.5)", () => {
    const ms = [
      modelSeries(MODEL_BY_ID["arome_hd"], p(20), grid),
      modelSeries(MODEL_BY_ID["icon_2i"], p(10), grid),
      modelSeries(MODEL_BY_ID["icon_eu"], p(5), grid),
      modelSeries(MODEL_BY_ID["aifs"], p(50), grid), // poids 0
    ];
    const b = blend(ms, grid, T0);
    expect(b.w[0]).toBe(13); // (20 + 10 + 2.5) / 2.5
    expect(b.n[0]).toBe(3);
    expect(b.spread[0]).toBe(15);
    expect(b.g[0]).toBeNull();
    expect(b.d[0]).toBe(300);
  });
  it("missing model data is ignored", () => {
    const ms = [modelSeries(MODEL_BY_ID["arome_hd"], null, grid), modelSeries(MODEL_BY_ID["icon_2i"], p(10), grid)];
    const b = blend(ms, grid, T0);
    expect(b.w[0]).toBe(10);
    expect(b.spread[0]).toBeNull();
  });
  it("align maps by timestamp", () => {
    const series = { time: [grid[1], grid[2]], vars: { x: [1, 2] } };
    expect(align(series, "x", grid)).toEqual([null, 1, 2, null]);
  });
});

describe("open-meteo normalize", () => {
  it("handles single object and strips model suffix", () => {
    const r = normalize({ hourly: { time: [1, 2], wind_speed_10m_icon_eu: [3, 4] } }, "icon_eu");
    expect(r[0].vars.wind_speed_10m).toEqual([3, 4]);
  });
  it("handles arrays and throws on API errors", () => {
    expect(normalize([{ hourly: { time: [1], a: [1] } }, { hourly: { time: [1], a: [2] } }])).toHaveLength(2);
    expect(() => normalize({ error: true, reason: "Invalid model" })).toThrow("Invalid model");
  });
});

describe("METAR", () => {
  const now = Date.UTC(2026, 9, 12, 14, 0);
  it("parses wind with gusts", () => {
    const o = parseRawMetar("LIEE 121350Z 31018G28KT 9999 FEW030 22/12 Q1012", now)!;
    expect(o.time).toBe(Date.UTC(2026, 9, 12, 13, 50) / 1000);
    expect(o).toMatchObject({ dir: 310, speed: 18, gust: 28, temp: 22 });
  });
  it("parses variable wind and MPS", () => {
    expect(parseRawMetar("LIEO 121350Z VRB03KT CAVOK 20/10 Q1015", now)).toMatchObject({ dir: null, speed: 3 });
    expect(parseRawMetar("XXXX 121350Z 18010MPS 9999 M02/M05 Q1015", now)).toMatchObject({ speed: 19, temp: -2 });
  });
  it("handles previous month day", () => {
    const o = parseRawMetar("LIEE 302350Z 00000KT 9999 15/10 Q1015", Date.UTC(2026, 9, 1, 0, 30))!;
    expect(o.time).toBe(Date.UTC(2026, 8, 30, 23, 50) / 1000);
  });
  it("hourlyObs keeps daytime obs closest to the hour", () => {
    // 12:00 UTC = 14h à Rome
    const h = Date.UTC(2026, 9, 12, 12) / 1000;
    const m = hourlyObs([
      { time: h - 10 * 60, dir: 300, speed: 10, gust: null, temp: null, raw: "" },
      { time: h + 5 * 60, dir: 300, speed: 12, gust: null, temp: null, raw: "" },
      { time: h - 9 * 3600, dir: 300, speed: 30, gust: null, temp: null, raw: "" }, // nuit
    ]);
    expect([...m.entries()]).toEqual([[h, 12]]);
  });
});

describe("ensemble", () => {
  it("computes percentiles and probabilities per local day", () => {
    const time = buildGrid(T0, 24);
    const vars: Record<string, (number | null)[]> = {};
    for (let m = 0; m <= 9; m++) {
      const suffix = m === 0 ? "" : `_member${String(m).padStart(2, "0")}`;
      vars[`wind_speed_10m${suffix}`] = time.map(() => m * 2 + 4); // 4..22
      vars[`wind_direction_10m${suffix}`] = time.map(() => (m < 5 ? 315 : 135));
    }
    const days = summarizeEnsemble({ time, vars });
    const d = days.find((x) => x.date === localParts(T0 + 12 * 3600).date)!;
    expect(d.members).toBe(10);
    expect(d.p50).toBe(13);
    expect(d.pRide).toBe(70); // 4,6,…,22 → 7 membres sur 10 ≥ 10 nds
    expect(d.pMistral).toBe(20);
    expect(d.pScirocco).toBe(50);
  });
});

describe("wings", () => {
  it("chooses wing size per rider", async () => {
    const { wingFor, wingPlan } = await import("./wings");
    expect(wingFor(8, 10, "debutante")).toBe("light");
    expect(wingFor(14, 18, "debutante")).toBe("5");
    expect(wingFor(18, 24, "debutante")).toBe("3.5");
    expect(wingFor(18, 24, "confirme")).toBe("5");
    expect(wingFor(25, 33, "debutante")).toBe("strong");
    expect(wingFor(25, 33, "confirme")).toBe("3.5");
    expect(wingPlan(14, 18).text).toContain("à tour de rôle");
    expect(wingPlan(19, 25).text).toBe("elle 3,5 m · toi 5 m");
  });
});
