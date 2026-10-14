import type { MergedCity } from "../hooks/useMetroData";

export type ResearchMetric =
  "annual" | "daily_snapshot" | "mileage" | "stations";
export const RESEARCH_METRICS = {
  annual: { label: "年度日均客流", unit: "万人次 / 日", decimals: 2 },
  daily_snapshot: { label: "日客流快照", unit: "万人次", decimals: 2 },
  mileage: { label: "运营里程", unit: "km", decimals: 1 },
  stations: { label: "运营站点", unit: "座", decimals: 0 },
} as const;

export interface MetricObservation {
  city: string;
  metric: ResearchMetric;
  value: number | null;
  unit: string;
  periodKey: string | null;
  periodLabel: string;
  periodEnded: boolean;
  periodComplete: boolean;
  collectedAt: string | null;
  sourceUrl: string;
  status: "available" | "missing" | "invalid";
  verification: "pending" | "verified";
  systemScope: string | null;
  countingRule: string | null;
  reason: string;
}

/** Keep raw files intact: a missing record must never inherit mergeData's zero defaults. */
export function observe(
  city: MergedCity,
  metric: ResearchMetric,
  year: number,
): MetricObservation {
  const stats = city.stats;
  const yearly = stats?.yearly_avg_ridership;
  const index = yearly?.years.indexOf(year) ?? -1;
  const raw =
    metric === "annual"
      ? index >= 0
        ? yearly?.values[index]
        : null
      : metric === "daily_snapshot"
        ? stats?.daily_ridership_wan
        : metric === "mileage"
          ? stats?.operating_mileage_km
          : stats?.operating_stations;
  const invalidAnnual =
    metric === "annual" &&
    yearly &&
    (yearly.years.length !== yearly.values.length ||
      yearly.years.filter((y) => y === year).length > 1);
  const invalid =
    !!invalidAnnual ||
    (raw !== null &&
      raw !== undefined &&
      (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0));
  // Daily zero is a documented sentinel; annual/station zeros remain explicit observations.
  const zeroSentinel =
    (metric === "daily_snapshot" || metric === "mileage") && raw === 0;
  const value =
    !invalid && !zeroSentinel && typeof raw === "number" ? raw : null;
  const collectedYear = Number(stats?.scrape_date?.slice(0, 4));
  const periodEnded =
    metric === "annual" &&
    Number.isFinite(collectedYear) &&
    collectedYear > year;
  return {
    city: city.city,
    metric,
    value,
    unit: RESEARCH_METRICS[metric].unit,
    periodKey: metric === "annual" ? String(year) : null,
    periodLabel:
      metric === "annual"
        ? `${year} 年${periodEnded ? "" : " · 完整期间待确认"}`
        : "统计时点未提供",
    periodEnded,
    periodComplete: false,
    collectedAt: stats?.scrape_date || null,
    sourceUrl: `https://metrodb.org/index/${city.city}.html`,
    status: invalid ? "invalid" : value === null ? "missing" : "available",
    verification: "pending",
    systemScope: null,
    countingRule: null,
    reason: invalid
      ? "源数据格式异常，暂不展示"
      : value === null
        ? stats
          ? "当前指标未收录有效值"
          : "尚未收录统计资料"
        : "源数据口径待核验",
  };
}

export function formatValue(
  value: number | null,
  metric: ResearchMetric = "annual",
): string {
  return value === null
    ? "—"
    : value.toLocaleString("zh-CN", {
        maximumFractionDigits: RESEARCH_METRICS[metric].decimals,
      });
}

export function availableYears(cities: MergedCity[]): number[] {
  return [
    ...new Set(
      cities.flatMap(
        (c) =>
          c.stats?.yearly_avg_ridership.years.filter(
            (y) => y < Number(c.stats?.scrape_date.slice(0, 4)),
          ) || [],
      ),
    ),
  ].sort((a, b) => b - a);
}

export function parseResearchQuery(
  params: URLSearchParams,
  cities: MergedCity[],
) {
  const rawMetric = params.get("metric");
  const knownMetric =
    rawMetric !== null &&
    Object.prototype.hasOwnProperty.call(RESEARCH_METRICS, rawMetric);
  const metric: ResearchMetric = knownMetric
    ? (rawMetric as ResearchMetric)
    : "annual";
  const years = availableYears(cities);
  const requestedYear = Number(params.get("year"));
  const year = years.includes(requestedYear)
    ? requestedYear
    : (years[0] ?? new Date().getFullYear() - 1);
  return {
    metric,
    year,
    years,
    keyword: params.get("q") || "",
    strict: params.get("mode") === "strict",
    invalidYear:
      metric === "annual" &&
      params.has("year") &&
      !years.includes(requestedYear),
    invalidMetric: rawMetric !== null && !knownMetric,
  };
}

export function filterCities(cities: MergedCity[], keyword: string) {
  const q = keyword.trim().toLowerCase();
  const exact = cities.filter(
    (c) => c.city_cn === q || c.city.toLowerCase() === q,
  );
  if (exact.length) return exact;
  return cities.filter(
    (c) => c.city_cn.includes(q) || c.city.toLowerCase().includes(q),
  );
}

export function normalizeCities(
  raw: string,
  allowed: readonly string[],
): { ids: string[]; adjusted: boolean } {
  const input = raw.split(",").filter(Boolean);
  const ids = [...new Set(input.filter((id) => allowed.includes(id)))].slice(
    0,
    5,
  );
  return { ids, adjusted: input.join(",") !== ids.join(",") };
}

/** Unknown metadata must never be considered equal to unknown metadata. */
export function comparisonIssues(observations: MetricObservation[]): string[] {
  if (observations.length < 2) return ["至少选择 2 个城市"];
  const issues: string[] = [];
  if (observations.some((o) => o.value === null))
    issues.push("部分城市缺少当前指标");
  if (observations.some((o) => o.verification !== "verified"))
    issues.push("源数据口径尚未核验");
  if (observations.some((o) => !o.periodKey || !o.periodComplete))
    issues.push("统计期间未知或尚未确认完整");
  if (observations.some((o) => !o.systemScope || !o.countingRule))
    issues.push("系统覆盖范围或计数规则未提供");
  for (const field of [
    "metric",
    "unit",
    "periodKey",
    "systemScope",
    "countingRule",
  ] as const) {
    if (new Set(observations.map((o) => o[field])).size > 1)
      issues.push("指标、单位、期间或统计范围不一致");
  }
  return [...new Set(issues)];
}

export function citation(
  city: MergedCity,
  metric: ResearchMetric,
  year: number,
) {
  const o = observe(city, metric, year);
  return `${city.city_cn} · ${RESEARCH_METRICS[metric].label}：${formatValue(o.value, metric)} ${o.unit}；${o.periodLabel}；采集日 ${o.collectedAt || "未提供"}；来源 MetroDB ${o.sourceUrl}；${o.reason}。`;
}

// ID-derived color remains stable when cities are sorted, removed, or re-added.
export function cityColor(id: string): string {
  const palette = [
    "#3478df",
    "#169b95",
    "#bc833a",
    "#8570c0",
    "#53926e",
    "#bc6780",
    "#617792",
  ];
  const hash = Array.from(id).reduce(
    (n, c) => (n * 31 + c.charCodeAt(0)) >>> 0,
    0,
  );
  return palette[hash % palette.length];
}

export function collectionAgeDays(
  date: string | null | undefined,
  now = new Date(),
): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const days = Math.floor(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) /
      86400000,
  );
  return Number.isFinite(days) ? Math.max(0, days) : null;
}
