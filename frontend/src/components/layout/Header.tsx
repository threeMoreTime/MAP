import { NavLink, Link } from 'react-router-dom';

export default function Header() {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(6,14,26,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(0,180,255,0.08)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      padding: '0 24px', height: 'var(--header-height)',
    }}>
      <div style={{ maxWidth: 'var(--max-width)', width: '100%', display: 'flex', alignItems: 'center' }}>
        <Link to="/" className="gradient-text" style={{ fontSize: 15, fontWeight: 600, letterSpacing: 2, marginRight: 'auto' }}>
          MetroViz
        </Link>
        <div style={{ display: 'flex', gap: 28 }}>
          {[
            { to: '/', label: '数据大屏' },
            { to: '/cities', label: '城市总览' },
            { to: '/about', label: '数据说明' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                color: isActive ? '#00d4ff' : '#5a7a9a',
                fontSize: 13, letterSpacing: 1, padding: '4px 0',
                borderBottom: isActive ? '1px solid #00d4ff' : '1px solid transparent',
                transition: 'all 0.3s',
              })}
            >
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
