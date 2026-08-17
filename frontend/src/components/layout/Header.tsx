import { NavLink, Link } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: '数据大屏', end: true },
  { to: '/cities', label: '城市总览', end: false },
  { to: '/compare', label: '城市对比', end: false },
  { to: '/data-quality', label: '数据质量', end: false },
  { to: '/about', label: '数据说明', end: false },
];

export default function Header() {
  return (
    <nav className="sticky top-0 z-[100] border-b border-paper-300 bg-paper-50/95">
      <div className="mx-auto flex h-[52px] w-full max-w-[1180px] items-center gap-6 px-4 sm:px-6">
        <Link
          to="/"
          className="mr-auto flex items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion-500"
        >
          {/* 朱印 · 站点签章 */}
          <span className="flex size-5 items-center justify-center rounded-[3px] bg-vermilion-600 font-serif text-[12px] font-semibold leading-none text-paper-50">
            铁
          </span>
          <span className="font-serif text-[15px] font-semibold text-ink-900">MetroViz</span>
        </Link>
        <div className="hidden items-center gap-5 sm:flex">
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `border-b-2 pb-0.5 pt-1 text-[13px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vermilion-500 ${
                  isActive
                    ? 'border-vermilion-500 font-medium text-ink-900'
                    : 'border-transparent text-ink-500 hover:text-ink-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
        {/* 移动端导航：横向滚动 */}
        <div className="flex items-center gap-4 overflow-x-auto sm:hidden">
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `whitespace-nowrap border-b-2 pb-0.5 pt-1 text-[13px] ${
                  isActive
                    ? 'border-vermilion-500 font-medium text-ink-900'
                    : 'border-transparent text-ink-500'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
