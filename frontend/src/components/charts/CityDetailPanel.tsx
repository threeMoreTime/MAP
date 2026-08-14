import { useMemo } from 'react';
import { hasValidDailyRidership } from '../../hooks/useDashboardFilters';
import type { MergedCity } from '../../hooks/useMetroData';

interface Props {
  city: MergedCity | null;
}

export default function CityDetailPanel({ city }: Props) {
  const metrics = useMemo(() => {
    if (!city) return null;
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

  if (!city || !metrics) {
    return (
      <div className="flex h-full items-center justify-center p-5 text-[14px] text-ink-300">
        点击地图上的城市查看详细指标
      </div>
    );
  }

  const yearly = city.stats?.yearly_avg_ridership;

  return (
    <div className="max-h-full overflow-y-auto px-1 py-0.5">
      <div className="mb-3 text-center font-serif text-[18px] font-semibold text-vermilion-600">
        {city.city_cn}
      </div>

      {metrics.map((m) => (
        <div
          key={m.k}
          className="flex justify-between border-b border-[rgba(33,29,22,0.08)] py-2 text-[13px]"
        >
          <span className="text-ink-500">{m.k}</span>
          <span className="font-medium text-ink-900 tabular-nums">{m.v}</span>
        </div>
      ))}

      {yearly && yearly.years.length > 0 && (
        <div className="mt-3">
          <div className="flex justify-between border-b border-[rgba(33,29,22,0.08)] py-2 text-[13px]">
            <span className="text-ink-500">年度趋势</span>
            <span />
          </div>
          {yearly.years.map((y, i) => (
            <div
              key={y}
              className="flex justify-between border-b border-[rgba(33,29,22,0.05)] py-1.5 text-[12px]"
            >
              <span className="text-ink-500 tabular-nums">{y}</span>
              <span className="text-ink-700 tabular-nums">{yearly.values[i].toFixed(1)} 万</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
