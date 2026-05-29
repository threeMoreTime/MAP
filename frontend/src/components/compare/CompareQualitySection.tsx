import type { ComparableCity } from '../../types/metro';

interface Props {
  cities: ComparableCity[];
  isMobile: boolean;
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

export default function CompareQualitySection({ cities, isMobile }: Props) {
  return (
    <section className="card-glass" style={{ padding: 20, borderRadius: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#00d4ff', marginBottom: 16 }}>
        数据完整度对比
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : `repeat(${Math.min(cities.length, 5)}, 1fr)`,
        gap: 16,
      }}>
        {cities.map(c => (
          <div key={c.city} style={{
            padding: 14, borderRadius: 8,
            background: 'rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{c.city_cn}</span>
              <QualityBadge level={c.qualityLevel} />
            </div>

            {/* Score bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#718096', marginBottom: 4 }}>
                <span>数据完整度评分</span>
                <span style={{ fontWeight: 700, color: c.qualityScore !== null ? '#00d4ff' : '#64748b' }}>
                  {c.qualityScore ?? '–'} / 100
                </span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', height: 6, borderRadius: 3 }}>
                <div style={{
                  background: c.qualityScore !== null && c.qualityScore >= 60 ? '#00d4ff' : '#94a3b8',
                  width: `${c.qualityScore ?? 0}%`, height: '100%', borderRadius: 3,
                  transition: 'width 0.4s',
                }} />
              </div>
            </div>

            {/* Resource status grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, fontSize: 12 }}>
              {[
                { ok: c.hasNetworkMap, label: '线路图' },
                { ok: c.hasPlanMap, label: '规划图' },
                { ok: c.coverStatus === 'downloaded', label: '封面' },
              ].map(r => (
                <div key={r.label} style={{
                  textAlign: 'center', color: r.ok ? '#34d399' : '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                }}>
                  <span style={{ fontWeight: 700 }}>{r.ok ? '✔' : '–'}</span> {r.label}
                </div>
              ))}
            </div>

            {/* Missing items */}
            {c.missingItems.length > 0 && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                <strong>缺失:</strong> {c.missingItems.slice(0, 3).join('、')}{c.missingItems.length > 3 ? '...' : ''}
              </div>
            )}
            {c.warnings.length > 0 && (
              <div style={{ fontSize: 11, color: '#dd6b20' }}>
                {c.warnings[0]}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{
        fontSize: 11, color: '#718096', marginTop: 14, padding: '6px 12px',
        background: 'rgba(0,0,0,0.08)', borderRadius: 4,
      }}>
        数据完整度评分仅反映本项目当前收录资料的完整程度，不代表城市地铁运营水平。
      </div>
    </section>
  );
}
