import { Link, NavLink } from "react-router-dom";
import { useBasket, useMotion } from "../../hooks/useResearch";

const items = [
  { to: "/", label: "全国概览", end: true },
  { to: "/cities", label: "城市档案", end: false },
  { to: "/compare", label: "对标分析", end: false },
  { to: "/maps", label: "线网图集", end: false },
];
export default function Header() {
  const { ids, href } = useBasket();
  const motion = useMotion();
  return (
    <header className="research-header">
      <a className="skip-link" href="#main-content">
        跳至主要内容
      </a>
      <div className="header-inner">
        <Link to={href("/", { q: null, city: null })} className="brand">
          <span className="brand-symbol" aria-hidden="true">
            M<span />
          </span>
          <span>
            MetroViz<small>城市地铁客流研究台</small>
          </span>
        </Link>
        <nav aria-label="主导航">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={href(item.to, { q: null, city: null, tab: null })}
              end={item.end}
              className={({ isActive }) => (isActive ? "is-active" : "")}
            >
              {item.label}
              {item.to === "/compare" && ids.length > 0 && (
                <span className="nav-count">{ids.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="header-tools">
          <button
            className="motion-toggle"
            aria-pressed={motion.reduced}
            disabled={motion.system}
            onClick={motion.toggle}
            title={
              motion.system ? "已遵循系统减少动态效果设置" : "切换减少动态效果"
            }
          >
            {motion.reduced ? "动效已减弱" : "减少动态效果"}
          </button>
          <Link to="/about">数据说明 ↗</Link>
        </div>
      </div>
    </header>
  );
}
