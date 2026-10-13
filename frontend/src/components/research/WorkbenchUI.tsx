import { useContext, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { MergedCity } from "../../hooks/useMetroData";
import { MetroDataContext } from "../../lib/metroDataContext";
import { useBasket, useMotion } from "../../hooks/useResearch";
import {
  RESEARCH_METRICS,
  citation,
  collectionAgeDays,
  cityColor,
  formatValue,
  observe,
  parseResearchQuery,
  type ResearchMetric,
} from "../../lib/research";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="research-heading">
      <div>
        <div className="eyebrow">
          <span />
          {eyebrow}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{action}</div>
    </div>
  );
}

export function DataState({
  loading,
  error,
}: {
  loading: boolean;
  error: string | null;
}) {
  if (error)
    return (
      <div className="research-empty" role="alert">
        <h2>数据加载失败</h2>
        <p>请检查网络后重试，已选城市会保留在链接中。</p>
        <button
          className="action-button"
          onClick={() => window.location.reload()}
        >
          重新加载
        </button>
      </div>
    );
  if (loading)
    return (
      <div className="research-loading" role="status">
        <p>正在整理城市资料…</p>
        <div />
        <div />
        <div />
      </div>
    );
  return null;
}

export function MetricControls({
  cities,
  showSearch = true,
  showMode = true,
}: {
  cities: MergedCity[];
  showSearch?: boolean;
  showMode?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const view = parseResearchQuery(params, cities);
  function change(key: string, value: string) {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set(key, value);
        if (key === "metric" && value !== "annual") p.delete("year");
        return p;
      },
      { replace: true },
    );
  }
  return (
    <>
      <div className="research-controls">
        {showSearch && (
          <label className="search-control">
            <span>查找城市</span>
            <input
              aria-label="搜索城市"
              type="search"
              placeholder="城市中文 / 拼音"
              value={view.keyword}
              onChange={(e) => change("q", e.target.value)}
            />
          </label>
        )}
        <label>
          <span>研究指标</span>
          <select
            aria-label="研究指标"
            value={view.metric}
            onChange={(e) => change("metric", e.target.value)}
          >
            {Object.entries(RESEARCH_METRICS).map(([key, m]) => (
              <option key={key} value={key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        {view.metric === "annual" && (
          <label>
            <span>资料年份</span>
            <select
              aria-label="资料年份"
              value={view.year}
              onChange={(e) => change("year", e.target.value)}
            >
              {view.years.map((year) => (
                <option key={year} value={year}>
                  {year} 年
                </option>
              ))}
            </select>
          </label>
        )}
        {showMode && (
          <label>
            <span>使用方式</span>
            <select
              aria-label="使用方式"
              value={view.strict ? "strict" : "reference"}
              onChange={(e) => change("mode", e.target.value)}
            >
              <option value="reference">资料浏览</option>
              <option value="strict">严格比较</option>
            </select>
          </label>
        )}
        <CopyButton label="分享当前视图" getText={() => window.location.href} />
      </div>
      {(view.invalidYear || view.invalidMetric) && (
        <p className="notice" role="status">
          链接中的{view.invalidMetric ? "指标无效，已使用年度日均客流；" : ""}
          {view.invalidYear
            ? `年份不可用于完整年度浏览，已显示 ${view.year} 年。`
            : ""}
        </p>
      )}
    </>
  );
}

export function ContextBar({
  cities,
  metric,
  year,
  collectedAt,
}: {
  cities: MergedCity[];
  metric: ResearchMetric;
  year: number;
  collectedAt?: string | null;
}) {
  const count = cities.filter(
    (c) => observe(c, metric, year).value !== null,
  ).length;
  return (
    <div className="metric-context">
      <span>
        <strong>{RESEARCH_METRICS[metric].label}</strong> ·{" "}
        {RESEARCH_METRICS[metric].unit}
      </span>
      <span>{metric === "annual" ? `${year} 年资料` : "统计时点未提供"}</span>
      <span>
        有效记录 <strong>{count}</strong> / {cities.length} 城
      </span>
      <span>采集于 {collectedAt || "未提供"}</span>
      {(collectionAgeDays(collectedAt) ?? 0) > 90 && (
        <span>采集距今 {collectionAgeDays(collectedAt)} 天</span>
      )}
      <Link to="/about" className="pending-tag">
        口径待核验 ↗
      </Link>
    </div>
  );
}

export function CopyButton({
  label,
  getText,
}: {
  label: string;
  getText: () => string;
}) {
  const [message, setMessage] = useState("");
  const [fallback, setFallback] = useState("");
  async function copy() {
    const text = getText();
    try {
      await navigator.clipboard.writeText(text);
      setFallback("");
      setMessage("已复制");
    } catch {
      setFallback(text);
      setMessage("请手动复制下方内容");
    }
  }
  return (
    <div className="copy-control">
      <button className="quiet-button" onClick={copy}>
        {label} <span aria-hidden="true">↗</span>
      </button>
      {message && (
        <span className="copy-feedback" role="status">
          {message}
        </span>
      )}
      {fallback && (
        <textarea
          aria-label="手动复制内容"
          readOnly
          value={fallback}
          onFocus={(e) => e.target.select()}
          rows={3}
          autoFocus
        />
      )}
    </div>
  );
}

export function BasketButton({ city }: { city: MergedCity }) {
  const { ids, toggle } = useBasket();
  const chosen = ids.includes(city.city);
  return (
    <button
      className={`basket-button ${chosen ? "is-chosen" : ""}`}
      aria-label={`${chosen ? "移除" : "加入"}${city.city_cn}对标`}
      aria-pressed={chosen}
      disabled={!chosen && ids.length >= 5}
      title={
        !chosen && ids.length >= 5 ? "最多 5 城，请先移除一个城市" : undefined
      }
      onClick={() => toggle(city.city)}
    >
      {chosen ? "✓ 已加入" : "+ 对标"}
    </button>
  );
}

export function ComparisonTray({ cities }: { cities: MergedCity[] }) {
  const { ids, replace, href, adjusted } = useBasket();
  if (ids.length === 0 && !adjusted) return null;
  return (
    <aside className="comparison-tray" aria-label="对比篮">
      <div className="tray-title">
        对标城市 <strong>{ids.length} / 5</strong>
      </div>
      <div className="tray-cities">
        {ids.map((id) => (
          <button
            key={id}
            onClick={() => replace(ids.filter((c) => c !== id))}
            aria-label={`移除${cities.find((c) => c.city === id)?.city_cn || id}`}
          >
            {cities.find((c) => c.city === id)?.city_cn || id}
            <span>×</span>
          </button>
        ))}
      </div>
      <Link
        className="action-button"
        to={href("/compare", { q: null, city: null })}
      >
        查看对标 →
      </Link>
      {(ids.length === 5 || adjusted) && (
        <small>
          {adjusted
            ? "链接已去重并保留前 5 个有效城市。"
            : "已达 5 城上限，移除后可继续添加。"}
        </small>
      )}
    </aside>
  );
}

export function CityTable({
  cities,
  metric,
  year,
  selected,
  onSelect,
  compact = false,
}: {
  cities: MergedCity[];
  metric: ResearchMetric;
  year: number;
  selected?: string;
  onSelect?: (city: string) => void;
  compact?: boolean;
}) {
  const { href } = useBasket();
  return (
    <div className={`research-table-wrap ${compact ? "compact-table" : ""}`}>
      <table className="research-table">
        <caption className="sr-only">
          城市指标资料，{RESEARCH_METRICS[metric].unit}，口径待核验
        </caption>
        <thead>
          <tr>
            <th>城市</th>
            <th className="numeric">
              {compact ? "源数据值" : RESEARCH_METRICS[metric].label}
            </th>
            {!compact && <th>资料收录</th>}
            <th>
              <span className="sr-only">操作</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {cities.map((c) => {
            const o = observe(c, metric, year);
            return (
              <tr
                key={c.city}
                className={selected === c.city ? "selected-row" : ""}
              >
                <td>
                  {onSelect ? (
                    <button
                      className="city-name"
                      aria-pressed={selected === c.city}
                      onClick={() => onSelect(c.city)}
                    >
                      <span className="city-dot" />
                      {c.city_cn}
                    </button>
                  ) : (
                    <Link
                      className="city-name"
                      to={href(`/city/${c.city}`, { q: null, city: null })}
                    >
                      <span className="city-dot" />
                      {c.city_cn}
                    </Link>
                  )}
                </td>
                <td className="numeric">
                  <strong>{formatValue(o.value, metric)}</strong>
                  <small>
                    {o.status === "invalid"
                      ? "格式异常"
                      : o.value === null
                        ? "未收录"
                        : "待核验"}
                  </small>
                </td>
                {!compact && (
                  <td>
                    <div className="resource-tags">
                      <span>
                        {c.stats?.yearly_avg_ridership.years.length
                          ? "年度趋势"
                          : "无年度资料"}
                      </span>
                      <span>{c.has_network_map ? "线路图" : "无线路图"}</span>
                      <span>{c.has_plan_map ? "规划图" : "无规划图"}</span>
                    </div>
                  </td>
                )}
                <td>
                  <BasketButton city={c} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!cities.length && (
        <div className="research-empty">
          <h3>未找到匹配城市</h3>
          <p>尝试其他城市名称，或清空搜索条件。</p>
        </div>
      )}
    </div>
  );
}

export function StrictNotice() {
  const [, setParams] = useSearchParams();
  return (
    <div className="research-empty strict-empty">
      <span className="eyebrow">COMPARABILITY CHECK</span>
      <h2>当前资料尚不能进行严格比较</h2>
      <p>
        统计覆盖范围、计数规则和来源核验信息未提供。可以继续浏览原始资料，待口径核验后再形成比较结论。
      </p>
      <button
        className="action-button"
        onClick={() =>
          setParams(
            (prev) => {
              const p = new URLSearchParams(prev);
              p.set("mode", "reference");
              return p;
            },
            { replace: true },
          )
        }
      >
        返回资料浏览
      </button>
    </div>
  );
}

export function SourceInfo({
  city,
  metric,
  year,
}: {
  city: MergedCity;
  metric: ResearchMetric;
  year: number;
}) {
  const o = observe(city, metric, year);
  const manifest = useContext(MetroDataContext)?.manifest;
  return (
    <details className="source-info">
      <summary>
        指标来源与引用 <span>MetroDB · 口径待核验</span>
      </summary>
      <dl>
        <dt>统计期间</dt>
        <dd>{o.periodLabel}</dd>
        <dt>采集日期</dt>
        <dd>{o.collectedAt || "未提供"}</dd>
        <dt>资料索引生成时间</dt>
        <dd>{manifest?.generated_at || "未提供"}</dd>
        <dt>系统范围 / 计数规则</dt>
        <dd>未提供，待逐城核验</dd>
        <dt>原始来源入口</dt>
        <dd>
          <a href={o.sourceUrl} target="_blank" rel="noreferrer">
            MetroDB · {city.city_cn} ↗
          </a>
        </dd>
      </dl>
      <p>
        来源入口依据采集配置生成；采集日不代表统计日。历史资料不因采集较早而自动失效。
      </p>
      <CopyButton
        label="复制指标引用"
        getText={() => citation(city, metric, year)}
      />
    </details>
  );
}

export function TrendPlot({ cities }: { cities: MergedCity[] }) {
  const { reduced } = useMotion();
  const years = [
    ...new Set(
      cities.flatMap((c) => c.stats?.yearly_avg_ridership.years || []),
    ),
  ]
    .filter((y) => cities.some((c) => observe(c, "annual", y).periodEnded))
    .sort();
  const points = cities.map((city) => ({
    city,
    values: years.map((y) => {
      const o = observe(city, "annual", y);
      return o.periodEnded ? o.value : null;
    }),
  }));
  const max =
    Math.max(
      ...points.flatMap((p) => p.values.filter((v): v is number => v !== null)),
      1,
    ) * 1.12;
  const x = (i: number) => 62 + i * (590 / Math.max(years.length - 1, 1));
  const y = (v: number) => 225 - (v / max) * 185;
  return (
    <div className={`trend-plot ${reduced ? "no-motion" : ""}`}>
      <div className="chart-legend">
        {cities.map((c) => (
          <span key={c.city}>
            <i style={{ background: cityColor(c.city) }} />
            {c.city_cn}
          </span>
        ))}
        <span>万人次 / 日 · 口径待核验</span>
      </div>
      {years.length ? (
        <svg
          viewBox="0 0 700 270"
          role="img"
          aria-label="年度日均客流趋势，原值见下方年度数据表"
        >
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <line
                x1="62"
                x2="652"
                y1={y((max * i) / 3)}
                y2={y((max * i) / 3)}
                stroke="#e4ebeb"
              />
              <text x="50" y={y((max * i) / 3) + 4} textAnchor="end">
                {Math.round((max * i) / 3)}
              </text>
            </g>
          ))}
          {years.map((year, i) => (
            <text x={x(i)} y="254" textAnchor="middle" key={year}>
              {year}
            </text>
          ))}
          {points.map((p) => {
            const d = p.values
              .map((v, i) =>
                v === null
                  ? ""
                  : `${i === 0 || p.values[i - 1] === null ? "M" : "L"}${x(i)},${y(v)}`,
              )
              .join(" ");
            return (
              <g key={p.city.city}>
                <path
                  className="trend-line"
                  d={d}
                  fill="none"
                  stroke={cityColor(p.city.city)}
                  strokeWidth="2.5"
                />
                {p.values.map((v, i) =>
                  v === null ? null : (
                    <circle
                      key={years[i]}
                      cx={x(i)}
                      cy={y(v)}
                      r="4"
                      fill="white"
                      stroke={cityColor(p.city.city)}
                      strokeWidth="2"
                    >
                      <title>
                        {p.city.city_cn} · {years[i]} 年 · {formatValue(v)}{" "}
                        万人次 / 日
                      </title>
                    </circle>
                  ),
                )}
              </g>
            );
          })}
        </svg>
      ) : (
        <div className="research-empty">尚无可展示的年度序列</div>
      )}
      <details className="trend-data">
        <summary>查看年度原值与未确认期间</summary>
        <div className="research-table-wrap">
          <table className="research-table">
            <thead>
              <tr>
                <th>城市</th>
                <th>年份</th>
                <th>源数据值（万人次 / 日）</th>
                <th>期间状态</th>
              </tr>
            </thead>
            <tbody>
              {cities.flatMap((c) =>
                (c.stats?.yearly_avg_ridership.years || []).map((year) => {
                  const o = observe(c, "annual", year);
                  return (
                    <tr key={`${c.city}-${year}`}>
                      <td>{c.city_cn}</td>
                      <td>{year}</td>
                      <td>{formatValue(o.value)}</td>
                      <td>
                        {o.periodEnded
                          ? "已结束年份 · 口径待核验"
                          : "完整期间待确认 · 未绘入趋势"}
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
