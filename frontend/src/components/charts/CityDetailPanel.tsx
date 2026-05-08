import { useMemo } from 'react';
import { hasValidDailyRidership } from '../../hooks/useDashboardFilters';
import type { MergedCity } from '../../hooks/useMetroData';

interface Props {
  city: MergedCity | null;
}

export default function CityDetailPanel({ city }: Props) {
  if (!city) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#2a3a4a',
        fontSize: 14,
        padding: 20,
      }}>
        点击地图上的城市查看详细指标
      </div>
    );
  }

  const yearly = city.stats?.yearly_avg_ridership;

  const metrics = useMemo(() => {
    const items = [
      { k: '日客流量', v: hasValidDailyRidership(city) ? `${city.daily_ridership_wan.toFixed(1)} 万` : '暂无数据' },
      { k: '历史最高', v: `${city.peak_ridership_wan} 万 (${city.peak_ridership_date})` },
      { k: '客流强度', v: city.ridership_intensity.toFixed(2) },
      { k: '运营线路', v: `${city.operating_lines} 条` },
      { k: '运营站点', v: `${city.operating_stations} 座` },
      { k: '运营里程', v: `${city.operating_mileage_km} km` },
      { k: '在建线路', v: `${city.lines_under_construction} 条` },
    ];
    return items;
  }, [city]);

  return (
    <div style={{ padding: '0 4px', overflowY: 'auto', maxHeight: '100%' }}>
      <div style={{
        fontSize: 18, fontWeight: 'bold', color: '#00d4ff',
        marginBottom: 12, textAlign: 'center',
      }}>
        {city.city_cn}
      </div>

      {metrics.map((m) => (
        <div key={m.k} style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '8px 0', borderBottom: '1px solid rgba(0,120,180,0.1)',
          fontSize: 13,
        }}>
          <span style={{ color: '#4a6a8a' }}>{m.k}</span>
          <span style={{ color: '#c8d6e5', fontWeight: 'bold' }}>{m.v}</span>
        </div>
      ))}

      {yearly && yearly.years.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,120,180,0.1)', fontSize: 13 }}>
            <span style={{ color: '#4a6a8a' }}>年度趋势</span>
            <span />
          </div>
          {yearly.years.map((y, i) => (
            <div key={y} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '6px 0', borderBottom: '1px solid rgba(0,120,180,0.06)',
              fontSize: 12,
            }}>
              <span style={{ color: '#4a6a8a' }}>{y}</span>
              <span style={{ color: '#c8d6e5' }}>{yearly.values[i].toFixed(1)} 万</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
