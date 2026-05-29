import type { ComparableCity } from '../../types/metro';

interface Props {
  cities: ComparableCity[];
  isMobile: boolean;
}

function MetricValue({ value, unit, fallback }: { value: number | null; unit: string; fallback: string }) {
  if (value === null) {
    return <span style={{ color: '#64748b', fontSize: 13 }}>{fallback}</span>;
  }
  const formatted = value >= 100 ? value.toFixed(0) : value.toFixed(1);
  return (
    <span style={{ fontSize: 13, color: '#e2e8f0' }}>
      <span style={{ color: '#00d4ff', fontWeight: 600, fontSize: 15 }}>{formatted}</span>
      {' '}{unit}
    </span>
  );
}

function QualityBadge({ level }: { level: 'high' | 'medium' | 'low' | null }) {
  if (!level) return <span style={{ fontSize: 11, color: '#64748b' }}>暂未收录</span>;
  const config = {
    high: { label: '完整度高', bg: 'rgba(52,211,153,0.12)', color: '#34d399', border: 'rgba(52,211,153,0.20)' },
    medium: { label: '完整度中', bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: 'rgba(251,191,36,0.20)' },
    low: { label: '完整度低', bg: 'rgba(100,116,139,0.10)', color: '#94a3b8', border: 'rgba(100,116,139,0.18)' },
  }[level];
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
      background: config.bg, color: config.color, border: `1px solid ${config.border}`,
    }}>{config.label}</span>
  );
}

export default function CompareMetricCards({ cities, isMobile }: Props) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : `repeat(${Math.min(cities.length, 5)}, 1fr)`,
      gap: 16,
    }}>
      {cities.map(c => (
        <div key={c.city} className="card-glass" style={{
          padding: 18, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10,
          border: '1px solid rgba(0,212,255,0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{c.city_cn}</span>
            <QualityBadge level={c.qualityLevel} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: 13 }}>
            <div>
              <div style={{ color: '#718096', fontSize: 11, marginBottom: 2 }}>日客流</div>
              <MetricValue value={c.dailyRidershipWan} unit="万人次" fallback={c.hasStats ? '暂无日客流展示值' : '暂未收录'} />
            </div>
            <div>
              <div style={{ color: '#718096', fontSize: 11, marginBottom: 2 }}>运营里程</div>
              <MetricValue value={c.operatingMileageKm} unit="km" fallback="暂未收录" />
            </div>
            <div>
              <div style={{ color: '#718096', fontSize: 11, marginBottom: 2 }}>运营站点</div>
              <MetricValue value={c.operatingStations} unit="座" fallback="暂未收录" />
            </div>
            <div>
              <div style={{ color: '#718096', fontSize: 11, marginBottom: 2 }}>运营线路</div>
              <MetricValue value={c.operatingLines} unit="条" fallback="暂未收录" />
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#a0aec0' }}>
              完整度 <span style={{ fontWeight: 700, color: c.qualityScore !== null ? '#00d4ff' : '#64748b' }}>{c.qualityScore ?? '–'}</span> 分
            </span>
            <span style={{ fontSize: 11, color: c.missingItems.length === 0 ? '#34d399' : '#94a3b8' }}>
              缺失 {c.missingItems.length} 项
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
