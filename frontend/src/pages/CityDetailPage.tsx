import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMetroData } from "../hooks/useMetroData";
import { useBasket } from "../hooks/useResearch";
import {
  formatValue,
  observe,
  parseResearchQuery,
  RESEARCH_METRICS,
} from "../lib/research";
import CityAssetPreview from "../components/city/CityAssetPreview";
import {
  BasketButton,
  ComparisonTray,
  CopyButton,
  DataState,
  MetricControls,
  PageHeading,
  SourceInfo,
  TrendPlot,
} from "../components/research/WorkbenchUI";

export default function CityDetailPage() {
  const { id } = useParams();
  const { merged, loading, error } = useMetroData();
  const [params, setParams] = useSearchParams();
  const { href } = useBasket();
  const view = parseResearchQuery(params, merged);
  const city = merged.find((c) => c.city === id);
  if (loading || error)
    return (
      <div className="workbench">
        <DataState loading={loading} error={error} />
      </div>
    );
  if (!city)
    return (
      <div className="workbench research-empty">
        <h1>未找到这座城市</h1>
        <Link className="action-button" to={href("/cities", { q: null })}>
          查看城市目录
        </Link>
      </div>
    );
  const observation = observe(city, view.metric, view.year);
  const tab = params.get("tab") || (city.stats ? "analysis" : "maps");
  return (
    <div className="workbench">
      <Link
        className="back-link"
        to={href("/cities", { city: null, tab: null })}
      >
        ← 城市档案目录
      </Link>
      <PageHeading
        eyebrow={`CITY ARCHIVE / ${city.city.toUpperCase()}`}
        title={`${city.city_cn} · 城市档案`}
        description="沿着历史客流认识城市，在资料与来源之间保留清晰的联系。"
        action={<BasketButton city={city} />}
      />
      <div className="page-tabs" role="tablist" aria-label="城市档案内容">
        <button
          role="tab"
          aria-selected={tab !== "maps"}
          onClick={() =>
            setParams((prev) => {
              const p = new URLSearchParams(prev);
              p.set("tab", "analysis");
              return p;
            })
          }
        >
          客流分析
        </button>
        <button
          role="tab"
          aria-selected={tab === "maps"}
          onClick={() =>
            setParams((prev) => {
              const p = new URLSearchParams(prev);
              p.set("tab", "maps");
              return p;
            })
          }
        >
          线网资料
        </button>
      </div>
      {tab !== "maps" ? (
        <>
          <MetricControls cities={merged} showSearch={false} showMode={false} />
          <section className="city-analysis-grid">
            <div className="city-metric-card">
              <span className="eyebrow">
                {RESEARCH_METRICS[view.metric].label}
              </span>
              <strong>{formatValue(observation.value, view.metric)}</strong>
              <span>
                {observation.unit} · {observation.periodLabel}
              </span>
              <p className="pending-tag">{observation.reason}</p>
              <p>采集日 {observation.collectedAt || "未提供"}</p>
            </div>
            <section className="research-panel trend-panel">
              <div className="panel-top">
                <div>
                  <span className="eyebrow">HISTORICAL SERIES</span>
                  <h2>年度客流轨迹</h2>
                </div>
                <span className="muted">完整期间待确认的年份单独列示</span>
              </div>
              <TrendPlot cities={[city]} />
            </section>
          </section>
          <SourceInfo city={city} metric={view.metric} year={view.year} />
          <section className="research-panel operations-panel">
            <div className="panel-top">
              <div>
                <span className="eyebrow">OPERATING REFERENCE</span>
                <h2>运营资料</h2>
              </div>
              <span className="pending-tag">统计时点未提供</span>
            </div>
            <div className="operations-grid">
              {[
                ["运营里程", city.stats?.operating_mileage_km, "km"],
                ["运营线路", city.stats?.operating_lines, "条"],
                ["运营站点", city.stats?.operating_stations, "座"],
                ["在建线路", city.stats?.lines_under_construction, "条"],
              ].map(([label, value, unit]) => (
                <div key={String(label)}>
                  <span>{label}</span>
                  <strong>
                    {value === undefined || value === null ? "—" : value}
                    <small> {unit}</small>
                  </strong>
                </div>
              ))}
            </div>
            <p className="panel-footnote">
              运营资料与所选年度独立，不用于计算当年客流强度；采集于{" "}
              {city.stats?.scrape_date || "未提供"}。
            </p>
          </section>
        </>
      ) : (
        <section className="map-archive-detail">
          <div className="notice">
            线路图与规划图按资料类型分别展示。图件版本日期、图件来源与授权信息未提供；规划内容不表示已运营。
          </div>
          <CityAssetPreview
            key={city.city}
            city={city}
            initialTab={params.get("asset") === "plan" ? "plan" : "network"}
          />
          <div className="panel-footnote">
            收录图件用于资料查阅，请结合原发布方核实版本与使用权限。
          </div>
        </section>
      )}
      <div className="detail-bottom-actions">
        <CopyButton label="分享城市档案" getText={() => window.location.href} />
        <Link
          className="quiet-button"
          to={href("/compare", { tab: null, q: null })}
        >
          前往对标分析 →
        </Link>
      </div>
      <ComparisonTray cities={merged} />
    </div>
  );
}
