import { useMemo, useRef } from 'react';
import { hasValidDailyRidership } from '../../hooks/useDashboardFilters';
import { useEChart } from '../../hooks/useEChart';
import { PAPER_TOOLTIP, CHART_VERMILION } from './chartUtils';
import type { MergedCity } from '../../hooks/useMetroData';

interface Props {
  city: MergedCity | null;
}

/** 年度趋势迷你面积图（sparkline，替代纯文字年份列表） */
function TrendSparkline({ years, values }: { years: number[]; values: number[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const option = useMemo(() => ({
    tooltip: {
      trigger: 'axis' as const,
      ...PAPER_TOOLTIP,
      formatter: (p: unknown) => {
        const raw = Array.isArray(p) ? p[0] : p;
        const d = raw as { name: string; value: number | null | undefined };
        return `${d.name} 年 · 日均 <b style="color:#a83622">${d.value != null ? d.value.toFixed(1) : '--'}</b> 万`;
      },
    },
    grid: { top: 8, right: 4, bottom: 18, left: 4, containLabel: false },
    xAxis: {
      type: 'category' as const,
      data: years.map(String),
      axisLine: { lineStyle: { color: 'rgba(33,29,22,0.15)' } },
      axisTick: { show: false },
      axisLabel: { color: '#8f8672', fontSize: 10, interval: years.length > 6 ? 1 : 0 },
    },
    yAxis: { type: 'value' as const, show: false },
    series: [{
      type: 'line' as const,
      data: values,
      smooth: true,
      symbolSize: 4,
      lineStyle: { color: CHART_VERMILION, width: 2 },
      itemStyle: { color: CHART_VERMILION },
      areaStyle: {
        color: {
          type: 'linear' as const,
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(192,61,43,0.20)' },
            { offset: 1, color: 'rgba(192,61,43,0.01)' },
          ],
        },
      },
      animationDuration: 600,
    }],
  }), [years, values]);

  useEChart(containerRef, option, [years.join(','), values.join(',')]);

  return <div ref={containerRef} className="h-[110px] w-full" />;
}

export default function CityDetailPanel({ city }: Props) {
  const metrics = useMemo(() => {
    if (!city) return null;
    return {
      hasDaily: hasValidDailyRidership(city),
      daily: city.daily_ridership_wan,
      intensity: city.ridership_intensity,
      mileage: city.operating_mileage_km,
      constructing: city.lines_under_construction,
      peak: city.peak_ridership_wan,
      peakDate: city.peak_ridership_date,
      lines: city.operating_lines,
      stations: city.operating_stations,
      yearly: city.stats?.yearly_avg_ridership,
    };
  }, [city]);

  if (!city || !metrics) {
    return (
      <div className="flex h-full items-center justify-center p-5 text-[14px] text-ink-300">
        点击地图上的城市查看详细指标
      </div>
    );
  }

  const heroCards = [
    { label: '日客流', value: metrics.hasDaily ? metrics.daily.toFixed(1) : '--', unit: '万', hot: true },
    { label: '客流强度', value: metrics.intensity > 0 ? metrics.intensity.toFixed(2) : '--', unit: '', hot: false },
    { label: '运营里程', value: String(metrics.mileage), unit: 'km', hot: false },
    { label: '在建线路', value: String(metrics.constructing), unit: '条', hot: false },
  ];

  const rows = [
    { k: '历史最高', v: metrics.peak > 0 ? `${metrics.peak} 万 (${metrics.peakDate})` : '--' },
    { k: '运营线路', v: `${metrics.lines} 条` },
    { k: '运营站点', v: `${metrics.stations} 座` },
  ];

  return (
    <div className="max-h-full overflow-y-auto px-1 py-0.5">
      <div className="mb-3 text-center font-serif text-[18px] font-semibold text-vermilion-600">
        {city.city_cn}
      </div>

      {/* 关键指标 2×2 卡 */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        {heroCards.map(c => (
          <div
            key={c.label}
            className={`rounded-md px-3 py-2.5 text-center ${
              c.hot ? 'bg-vermilion-50' : 'bg-paper-50'
            }`}
          >
            <div className={`font-serif text-[22px] font-semibold leading-tight tabular-nums ${c.hot ? 'text-vermilion-600' : 'text-ink-900'}`}>
              {c.value}{c.unit && <span className="ml-0.5 text-[11px] font-normal text-ink-400">{c.unit}</span>}
            </div>
            <div className="mt-0.5 text-[11px] text-ink-500">{c.label}</div>
          </div>
        ))}
      </div>

      {/* 其余指标紧凑行 */}
      {rows.map(r => (
        <div
          key={r.k}
          className="flex justify-between border-b border-[rgba(33,29,22,0.08)] py-2 text-[13px]"
        >
          <span className="text-ink-500">{r.k}</span>
          <span className="font-medium text-ink-900 tabular-nums">{r.v}</span>
        </div>
      ))}

      {/* 年度趋势迷你图 */}
      {metrics.yearly && metrics.yearly.years.length > 0 ? (
        <div className="mt-3 rounded-md bg-paper-50 px-2 pb-1 pt-2.5">
          <div className="mb-0.5 flex items-baseline justify-between px-1">
            <span className="text-[11px] font-medium text-ink-700">年度日均客流趋势</span>
            <span className="text-[10px] text-ink-400 tabular-nums">
              {metrics.yearly.years[0]}–{metrics.yearly.years[metrics.yearly.years.length - 1]}
            </span>
          </div>
          <TrendSparkline years={metrics.yearly.years} values={metrics.yearly.values} />
        </div>
      ) : (
        <div className="mt-3 rounded-md bg-paper-50 py-4 text-center text-[12px] text-ink-400">
          暂无年度趋势数据
        </div>
      )}
    </div>
  );
}
