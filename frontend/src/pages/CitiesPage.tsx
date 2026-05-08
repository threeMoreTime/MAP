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
    <div style={{
      background: 'linear-gradient(135deg, rgba(8,22,48,0.85), rgba(12,30,58,0.7))',
      border: '1px solid rgba(0,150,220,0.1)', borderRadius: 'var(--radius)',
      overflow: 'hidden', transition: 'all 0.3s ease', cursor: 'default',
    }}>
      <div style={{
        height: 80, background: getGradient(city.city),
        display: 'flex', alignItems: 'flex-end', padding: '0 16px 8px',
        position: 'relative',
      }}>
        <span style={{
          fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.85)',
          textShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}>
          {city.city_cn}
        </span>
      </div>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div style={{ fontSize: 11, color: '#4a6a8a' }}>
            线路/站点
            <span style={{ color: '#00d4ff', fontWeight: 600, fontSize: 13, display: 'block' }}>
              {city.operating_lines} 条 / {city.operating_stations} 座
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#4a6a8a' }}>
            日客流
            <span style={{ color: hasDaily ? '#00d4ff' : '#3a4a5a', fontWeight: 600, fontSize: 13, display: 'block' }}>
              {hasDaily ? city.daily_ridership_wan.toFixed(1) + ' 万' : '暂无'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#4a6a8a' }}>
            运营里程
            <span style={{ color: '#00d4ff', fontWeight: 600, fontSize: 13, display: 'block' }}>
              {city.operating_mileage_km} km
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#4a6a8a' }}>
            客流强度
            <span style={{ color: city.ridership_intensity > 0 ? '#00d4ff' : '#3a4a5a', fontWeight: 600, fontSize: 13, display: 'block' }}>
              {city.ridership_intensity > 0 ? city.ridership_intensity.toFixed(2) : '--'}
            </span>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          {!hasDaily && <StatusBadge text="暂无客流数据" />}
          {hasDaily && city.ridership_intensity >= 1 && <StatusBadge text="高强度" color="#4caf50" />}
        </div>
      </div>
    </div>
  );
}

export default function CitiesPage() {
  const { merged, loading, error } = useMetroData();
  const { keyword, setKeyword, cityFilter, setCityFilter, allFilteredCities } = useDashboardFilters(merged);

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#4a6a8a' }}>加载数据中...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: 80, color: '#ff5252' }}>加载失败：{error}</div>;

  const statsCount = merged.filter((c) => c.has_stats && c.daily_ridership_wan > 0).length;

  return (
    <div className="page-container" style={{ paddingTop: 32, paddingBottom: 40 }}>
      <SectionTitle icon="◆" title="城市资源总览" />
      <p style={{ color: '#5a7a9a', fontSize: 13, marginBottom: 20, marginTop: -12 }}>
        全国 {merged.length} 个城市地铁资源一览，{statsCount} 个城市有客流数据
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="搜索城市..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{
            background: 'rgba(6,18,38,0.9)', border: '1px solid rgba(0,150,220,0.2)',
            color: '#c8d6e5', borderRadius: 6, padding: '7px 14px', fontSize: 13,
            outline: 'none', width: 200,
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTER_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCityFilter(key)}
              style={{
                padding: '4px 14px', borderRadius: 16, fontSize: 12,
                color: cityFilter === key ? '#00d4ff' : '#4a6a8a',
                background: cityFilter === key ? 'rgba(0,200,255,0.1)' : 'rgba(60,80,100,0.1)',
                border: cityFilter === key ? '1px solid rgba(0,200,255,0.3)' : '1px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 14,
      }}>
        {allFilteredCities.map((c) => (
          <CityCard key={c.city} city={c} />
        ))}
      </div>

      {allFilteredCities.length === 0 && (
        <div style={{ textAlign: 'center', color: '#2a3a4a', padding: 40 }}>
          无匹配城市
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .page-container > div:last-of-type { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .page-container > div:last-of-type { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .page-container > div:last-of-type { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
