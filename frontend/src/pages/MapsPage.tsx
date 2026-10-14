import { Link, useSearchParams } from "react-router-dom";
import { useMetroData } from "../hooks/useMetroData";
import { useBasket } from "../hooks/useResearch";
import { filterCities } from "../lib/research";
import { withBaseUrl } from "../utils/path";
import { DataState, PageHeading } from "../components/research/WorkbenchUI";

export default function MapsPage() {
  const { merged, loading, error } = useMetroData();
  const [params, setParams] = useSearchParams();
  const { href } = useBasket();
  const q = params.get("q") || "";
  const type = params.get("asset") === "plan" ? "plan" : "network";
  const cities = filterCities(merged, q)
    .filter((c) => (type === "plan" ? c.has_plan_map : c.has_network_map))
    .sort((a, b) => a.city_cn.localeCompare(b.city_cn, "zh-CN"));
  const change = (key: string, value: string) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set(key, value);
        return p;
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
        eyebrow="NETWORK ATLAS / 04"
        title="轨道交通图集"
        description="独立查阅线路图与规划资料，保留图件类型和版本状态。"
      />
      <div className="research-controls">
        <label className="search-control">
          <span>查找城市</span>
          <input
            aria-label="搜索图集城市"
            type="search"
            placeholder="城市中文 / 拼音"
            value={q}
            onChange={(e) => change("q", e.target.value)}
          />
        </label>
        <label>
          <span>图件类型</span>
          <select
            aria-label="图件类型"
            value={type}
            onChange={(e) => change("asset", e.target.value)}
          >
            <option value="network">线路图</option>
            <option value="plan">规划图</option>
          </select>
        </label>
        <span className="muted">已收录 {cities.length} 城</span>
      </div>
      <div className="notice">
        {type === "plan"
          ? "规划图表示规划方案，不表示线路已运营。"
          : "线路图为收录的历史资料，请核对原发布方版本。"}{" "}
        图件版本日期、来源与授权信息尚未提供。
      </div>
      <div className="atlas-grid">
        {cities.map((c) => (
          <Link
            className="atlas-card"
            key={c.city}
            to={href(`/city/${c.city}`, { tab: "maps", asset: type, q: null })}
          >
            <div className="atlas-image">
              <img
                loading="lazy"
                src={withBaseUrl(
                  (type === "plan" ? c.plan_map_path : c.network_map_path) ||
                    "",
                )}
                alt={`${c.city_cn}${type === "plan" ? "规划图" : "线路图"}缩略图`}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement?.classList.add(
                    "image-unavailable",
                  );
                }}
              />
              <span className="atlas-image-fallback">
                缩略图不可用 · 进入档案重试
              </span>
            </div>
            <div className="atlas-label">
              <h2>{c.city_cn}</h2>
              <span>{type === "plan" ? "规划图" : "线路图"} ↗</span>
            </div>
            <p>图件版本未提供</p>
          </Link>
        ))}
      </div>
      {!cities.length && (
        <div className="research-empty">
          <h2>未找到匹配图件</h2>
          <p>请切换图件类型或清空搜索。</p>
          <button className="quiet-button" onClick={() => change("q", "")}>
            清空搜索
          </button>
        </div>
      )}
    </div>
  );
}
