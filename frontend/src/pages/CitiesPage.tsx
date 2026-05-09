import { useMetroData } from '../hooks/useMetroData';
import { useDashboardFilters, hasValidDailyRidership } from '../hooks/useDashboardFilters';
import type { CityFilterTag } from '../types/metro';
import type { MergedCity } from '../hooks/useMetroData';
import SectionTitle from '../components/common/SectionTitle';
import StatusBadge from '../components/common/StatusBadge';

const FILTER_OPTIONS: { key: CityFilterTag; label: string }[] = [
  { key: 'all', label: '全部城市' },
  { key: 'hasRidership', label: '有客流数据' },
  { key: 'noRidership', label: '暂无客流' },
  { key: 'hasNetworkMap', label: '有线路图' },
  { key: 'hasPlanMap', label: '有规划图' },
];

const GRADIENT_COLORS = [
  ['#0d47a1', '#1565c0'], ['#1b5e20', '#2e7d32'], ['#4a148c', '#6a1b9a'],
  ['#e65100', '#f57c00'], ['#006064', '#00838f'], ['#880e4f', '#ad1457'],
  ['#311b92', '#4527a0'], ['#bf360c', '#e64a19'], ['#01579b', '#0277bd'],
  ['#1a237e', '#283593'], ['#33691e', '#558b2f'], ['#827717', '#9e9d24'],
];

function getGradient(city: string): string {
  const idx = city.length % GRADIENT_COLORS.length;
  const [c1, c2] = GRADIENT_COLORS[idx];
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

function CityCard({ city }: { city: MergedCity }) {
  const hasDaily = hasValidDailyRidership(city);
  return (
    <div className="card-glass" style={{
      overflow: 'hidden', cursor: 'default',
      borderRadius: 'var(--radius)',
    }}>
      {/* Cover gradient */}
      <div style={{
        height: 72, background: getGradient(city.city),
        display: 'flex', alignItems: 'flex-end', padding: '0 16px 8px',
        position: 'relative',
      }}>
        <span style={{
          fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
          textShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}>
          {city.city_cn}
        </span>
      </div>

      {/* Metrics */}
      <div style={{ padding: '12px 16px 8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-label)' }}>
            线路/站点
            <span style={{
              color: 'var(--accent)', fontWeight: 600, fontSize: 13, display: 'block', marginTop: 2,
            }}>
              {city.operating_lines} 条 / {city.operating_stations} 座
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-label)' }}>
            日客流
            <span style={{
              color: hasDaily ? 'var(--accent)' : 'var(--text-dim)',
              fontWeight: 600, fontSize: 13, display: 'block', marginTop: 2,
            }}>
              {hasDaily ? city.daily_ridership_wan.toFixed(1) + ' 万' : '暂无数据'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-label)' }}>
            运营里程
            <span style={{
              color: 'var(--accent)', fontWeight: 600, fontSize: 13, display: 'block', marginTop: 2,
            }}>
              {city.operating_mileage_km} km
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-label)' }}>
            客流强度
            <span style={{
              color: city.ridership_intensity > 0 ? 'var(--accent)' : 'var(--text-dim)',
              fontWeight: 600, fontSize: 13, display: 'block', marginTop: 2,
            }}>
              {city.ridership_intensity > 0 ? city.ridership_intensity.toFixed(2) : '--'}
            </span>
          </div>
        </div>

        {/* Badges */}
        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {!hasDaily && <StatusBadge text="暂无客流数据" />}
          {hasDaily && city.ridership_intensity >= 1 && <StatusBadge text="高强度" color="#4caf50" />}
          {city.has_network_map && <StatusBadge text="有线路图" color="#448aff" />}
          {city.has_plan_map && <StatusBadge text="有规划图" color="#ff9800" />}
        </div>
      </div>
    </div>
  );
}

export default function CitiesPage() {
  const { merged, loading, error } = useMetroData();
  const { keyword, setKeyword, cityFilter, setCityFilter, allFilteredCities } = useDashboardFilters(merged);

  if (loading) return <div className="state-message state-message--loading">加载数据中...</div>;
  if (error) return <div className="state-message state-message--error">加载失败：{error}</div>;

  const statsCount = merged.filter((c) => c.has_stats && c.daily_ridership_wan > 0).length;

  return (
    <div className="page-container" style={{ paddingTop: 32, paddingBottom: 40 }}>
      <SectionTitle icon="◆" title="城市资源总览" />
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20, marginTop: -12 }}>
        全国 {merged.length} 个城市地铁资源一览，其中 {statsCount} 个城市有客流数据
      </p>

      {/* Search + Filter */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 20,
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <input
          type="text"
          className="filter-input"
          placeholder="搜索城市..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 200 }}
          aria-label="搜索城市"
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTER_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCityFilter(key)}
              aria-label={`筛选：${label}`}
              style={{
                padding: '5px 14px', borderRadius: 16, fontSize: 12,
                color: cityFilter === key ? 'var(--accent)' : 'var(--text-label)',
                background: cityFilter === key ? 'rgba(0,200,255,0.08)' : 'rgba(60,80,100,0.08)',
                border: cityFilter === key ? '1px solid rgba(0,200,255,0.25)' : '1px solid transparent',
                transition: 'all var(--transition-fast)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {allFilteredCities.length > 0 ? (
        <div className="city-cards-grid">
          {allFilteredCities.map((c) => (
            <CityCard key={c.city} city={c} />
          ))}
        </div>
      ) : (
        <div className="empty-state">暂无匹配城市</div>
      )}
    </div>
  );
}
