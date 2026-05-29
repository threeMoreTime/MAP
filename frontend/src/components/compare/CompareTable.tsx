import type { ComparableCity } from '../../types/metro';

interface Props {
  cities: ComparableCity[];
  isMobile: boolean;
}

function CellValue({ value, unit, fallback }: { value: number | null; unit: string; fallback: string }) {
  if (value === null) {
    return <span style={{ color: '#64748b', fontSize: 12 }}>{fallback}</span>;
  }
  const formatted = value >= 100 ? value.toFixed(0) : value.toFixed(1);
  return <span style={{ color: '#e2e8f0', fontSize: 12 }}>{formatted} {unit}</span>;
}

function BoolCell({ ok }: { ok: boolean }) {
  return (
    <span style={{ color: ok ? '#34d399' : '#64748b', fontSize: 12 }}>
      {ok ? '✔' : '–'}
    </span>
  );
}

const ROWS: { key: string; label: string; unit: string; getVal: (c: ComparableCity) => number | null; getFallback: (c: ComparableCity) => string }[] = [
  { key: 'daily', label: '日客流', unit: '万人次', getVal: c => c.dailyRidershipWan, getFallback: c => c.hasStats ? '暂无日客流展示值' : '暂未收录' },
  { key: 'mileage', label: '运营里程', unit: 'km', getVal: c => c.operatingMileageKm, getFallback: () => '暂未收录' },
  { key: 'stations', label: '运营站点', unit: '座', getVal: c => c.operatingStations, getFallback: () => '暂未收录' },
  { key: 'lines', label: '运营线路', unit: '条', getVal: c => c.operatingLines, getFallback: () => '暂未收录' },
  { key: 'intensity', label: '客流强度', unit: '', getVal: c => c.ridershipIntensity, getFallback: () => '暂未收录' },
  { key: 'peak', label: '峰值客流', unit: '万人次', getVal: c => c.peakRidershipWan, getFallback: () => '暂未收录' },
];

export default function CompareTable({ cities, isMobile }: Props) {
  if (isMobile) {
    return (
      <section className="card-glass" style={{ padding: 20, borderRadius: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#00d4ff', marginBottom: 16 }}>
          详细对比
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {cities.map(c => (
            <div key={c.city} style={{
              padding: 14, borderRadius: 8,
              background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#22d3ee', marginBottom: 10 }}>
                {c.city_cn}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ROWS.map(r => (
                  <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#718096' }}>{r.label}</span>
                    <CellValue value={r.getVal(c)} unit={r.unit} fallback={r.getFallback(c)} />
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#718096' }}>年度趋势</span>
                  <BoolCell ok={c.hasYearlyTrend} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#718096' }}>线路图</span>
                  <BoolCell ok={c.hasNetworkMap} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#718096' }}>规划图</span>
                  <BoolCell ok={c.hasPlanMap} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#718096' }}>封面状态</span>
                  <span style={{ fontSize: 12, color: c.coverStatus === 'downloaded' ? '#34d399' : '#64748b' }}>
                    {c.coverStatus === 'downloaded' ? '已收录' : '资源收集中'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#718096' }}>完整度评分</span>
                  <span style={{ fontSize: 12, color: c.qualityScore !== null ? '#00d4ff' : '#64748b', fontWeight: 600 }}>
                    {c.qualityScore ?? '–'}
                  </span>
                </div>
                {c.missingItems.length > 0 && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    缺失: {c.missingItems.join('、')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="card-glass" style={{ padding: 20, borderRadius: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#00d4ff', marginBottom: 16 }}>
        详细对比
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(34,211,238,0.10)', color: '#94a3b8' }}>
              <th style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 500 }}>指标</th>
              {cities.map(c => (
                <th key={c.city} style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600, color: '#22d3ee' }}>
                  {c.city_cn}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(r => (
              <tr key={r.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '10px 10px', color: '#a0aec0' }}>{r.label}{r.unit ? `（${r.unit}）` : ''}</td>
                {cities.map(c => (
                  <td key={c.city} style={{ padding: '10px 10px', textAlign: 'center' }}>
                    <CellValue value={r.getVal(c)} unit="" fallback={r.getFallback(c)} />
                  </td>
                ))}
              </tr>
            ))}
            {/* Boolean rows */}
            {([
              { key: 'trend', label: '年度趋势', get: (c: ComparableCity) => c.hasYearlyTrend },
              { key: 'network', label: '线路图', get: (c: ComparableCity) => c.hasNetworkMap },
              { key: 'plan', label: '规划图', get: (c: ComparableCity) => c.hasPlanMap },
            ] as const).map(r => (
              <tr key={r.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '10px 10px', color: '#a0aec0' }}>{r.label}</td>
                {cities.map(c => (
                  <td key={c.city} style={{ padding: '10px 10px', textAlign: 'center' }}>
                    <BoolCell ok={r.get(c)} />
                  </td>
                ))}
              </tr>
            ))}
            {/* Cover status */}
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <td style={{ padding: '10px 10px', color: '#a0aec0' }}>封面状态</td>
              {cities.map(c => (
                <td key={c.city} style={{ padding: '10px 10px', textAlign: 'center', fontSize: 12 }}>
                  <span style={{ color: c.coverStatus === 'downloaded' ? '#34d399' : '#64748b' }}>
                    {c.coverStatus === 'downloaded' ? '已收录' : '资源收集中'}
                  </span>
                </td>
              ))}
            </tr>
            {/* Quality score */}
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <td style={{ padding: '10px 10px', color: '#a0aec0' }}>完整度评分</td>
              {cities.map(c => (
                <td key={c.city} style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700 }}>
                  <span style={{ color: c.qualityScore !== null ? '#00d4ff' : '#64748b' }}>
                    {c.qualityScore ?? '–'}
                  </span>
                </td>
              ))}
            </tr>
            {/* Missing items */}
            <tr>
              <td style={{ padding: '10px 10px', color: '#a0aec0' }}>缺失项</td>
              {cities.map(c => (
                <td key={c.city} style={{ padding: '10px 10px', textAlign: 'center', fontSize: 11, color: '#94a3b8', maxWidth: 160 }}>
                  {c.missingItems.length === 0 ? <span style={{ color: '#475569' }}>—</span> : c.missingItems.join('、')}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
