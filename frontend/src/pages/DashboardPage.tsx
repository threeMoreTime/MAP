import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMetroData } from "../hooks/useMetroData";
import { useBasket } from "../hooks/useResearch";
import {
  filterCities,
  formatValue,
  observe,
  parseResearchQuery,
  RESEARCH_METRICS,
} from "../lib/research";
import ResearchMap from "../components/research/ResearchMap";
import {
  BasketButton,
  CityTable,
  ComparisonTray,
  ContextBar,
  DataState,
  MetricControls,
  PageHeading,
  SourceInfo,
  StrictNotice,
} from "../components/research/WorkbenchUI";

export default function DashboardPage() {
  const { merged, loading, error, manifest } = useMetroData();
  const [params, setParams] = useSearchParams();
  const view = parseResearchQuery(params, merged);
  const { href } = useBasket();
  const sort = params.get("sort") || "name";
  const setSort = (value: string) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("sort", value);
        return p;
      },
      { replace: true },
    );
  const [mapOpen, setMapOpen] = useState(false);
  const cities = useMemo(
    () =>
      filterCities(merged, view.keyword).sort((a, b) =>
        sort === "value"
          ? (observe(b, view.metric, view.year).value ?? -1) -
            (observe(a, view.metric, view.year).value ?? -1)
          : a.city_cn.localeCompare(b.city_cn, "zh-CN"),
      ),
    [merged, view.keyword, view.metric, view.year, sort],
  );
  const selected =
    cities.find((c) => c.city === params.get("city")) ||
    cities.find((c) => c.city === "shanghai") ||
    cities[0];
  const select = (id: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("city", id);
        return next;
      },
      { replace: true },
    );
  if (loading || error)
    return (
      <div className="workbench">
        <DataState loading={loading} error={error} />
      </div>
    );
  return (
    <div className="workbench">
      <PageHeading
        eyebrow="METRO RESEARCH / 01"
        title="从一座城，看见轨道交通"
        description="查阅城市客流、理解历史变化，让每一次对照都有依据。"
        action={
          <Link
            className="quiet-button"
            to={href("/cities", { q: null, city: null })}
          >
            浏览城市档案 ↗
          </Link>
        }
      />
      <div className="overview-stats">
        <div>
          <span>城市资源</span>
          <strong>
            {merged.length}
            <small> 城</small>
          </strong>
          <p>全国城市资料索引</p>
        </div>
        <div>
          <span>年度序列</span>
          <strong>
            {
              merged.filter((c) => c.stats?.yearly_avg_ridership.years.length)
                .length
            }
            <small> 城</small>
          </strong>
          <p>按年份独立判断可用性</p>
        </div>
        <div>
          <span>日客流快照</span>
          <strong>
            {
              merged.filter(
                (c) => observe(c, "daily_snapshot", view.year).value !== null,
              ).length
            }
            <small> 城</small>
          </strong>
          <p>统计日期尚待核验</p>
        </div>
        <div className="overview-note">
          <span className="status-dot" />
          历史资料研究
          <p>
            按城市查阅，按口径对照。
            <br />
            当前数据不代表实时运营。
          </p>
        </div>
      </div>
      <MetricControls cities={merged} />
      <ContextBar
        cities={cities}
        metric={view.metric}
        year={view.year}
        collectedAt={manifest?.stats_scrape_date}
      />
      {view.strict ? (
        <StrictNotice />
      ) : (
        <>
          <button
            className="mobile-map-toggle quiet-button"
            aria-expanded={mapOpen}
            onClick={() => setMapOpen(!mapOpen)}
          >
            {mapOpen ? "收起空间视图" : "展开空间视图 · 支持 3D"}
          </button>
          <div className="overview-grid">
            <div
              className={`spatial-column ${mapOpen ? "mobile-map-open" : ""}`}
            >
              <ResearchMap
                cities={cities}
                metric={view.metric}
                year={view.year}
                selected={selected?.city || ""}
                onSelect={select}
              />
            </div>
            <section className="research-panel city-list-panel">
              <div className="panel-top">
                <div>
                  <span className="eyebrow">CITY INDEX</span>
                  <h2>
                    城市资料 <small>{cities.length}</small>
                  </h2>
                </div>
                <label className="inline-select">
                  <span className="sr-only">城市列表排序</span>
                  <select
                    aria-label="城市列表排序"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="name">按名称</option>
                    <option value="value">按源数据值</option>
                  </select>
                </label>
              </div>
              <CityTable
                cities={cities}
                metric={view.metric}
                year={view.year}
                selected={selected?.city}
                onSelect={select}
                compact
              />
              <p className="panel-footnote">
                源值排序用于资料浏览，不构成全国排名。
              </p>
            </section>
          </div>
          {selected && (
            <section className="selected-city-panel" aria-label="选中城市摘要">
              <div>
                <span className="eyebrow">
                  SELECTED CITY / {selected.city.toUpperCase()}
                </span>
                <h2>
                  {selected.city_cn}
                  <span className="pending-tag">资料待核验</span>
                </h2>
                <p>
                  {RESEARCH_METRICS[view.metric].label} ·{" "}
                  {observe(selected, view.metric, view.year).periodLabel}
                </p>
              </div>
              <div className="selected-metric">
                <strong>
                  {formatValue(
                    observe(selected, view.metric, view.year).value,
                    view.metric,
                  )}
                </strong>
                <span>{RESEARCH_METRICS[view.metric].unit}</span>
              </div>
              <div className="selected-actions">
                <BasketButton city={selected} />
                <Link
                  className="action-button"
                  to={href(`/city/${selected.city}`, { q: null, city: null })}
                >
                  进入城市档案 →
                </Link>
              </div>
              <SourceInfo
                city={selected}
                metric={view.metric}
                year={view.year}
              />
            </section>
          )}
        </>
      )}
      <ComparisonTray cities={merged} />
    </div>
  );
}
