import { useRef, useMemo } from 'react';
import { useEChart } from '../../hooks/useEChart';
import { PAPER_TOOLTIP, CHART_VERMILION } from './chartUtils';
import type { YearlyAvgRidership } from '../../types/metro';

interface Props {
  yearly: YearlyAvgRidership | undefined;
}

export default function CityTrendAreaChart({ yearly }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const option = useMemo(() => {
    if (!yearly || !yearly.years.length) return null;

    return {
      tooltip: {
        trigger: 'axis' as const,
        ...PAPER_TOOLTIP,
        formatter: (params: unknown) => {
          const p = Array.isArray(params) ? params[0] : params;
          const d = p as { name: string; value: number | null | undefined };
          return `<span style="color:#a83622;font-weight:600">${d.name}</span><br/>日均客流：<b style="color:#a83622">${d.value != null ? d.value.toFixed(1) : '--'}</b> 万人次`;
        },
      },
      grid: {
        top: 30,
        right: 20,
        bottom: 30,
        left: 50,
        containLabel: false,
      },
      xAxis: {
        type: 'category' as const,
        data: yearly.years.map(String),
        axisLine: { lineStyle: { color: 'rgba(33,29,22,0.18)' } },
        axisTick: { show: false },
        axisLabel: { color: '#8f8672', fontSize: 11 },
      },
      yAxis: {
        type: 'value' as const,
        splitLine: { lineStyle: { color: 'rgba(33,29,22,0.08)', type: 'dashed' as const } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#8f8672', fontSize: 11 },
      },
      series: [{
        type: 'line' as const,
        data: yearly.values,
        smooth: true,
        symbolSize: 6,
        lineStyle: { color: CHART_VERMILION, width: 2 },
        itemStyle: { color: CHART_VERMILION },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(192,61,43,0.22)' },
              { offset: 1, color: 'rgba(192,61,43,0.01)' },
            ],
          },
        },
      }],
    };
  }, [yearly]);

  useEChart(containerRef, option, [yearly]);

  return (
    <div
      ref={containerRef}
      className="city-trend-chart h-full min-h-[300px] w-full"
    />
  );
}
