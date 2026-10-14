import { Link } from "react-router-dom";
import type { MergedCity } from "../../hooks/useMetroData";
import { useBasket } from "../../hooks/useResearch";
import { formatValue, observe, RESEARCH_METRICS, type ResearchMetric } from "../../lib/research";
import { BasketButton, SourceInfo } from "./WorkbenchUI";
import StudioIcon from "./StudioIcon";

export default function CityInspector({ city, cities, metric, year, onSelect }: { city: MergedCity; cities: MergedCity[]; metric: ResearchMetric; year: number; onSelect: (id: string) => void }) {
  const { href } = useBasket();
  const o = observe(city, metric, year);
  const years = (city.stats?.yearly_avg_ridership.years || []).filter(y => y <= year && observe(city, "annual", y).periodEnded).sort((a,b) => a-b).slice(-7);
  const values = years.map(y => observe(city, "annual", y).value);
  const max = Math.max(...values.filter((v): v is number => v !== null), 1);
  const x = (i: number) => 6 + i * 268 / Math.max(1, years.length - 1);
  const y = (v: number) => 70 - v / max * 58;
  const line = values.map((v,i) => v === null ? "" : `${i === 0 || values[i-1] === null ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  return <section className="city-inspector selected-city-panel" aria-label="选中城市摘要">
    <div className="inspector-kicker"><span><i/>当前关注</span><StudioIcon name="focus" size={17}/></div>
    <div className="inspector-city"><div><span className="eyebrow">SELECTED CITY / {city.city.toUpperCase()}</span><h2>{city.city_cn}<span>城市档案</span></h2></div><label className="inspector-switch"><span className="sr-only">切换关注城市</span><select aria-label="切换关注城市" value={city.city} onChange={e => onSelect(e.target.value)}>{cities.map(c => <option key={c.city} value={c.city}>{c.city_cn}</option>)}</select></label></div>
    <div className="inspector-value"><span>{RESEARCH_METRICS[metric].label}</span><div className="selected-metric"><strong>{formatValue(o.value, metric)}</strong><span>{o.unit}</span></div><div className="inspector-period"><span>{o.periodLabel}</span><span className="pending-tag">{o.value === null ? "当前指标缺失" : "口径待核验"}</span></div></div>
    <div className="inspector-trend"><div><span>年度客流轨迹</span><span>万人次 / 日</span></div>{years.length > 0 && values.some(v => v !== null) ? <><svg viewBox="0 0 280 82" role="img" aria-label={`${city.city_cn} ${years[0]} 至 ${years[years.length - 1]} 年日均客流原值趋势`}><defs><linearGradient id={`trend-${city.city}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#377cf6" stopOpacity=".18"/><stop offset="100%" stopColor="#377cf6" stopOpacity="0"/></linearGradient></defs>{[12,41,70].map(n => <line key={n} x1="0" x2="280" y1={n} y2={n} stroke="#eaf0f8" strokeDasharray="3 4"/>)}{values.every(v => v !== null) && <path d={`${line} L274,78 L6,78 Z`} fill={`url(#trend-${city.city})`}/>}<path d={line} stroke="#3478f6" strokeWidth="2.3" fill="none" strokeLinejoin="round"/>{values.map((v,i) => v === null ? null : <circle key={years[i]} cx={x(i)} cy={y(v)} r="3" fill="white" stroke="#3478f6" strokeWidth="1.5"><title>{years[i]} 年：{formatValue(v)} 万人次 / 日</title></circle>)}</svg><div className="inspector-year-labels"><span>{years[0]}</span><span>{years[years.length-1]}</span></div></> : <p className="inspector-no-trend">暂无可展示的年度序列</p>}</div>
    <div className="inspector-resources"><span><StudioIcon name="route" size={15}/>{city.has_network_map ? "线路图已收录" : "暂无线路图"}</span><span><StudioIcon name="map" size={15}/>{city.has_plan_map ? "规划图已收录" : "暂无规划图"}</span></div>
    <div className="selected-actions"><Link className="action-button" to={href(`/city/${city.city}`, {q:null,city:null})}>查看完整档案<StudioIcon name="arrow" size={16}/></Link><BasketButton city={city}/></div>
    <SourceInfo city={city} metric={metric} year={year}/>
  </section>;
}
