import { Link, useSearchParams } from "react-router-dom";
import { useMetroData } from "../hooks/useMetroData";
import {
  filterCities,
  formatValue,
  observe,
  parseResearchQuery,
  RESEARCH_METRICS,
} from "../lib/research";
import {
  CityTable,
  BasketButton,
  ComparisonTray,
  ContextBar,
  DataState,
  MetricControls,
  PageHeading,
} from "../components/research/WorkbenchUI";

import { useBasket } from "../hooks/useResearch";

export default function CitiesPage() {
  const { href } = useBasket();
  const { merged, loading, error, manifest } = useMetroData();
  const [params, setParams] = useSearchParams();
  const view = parseResearchQuery(params, merged);
  const availability = params.get("availability") || "all";
  const resource = params.get("resource") || "all";
  const cities = filterCities(merged, view.keyword)
    .filter(
      (c) =>
        (availability === "all" ||
          (observe(c, view.metric, view.year).value !== null) ===
            (availability === "available")) &&
        (resource === "all" ||
          (resource === "network" ? c.has_network_map : c.has_plan_map)),
    )
    .sort((a, b) => a.city_cn.localeCompare(b.city_cn, "zh-CN"));
  function filter(key: string, value: string) {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set(key, value);
        return p;
      },
      { replace: true },
    );
  }
  if (loading || error)
    return (
      <div className="workbench">
        <DataState loading={loading} error={error} />
      </div>
    );
  return (
    <div className="workbench">
      <PageHeading
        eyebrow="CITY ARCHIVE / 02"
        title="每座城市，都有自己的轨迹"
        description="将客流记录与线网资料分开检索，缺失一个指标也不遗漏一座城市。"
      />
      <MetricControls cities={merged} showMode={false} />
      <ContextBar
        cities={cities}
        metric={view.metric}
        year={view.year}
        collectedAt={manifest?.stats_scrape_date}
      />
      <div className="directory-filters">
        <label>
          当前指标
          <select
            aria-label="指标可用性"
            value={availability}
            onChange={(e) => filter("availability", e.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="available">有有效记录</option>
            <option value="missing">当前指标缺失</option>
          </select>
        </label>
        <label>
          资料类型
          <select
            aria-label="资料类型"
            value={resource}
            onChange={(e) => filter("resource", e.target.value)}
          >
            <option value="all">全部资料</option>
            <option value="network">有线路图</option>
            <option value="plan">有规划图</option>
          </select>
        </label>
        <div className="segmented" aria-label="目录视图">
          <button
            aria-pressed={params.get("view") !== "cards"}
            onClick={() => filter("view", "list")}
          >
            列表
          </button>
          <button
            aria-pressed={params.get("view") === "cards"}
            onClick={() => filter("view", "cards")}
          >
            卡片
          </button>
        </div>
        <span>{cities.length} 个城市 · 按名称排列</span>
      </div>
      {params.get("view") === "cards" && cities.length > 0 ? (
        <div className="directory-card-grid">
          {cities.map((c) => (
            <article className="directory-card" key={c.city}>
              <div className="eyebrow">{c.city}</div>
              <Link to={href(`/city/${c.city}`, { q: null })}>
                <h2>{c.city_cn} ↗</h2>
              </Link>
              <p>
                {RESEARCH_METRICS[view.metric].label} ·{" "}
                {observe(c, view.metric, view.year).periodLabel}
              </p>
              <strong>
                {formatValue(
                  observe(c, view.metric, view.year).value,
                  view.metric,
                )}{" "}
                <small>{RESEARCH_METRICS[view.metric].unit}</small>
              </strong>
              <div className="resource-tags">
                <span>
                  {c.stats?.yearly_avg_ridership.years.length
                    ? "年度趋势可用"
                    : "无年度资料"}
                </span>
                <span>{c.has_network_map ? "有线路图" : "无线路图"}</span>
              </div>
              <div className="directory-card-actions">
                <span className="pending-tag">
                  {observe(c, view.metric, view.year).value === null
                    ? "当前指标缺失"
                    : "口径待核验"}
                </span>
                <BasketButton city={c} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="research-panel">
          <CityTable cities={cities} metric={view.metric} year={view.year} />
        </section>
      )}
      <ComparisonTray cities={merged} />
    </div>
  );
}
