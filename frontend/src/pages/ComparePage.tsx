import { Link, useSearchParams } from "react-router-dom";
import { useMetroData } from "../hooks/useMetroData";
import { useBasket } from "../hooks/useResearch";
import {
  cityColor,
  comparisonIssues,
  filterCities,
  formatValue,
  observe,
  parseResearchQuery,
  RESEARCH_METRICS,
  citation,
} from "../lib/research";
import {
  BasketButton,
  ComparisonTray,
  ContextBar,
  CopyButton,
  DataState,
  MetricControls,
  PageHeading,
  SourceInfo,
  StrictNotice,
  TrendPlot,
} from "../components/research/WorkbenchUI";

export default function ComparePage() {
  const { merged, loading, error, manifest } = useMetroData();
  const [params] = useSearchParams();
  const view = parseResearchQuery(params, merged);
  const { ids, replace, href } = useBasket();
  const cities = ids
    .map((id) => merged.find((c) => c.city === id))
    .filter((c): c is (typeof merged)[number] => !!c);
  const observations = cities.map((c) => observe(c, view.metric, view.year));
  const issues = comparisonIssues(observations);
  const max = Math.max(...observations.map((o) => o.value || 0), 1);
  if (loading || error)
    return (
      <div className="workbench">
        <DataState loading={loading} error={error} />
      </div>
    );
  return (
    <div className="workbench">
      <PageHeading
        eyebrow="CITY COMPARISON / 03"
        title="让差异，有据可循"
        description="选择 2–5 座城市，在相同指标下浏览原值，并先检查可比条件。"
      />
      <MetricControls cities={merged} />
      <div className="compare-selector">
        <span>添加城市</span>
        <div>
          {filterCities(merged, view.keyword)
            .slice(0, 12)
            .map((c) => (
              <div className="city-picker" key={c.city}>
                <span>{c.city_cn}</span>
                <BasketButton city={c} />
              </div>
            ))}
        </div>
        <Link to={href("/cities")}>更多城市 ↗</Link>
      </div>
      <ComparisonTray cities={merged} />
      {cities.length < 2 ? (
        <div className="research-empty">
          <span className="eyebrow">START A COMPARISON</span>
          <h2>{cities.length ? "再选择一座城市" : "从你关注的城市开始"}</h2>
          <p>当前选择会保留。所有对照都先展示指标与统计期间。</p>
          {cities.length === 0 && (
            <button
              className="action-button"
              onClick={() => replace(["beijing", "shanghai", "shenzhen"])}
            >
              试试北京、上海、深圳
            </button>
          )}
        </div>
      ) : (
        <>
          <ContextBar
            cities={cities}
            metric={view.metric}
            year={view.year}
            collectedAt={manifest?.stats_scrape_date}
          />
          <div className="notice">
            <strong>{issues.length ? "可比性待确认" : "满足可比条件"}</strong>
            <span>
              {issues.join("；")}
              。当前展示为来源资料对照，不生成严格排名、综合评分或相对差值。
            </span>
          </div>
          {view.strict && issues.length ? (
            <StrictNotice />
          ) : (
            <>
              <section className="research-panel comparison-panel">
                <div className="panel-top">
                  <div>
                    <span className="eyebrow">SOURCE VALUES</span>
                    <h2>{RESEARCH_METRICS[view.metric].label}对照</h2>
                  </div>
                  <span className="muted">
                    {RESEARCH_METRICS[view.metric].unit}
                  </span>
                </div>
                <div className="comparison-bars">
                  {cities.map((c, i) => (
                    <div className="comparison-row" key={c.city}>
                      <Link to={href(`/city/${c.city}`, { q: null })}>
                        {c.city_cn}
                      </Link>
                      <div className="bar-track">
                        <div
                          style={{
                            width: `${((observations[i].value || 0) / max) * 100}%`,
                            background: cityColor(c.city),
                          }}
                        />
                      </div>
                      <strong>
                        {formatValue(observations[i].value, view.metric)}
                      </strong>
                      <span>
                        {observations[i].value === null
                          ? "当前指标缺失"
                          : "口径待核验"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="research-table-wrap">
                  <table className="research-table">
                    <thead>
                      <tr>
                        <th>城市</th>
                        <th>源数据值</th>
                        <th>统计期间</th>
                        <th>采集日期</th>
                        <th>来源</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cities.map((c, i) => (
                        <tr key={c.city}>
                          <td>{c.city_cn}</td>
                          <td>
                            {formatValue(observations[i].value, view.metric)}{" "}
                            {observations[i].unit}
                          </td>
                          <td>{observations[i].periodLabel}</td>
                          <td>{observations[i].collectedAt || "未提供"}</td>
                          <td>
                            <a
                              href={observations[i].sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              MetroDB ↗
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="research-panel trend-panel">
                <div className="panel-top">
                  <div>
                    <span className="eyebrow">HISTORICAL CONTEXT</span>
                    <h2>年度趋势参照</h2>
                  </div>
                  <span className="muted">独立年度资料 · 未确认期间不连线</span>
                </div>
                <TrendPlot cities={cities} />
              </section>
              {cities.map((c) => (
                <div key={c.city} className="compare-source">
                  <h3>{c.city_cn}</h3>
                  <SourceInfo city={c} metric={view.metric} year={view.year} />
                </div>
              ))}
              <CopyButton
                label="复制当前对照引用"
                getText={() =>
                  cities
                    .map((c) => citation(c, view.metric, view.year))
                    .join("\n")
                }
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
