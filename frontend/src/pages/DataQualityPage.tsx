import { Link, useSearchParams } from "react-router-dom";
import { useMetroData } from "../hooks/useMetroData";
import { useBasket } from "../hooks/useResearch";
import { filterCities, observe, parseResearchQuery } from "../lib/research";
import { DataState, PageHeading } from "../components/research/WorkbenchUI";

export default function DataQualityPage() {
  const { merged, loading, error } = useMetroData();
  const [params, setParams] = useSearchParams();
  const { href } = useBasket();
  const view = parseResearchQuery(params, merged);
  if (loading || error)
    return (
      <div className="workbench">
        <DataState loading={loading} error={error} />
      </div>
    );
  return (
    <div className="workbench">
      <Link className="back-link" to="/about">
        ← 数据说明
      </Link>
      <PageHeading
        eyebrow="DATA COVERAGE"
        title="资料收录，逐项可查"
        description="收录状态表示资料是否存在，不表示城市运营水平，也不构成数据可信度评级。"
      />
      <div className="notice">
        当前所有来源口径待核验；日快照与运营资料统计时点未知。年度可用性独立于日快照。
      </div>
      <div className="research-controls">
        <label className="search-control">
          <span>查找城市</span>
          <input
            aria-label="搜索收录城市"
            type="search"
            placeholder="城市中文 / 拼音"
            value={view.keyword}
            onChange={(e) =>
              setParams(
                (prev) => {
                  const p = new URLSearchParams(prev);
                  p.set("q", e.target.value);
                  return p;
                },
                { replace: true },
              )
            }
          />
        </label>
        <span className="muted">年度状态以 {view.year} 年资料为准</span>
      </div>
      <div className="research-panel research-table-wrap">
        <table className="research-table">
          <thead>
            <tr>
              <th>城市</th>
              <th>年度日均客流</th>
              <th>日快照</th>
              <th>线路图</th>
              <th>规划图</th>
              <th>核验状态</th>
            </tr>
          </thead>
          <tbody>
            {filterCities(merged, view.keyword).map((c) => (
              <tr key={c.city}>
                <td>
                  <Link to={href(`/city/${c.city}`, { q: null })}>
                    {c.city_cn} ↗
                  </Link>
                </td>
                <td>
                  {observe(c, "annual", view.year).value !== null
                    ? "已收录"
                    : "缺失"}
                </td>
                <td>
                  {observe(c, "daily_snapshot", view.year).value !== null
                    ? "已收录 · 日期未知"
                    : "缺失"}
                </td>
                <td>{c.has_network_map ? "已收录 · 版本未知" : "缺失"}</td>
                <td>{c.has_plan_map ? "已收录 · 版本未知" : "缺失"}</td>
                <td>口径待核验</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
