import { useRef, useMemo } from 'react';
import { useEChart } from '../../hooks/useEChart';
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
        backgroundColor: 'rgba(10, 25, 60, 0.92)',
        borderColor: 'rgba(34, 211, 238, 0.35)',
        borderWidth: 1,
        borderRadius: 8,
        shadowColor: 'rgba(34, 211, 238, 0.15)',
        shadowBlur: 12,
        textStyle: { color: '#c8d6e5', fontSize: 12 },
        formatter: (params: unknown) => {
          const p = Array.isArray(params) ? params[0] : params;
          const d = p as { name: string; value: number };
          return `<span style="color:#22d3ee;font-weight:600">${d.name}</span><br/>日均客流：<b style="color:#22d3ee">${d.value.toFixed(1)}</b> 万人次`;
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
        axisLine: { lineStyle: { color: 'rgba(100,116,139,0.25)' } },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11 },
      },
      yAxis: {
        type: 'value' as const,
        splitLine: { lineStyle: { color: 'rgba(100,116,139,0.12)', type: 'dashed' as const } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11 },
      },
      series: [{
        type: 'line' as const,
        data: yearly.values,
        smooth: true,
        symbolSize: 6,
        lineStyle: { color: '#22d3ee', width: 2 },
        itemStyle: { color: '#22d3ee' },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(34,211,238,0.30)' },
              { offset: 1, color: 'rgba(34,211,238,0.01)' },
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
      className="city-trend-chart"
    />
  );
}
