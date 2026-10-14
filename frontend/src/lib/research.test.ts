import { describe, expect, it } from "vitest";
import type { MergedCity } from "../hooks/useMetroData";
import {
  availableYears,
  citation,
  collectionAgeDays,
  cityColor,
  comparisonIssues,
  filterCities,
  normalizeCities,
  observe,
  parseResearchQuery,
} from "./research";

function city(id = "hangzhou", cn = "杭州"): MergedCity {
  return {
    city: id,
    city_cn: cn,
    stats: {
      city: id,
      city_cn: cn,
      scrape_date: "2026-05-08",
      daily_ridership_wan: 0,
      operating_lines: 12,
      lines_under_construction: 0,
      operating_stations: 250,
      operating_mileage_km: 516,
      ridership_intensity: 0,
      peak_ridership_wan: 0,
      peak_ridership_date: "",
      yearly_avg_ridership: {
        years: [2022, 2023, 2024, 2025, 2026],
        values: [200, 300, 400, 423.52, 410],
      },
    },
    daily_ridership_wan: 0,
    operating_mileage_km: 516,
  } as MergedCity;
}

describe("research data boundaries (AC-01–04, AC-09–10)", () => {
  it("keeps Hangzhou annual records when its daily snapshot is missing", () => {
    expect(observe(city(), "annual", 2025).value).toBe(423.52);
    expect(observe(city(), "daily_snapshot", 2025).value).toBeNull();
  });
  it("does not expose merge-layer zeros for cities without stats", () => {
    const missing = {
      ...city("fuzhou", "福州"),
      stats: null,
      operating_mileage_km: 0,
    };
    expect(observe(missing, "mileage", 2025).status).toBe("missing");
    expect(observe(missing, "stations", 2025).value).toBeNull();
  });
  it("does not mutate valid zero construction counts or raw data", () => {
    const c = city();
    const before = JSON.stringify(c);
    observe(c, "daily_snapshot", 2025);
    expect(c.stats?.lines_under_construction).toBe(0);
    expect(JSON.stringify(c)).toBe(before);
  });
  it("distinguishes Xiamen snapshot 81.58 from annual 75.68", () => {
    const c = city("xiamen", "厦门");
    c.stats!.daily_ridership_wan = 81.58;
    c.stats!.yearly_avg_ridership.values[3] = 75.68;
    expect(observe(c, "daily_snapshot", 2025).value).toBe(81.58);
    expect(observe(c, "annual", 2025).value).toBe(75.68);
  });
  it("does not treat collection date as observation date", () => {
    const o = observe(city(), "daily_snapshot", 2025);
    expect(o.collectedAt).toBe("2026-05-08");
    expect(o.periodKey).toBeNull();
    expect(observe(city(), "mileage", 2025).periodLabel).toBe("统计时点未提供");
  });
  it("excludes a partial collection year from completed annual selection", () => {
    expect(availableYears([city()])).toEqual([2025, 2024, 2023, 2022]);
    expect(observe(city(), "annual", 2026).periodEnded).toBe(false);
    expect(observe(city(), "annual", 2025).periodComplete).toBe(false);
  });
  it("preserves gaps and rejects non-finite observations", () => {
    const c = city();
    c.stats!.yearly_avg_ridership.values[3] = NaN;
    expect(observe(c, "annual", 2025).value).toBeNull();
    expect(observe(c, "annual", 2020).value).toBeNull();
  });
  it("does not equate unknown scopes or unverified sources", () => {
    const a = observe(city(), "annual", 2025),
      b = { ...a, city: "shanghai" };
    expect(comparisonIssues([a, b])).toContain("系统覆盖范围或计数规则未提供");
    expect(comparisonIssues([a, b])).toContain("源数据口径尚未核验");
  });
  it("allows verified matching observations and rejects mismatched periods", () => {
    const a = {
      ...observe(city(), "annual", 2025),
      verification: "verified" as const,
      periodComplete: true,
      systemScope: "metro",
      countingRule: "entry",
    };
    expect(comparisonIssues([a, { ...a, city: "shanghai" }])).toEqual([]);
    expect(comparisonIssues([a, { ...a, periodKey: "2024" }])).not.toEqual([]);
  });
  it("reports missing cities and partial periods explicitly", () => {
    const a = observe(city(), "annual", 2026),
      b = { ...a, value: null };
    expect(comparisonIssues([a, b])).toContain("部分城市缺少当前指标");
    expect(comparisonIssues([a, b])).toContain("统计期间未知或尚未确认完整");
  });
});

describe("invalid-source and calendar guards", () => {
  it("rejects malformed annual arrays and duplicate years", () => {
    const c = city();
    c.stats!.yearly_avg_ridership.years.push(2025);
    c.stats!.yearly_avg_ridership.values.push(500);
    expect(observe(c, "annual", 2025).status).toBe("invalid");
    c.stats!.yearly_avg_ridership.years.pop();
    expect(observe(c, "annual", 2025).status).toBe("invalid");
  });
  it("keeps explicit annual zero and rejects inherited metric keys", () => {
    const c = city();
    c.stats!.yearly_avg_ridership.values[3] = 0;
    expect(observe(c, "annual", 2025).value).toBe(0);
    expect(
      parseResearchQuery(new URLSearchParams("metric=constructor"), [c])
        .invalidMetric,
    ).toBe(true);
  });
  it("counts freshness by Shanghai calendar day", () => {
    expect(
      collectionAgeDays("2026-10-12", new Date("2026-10-12T16:01:00Z")),
    ).toBe(1);
    expect(collectionAgeDays(null)).toBeNull();
  });
});

describe("research navigation and citation (AC-07, AC-13)", () => {
  it("deduplicates, validates and caps shared selection at five", () => {
    expect(
      normalizeCities("a,b,a,x,c,d,e,f", ["a", "b", "c", "d", "e", "f"]),
    ).toEqual({ ids: ["a", "b", "c", "d", "e"], adjusted: true });
  });
  it("retains a single choice without silently populating a sample", () => {
    expect(normalizeCities("a", ["a", "b"]).ids).toEqual(["a"]);
    expect(comparisonIssues([observe(city(), "annual", 2025)])).toEqual([
      "至少选择 2 个城市",
    ]);
  });
  it("handles invalid years and metrics with explicit correction flags", () => {
    const parsed = parseResearchQuery(
      new URLSearchParams("metric=unknown&year=2026"),
      [city()],
    );
    expect(parsed.year).toBe(2025);
    expect(parsed.invalidYear).toBe(true);
    expect(parsed.invalidMetric).toBe(true);
  });
  it("supports Chinese and case-insensitive pinyin search", () => {
    expect(filterCities([city()], " 杭州 ")).toHaveLength(1);
    expect(filterCities([city()], "HANG")).toHaveLength(1);
    expect(
      filterCities([city(), city("changzhou", "常州")], "hangzhou").map(
        (c) => c.city,
      ),
    ).toEqual(["hangzhou"]);
  });
  it("includes value, unit, period, collection and pending status in citations", () => {
    const c = citation(city(), "annual", 2025);
    for (const value of [
      "杭州",
      "423.52",
      "万人次 / 日",
      "2025 年",
      "2026-05-08",
      "https://metrodb.org/index/hangzhou.html",
      "待核验",
    ])
      expect(c).toContain(value);
  });
  it("keeps series colors stable and returns valid hex colors", () => {
    expect(cityColor("shanghai")).toMatch(/^#[0-9a-f]{6}$/);
    expect(["beijing", "shanghai"].map(cityColor)[1]).toBe(
      ["shanghai", "beijing"].map(cityColor)[0],
    );
  });
});
