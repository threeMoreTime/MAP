import { Link, NavLink, useLocation } from "react-router-dom";
import { useBasket, useMotion } from "../../hooks/useResearch";
import StudioIcon, { type StudioIconName } from "../research/StudioIcon";

const items: { to: string; label: string; icon: StudioIconName; end: boolean }[] = [
  { to: "/", label: "全国概览", icon: "overview", end: true },
  { to: "/cities", label: "城市档案", icon: "city", end: false },
  { to: "/compare", label: "对标分析", icon: "compare", end: false },
  { to: "/maps", label: "线网图集", icon: "map", end: false },
];
export default function Header() {
  const { ids, href } = useBasket();
  const motion = useMotion();
  const { pathname } = useLocation();
  const current = items.find(i => i.to === pathname)?.label || (pathname.startsWith("/city/") ? "城市档案" : "数据说明");
  return <>
    <aside className="studio-sidebar">
      <a className="skip-link" href="#main-content">跳至主要内容</a>
      <Link to={href("/", { q: null, city: null })} className="studio-brand">
        <span className="studio-brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M7 23V9l9 9 9-9v14" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="25" r="2" fill="currentColor"/><circle cx="25" cy="25" r="2" fill="currentColor"/></svg></span>
        <span>MetroViz<small>城市轨道交通研究</small></span>
      </Link>
      <div className="workspace-badge"><span className="workspace-monogram">M</span><div>交通数据工作台<small>Research workspace</small></div><StudioIcon name="chevron" size={14}/></div>
      <span className="sidebar-label">工作空间</span>
      <nav aria-label="主导航">{items.map(item => <NavLink key={item.to} to={href(item.to, { q: null, city: null, tab: null })} end={item.end} className={({isActive}) => isActive ? "is-active" : ""}><StudioIcon name={item.icon}/><span>{item.label}</span>{item.to === "/compare" && ids.length > 0 && <span className="nav-count">{ids.length}</span>}</NavLink>)}</nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note"><StudioIcon name="layers" size={23}/><strong>读懂城市的流动</strong><p>从空间分布，到历史轨迹。<br/>为每一次研究找到依据。</p><Link to="/about">了解数据与来源 <StudioIcon name="arrow" size={14}/></Link></div>
        <Link className="sidebar-help" to="/about"><StudioIcon name="info"/>数据与指标说明</Link>
        <div className="sidebar-edition"><span className="status-dot"/>MetroViz Research <span>V2</span></div>
      </div>
    </aside>
    <header className="research-header studio-topbar">
      <div className="studio-breadcrumb"><StudioIcon name="layers" size={17}/><span>工作空间</span><span>/</span><strong>{current}</strong></div>
      <div className="header-tools"><span className="history-chip"><span/>历史资料研究</span><button className="motion-toggle" aria-pressed={motion.reduced} disabled={motion.system} onClick={motion.toggle} title={motion.system ? "已遵循系统减少动态效果设置" : "切换减少动态效果"}><StudioIcon name="motion" size={15}/>{motion.reduced ? "动效已减弱" : "减少动态效果"}</button><Link className="topbar-help" to="/about" aria-label="数据说明"><StudioIcon name="info"/></Link></div>
    </header>
  </>;
}
