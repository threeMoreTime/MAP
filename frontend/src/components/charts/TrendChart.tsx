import { useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { useEChart } from '../../hooks/useEChart';
import { COLOR_PALETTE, AXIS_LABEL_STYLE, SPLIT_LINE_STYLE } from './chartUtils';
import { hasValidDailyRidership } from '../../hooks/useDashboardFilters';
import type { MergedCity } from '../../hooks/useMetroData';

interface Props {
  data: MergedCity[];
}

export default function TrendChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const top8 = useMemo(() => {
    return [...data]
      .filter(hasValidDailyRidership)
      .sort((a, b) => b.daily_ridership_wan - a.daily_ridership_wan)
      .slice(0, 8);
  }, [data]);

  const option = useMemo<echarts.EChartsOption | null>(() => {
    if (top8.length === 0) return null;

    // Merge all years into a unified sorted axis
    const yearSet = new Set<number>();
    top8.forEach((d) => {
      if (d.stats?.yearly_avg_ridership?.years) {
        d.stats.yearly_avg_ridership.years.forEach((y) => yearSet.add(y));
      }
    });
    const allYears = [...yearSet].sort((a, b) => a - b);

    // Align each city's data to the unified year axis with null for missing years
    const seriesData = top8.map((d) => {
      const yearMap: Record<number, number> = {};
      if (d.stats?.yearly_avg_ridership) {
        d.stats.yearly_avg_ridership.years.forEach((y, i) => {
          yearMap[y] = d.stats!.yearly_avg_ridership.values[i];
        });
      }
      return allYears.map((y) => (y in yearMap ? yearMap[y] : null));
    });

    return {
      tooltip: { trigger: 'axis' },
      legend: {
        data: top8.map((d) => d.city_cn),
        textStyle: { color: '#ccc', fontSize: 11 },
        top: 0,
        type: 'scroll',
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
      xAxis: {
        type: 'category',
        data: allYears.map(String),
        axisLabel: AXIS_LABEL_STYLE,
        splitLine: SPLIT_LINE_STYLE,
      },
      yAxis: {
        type: 'value',
        axisLabel: AXIS_LABEL_STYLE,
        splitLine: SPLIT_LINE_STYLE,
      },
      series: top8.map((d, i) => ({
        name: d.city_cn,
        type: 'line' as const,
        smooth: true,
        data: seriesData[i],
        connectNulls: false,
        lineStyle: { width: 2 },
        symbolSize: 4,
        itemStyle: { color: COLOR_PALETTE[i % COLOR_PALETTE.length] },
      })),
    };
  }, [top8]);

  useEChart(containerRef, option, [option]);

  if (top8.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a4a6a', fontSize: 13 }}>
        暂无有效客流数据
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 300 }} />;
}
