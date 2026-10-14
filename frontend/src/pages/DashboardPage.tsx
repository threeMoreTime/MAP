import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMetroData } from "../hooks/useMetroData";
import { useBasket } from "../hooks/useResearch";
import { filterCities, observe, parseResearchQuery } from "../lib/research";
import ResearchMap from "../components/research/ResearchMap";
import CityInspector from "../components/research/CityInspector";
import StudioIcon, { type StudioIconName } from "../components/research/StudioIcon";
import { CityTable, ComparisonTray, ContextBar, DataState, MetricControls, PageHeading, StrictNotice } from "../components/research/WorkbenchUI";

export default function DashboardPage() {
  const { merged, loading, error, manifest } = useMetroData();
  const [params, setParams] = useSearchParams();
  const view = parseResearchQuery(params, merged);
  const { href } = useBasket();
  const sort = params.get("sort") || "name";
  const change = (key: string, value: string) => setParams(prev => { const next = new URLSearchParams(prev); next.set(key,value); return next; }, {replace:true});
  const [mapOpen, setMapOpen] = useState(false);
  const cities = useMemo(() => filterCities(merged, view.keyword).sort((a,b) => sort === "value" ? (observe(b,view.metric,view.year).value ?? -1) - (observe(a,view.metric,view.year).value ?? -1) : a.city_cn.localeCompare(b.city_cn,"zh-CN")),[merged,view.keyword,view.metric,view.year,sort]);
  const selected = cities.find(c => c.city === params.get("city")) || cities.find(c => c.city === "shanghai") || cities[0];
  const select = (id: string) => change("city",id);
  if (loading || error) return <div className="workbench"><DataState loading={loading} error={error}/></div>;
  const stats: {label:string;value:number;unit:string;note:string;icon:StudioIconName}[] = [
    {label:"收录城市",value:merged.length,unit:"城",note:"全国轨道交通资料索引",icon:"city"},
    {label:"年度客流序列",value:merged.filter(c => c.stats?.yearly_avg_ridership.years.length).length,unit:"城",note:"可查阅历年客流变化",icon:"compare"},
    {label:"日客流快照",value:merged.filter(c => observe(c,"daily_snapshot",view.year).value !== null).length,unit:"城",note:"统计时点待核验",icon:"clock"},
    {label:"线网图件",value:merged.reduce((n,c) => n+Number(c.has_network_map)+Number(c.has_plan_map),0),unit:"份",note:"运营线路图与规划图",icon:"layers"},
  ];
  return <div className="workbench dashboard-workbench">
    <PageHeading eyebrow="NATIONAL OVERVIEW" title="全国轨道交通概览" description="连接城市、客流与线网，探索中国轨道交通的空间图景。" action={<Link className="quiet-button" to={href("/compare",{q:null,city:null})}><StudioIcon name="compare" size={16}/>城市对标<StudioIcon name="arrow" size={15}/></Link>}/>
    <div className="overview-stats">{stats.map((s,i) => <div key={s.label} className={`stat-card stat-card-${i}`}><div className="stat-label"><span>{s.label}</span><span className="stat-icon"><StudioIcon name={s.icon} size={18}/></span></div><strong>{s.value}<small> {s.unit}</small></strong><p><span/>{s.note}</p></div>)}</div>
    <div className="dashboard-filter-panel"><MetricControls cities={merged}/><ContextBar cities={cities} metric={view.metric} year={view.year} collectedAt={manifest?.stats_scrape_date}/></div>
    {view.strict ? <StrictNotice/> : <>
      <button className="mobile-map-toggle quiet-button" aria-expanded={mapOpen} onClick={() => setMapOpen(!mapOpen)}><StudioIcon name="map"/>{mapOpen ? "收起空间视图" : "展开空间视图 · 支持 3D"}</button>
      <div className="overview-grid"><div className={`spatial-column ${mapOpen ? "mobile-map-open" : ""}`}><ResearchMap cities={cities} metric={view.metric} year={view.year} selected={selected?.city || ""} onSelect={select}/></div>{selected ? <CityInspector city={selected} cities={cities} metric={view.metric} year={view.year} onSelect={select}/> : <section className="research-panel research-empty"><StudioIcon name="search" size={32}/><h2>未找到匹配城市</h2><p>请尝试其他名称，或清空搜索条件。</p><button className="action-button" onClick={() => change("q", "")}>清空搜索</button></section>}</div>
      <section className="research-panel city-list-panel"><div className="panel-top"><div><span className="eyebrow">CITY DATA EXPLORER</span><h2>城市数据索引 <small>{cities.length} 座城市</small></h2></div><div className="index-tools"><span>点击城市，联动上方地图与档案</span><label className="inline-select"><span className="sr-only">城市列表排序</span><select aria-label="城市列表排序" value={sort} onChange={e => change("sort",e.target.value)}><option value="name">按城市名称</option><option value="value">按源数据值</option></select></label></div></div><CityTable cities={cities} metric={view.metric} year={view.year} selected={selected?.city} onSelect={select} compact/><div className="index-footer"><p className="panel-footnote">源值用于资料浏览；统计口径待核验，不构成全国排名。</p><Link to={href("/cities",{q:null,city:null})}>浏览全部城市档案 <StudioIcon name="arrow" size={14}/></Link></div></section>
    </>}
    <ComparisonTray cities={merged}/>
  </div>;
}
