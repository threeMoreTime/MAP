import { useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { useEChart } from '../../hooks/useEChart';
import { tooltipShadow, CHART_GRID, AXIS_LABEL_STYLE, SPLIT_LINE_STYLE, Y_CATEGORY_LABEL } from './chartUtils';
import type { MergedCity } from '../../hooks/useMetroData';

interface Props {
  data: MergedCity[];
  topN: number;
}

export default function MileageChart({ data, topN }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const sliced = useMemo(() => {
    const sorted = [...data]
      .filter((d) => d.operating_mileage_km > 0)
      .sort((a, b) => b.operating_mileage_km - a.operating_mileage_km);
    return topN > 0 ? sorted.slice(0, topN) : sorted;
  }, [data, topN]);

  const option = useMemo<echarts.EChartsOption>(() => {
    const cityNames = sliced.map((d) => d.city_cn).reverse();
    const vals = sliced.map((d) => d.operating_mileage_km).reverse();

    return {
      tooltip: {
        ...tooltipShadow(),
        formatter: (p: unknown) => {
          const params = p as { name: string; value: number };
          return `${params.name}<br/>运营里程: ${params.value.toFixed(0)} km`;
        },
      },
      grid: CHART_GRID,
      xAxis: { type: 'value', axisLabel: AXIS_LABEL_STYLE, splitLine: SPLIT_LINE_STYLE },
      yAxis: { type: 'category', data: cityNames, axisLabel: Y_CATEGORY_LABEL },
      series: [{
        type: 'bar',
        data: vals,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#2E7D32' },
            { offset: 1, color: '#66BB6A' },
          ]),
        },
        label: {
          show: true,
          position: 'right',
          color: '#ccc',
          fontSize: 11,
          formatter: (p: unknown) => {
            const params = p as { value: number };
            return params.value.toFixed(0);
          },
        },
      }],
    };
  }, [sliced]);

  useEChart(containerRef, option, [option]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 300 }} />;
}
