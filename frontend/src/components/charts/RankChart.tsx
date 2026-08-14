import { useRef, useMemo } from 'react';
import { echarts, type EChartsOption } from '../../lib/echarts';
import { useEChart } from '../../hooks/useEChart';
import { tooltipShadow, CHART_GRID, AXIS_LABEL_STYLE, SPLIT_LINE_STYLE, Y_CATEGORY_LABEL, METRIC_COLORS, PAPER_TOOLTIP, CHART_VERMILION } from './chartUtils';
import { getMetricValue, isMetricValid } from '../../hooks/useDashboardFilters';
import type { MergedCity } from '../../hooks/useMetroData';
import type { MetricKey } from '../../types/metro';
import { METRIC_LABELS } from '../../types/metro';

interface Props {
  data: MergedCity[];
  metric: MetricKey;
  topN: number;
}

export default function RankChart({ data, metric, topN }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const sliced = useMemo(() => {
    const filtered = data
      .filter((d) => isMetricValid(d, metric))
      .sort((a, b) => (getMetricValue(b, metric) ?? 0) - (getMetricValue(a, metric) ?? 0));
    return topN > 0 ? filtered.slice(0, topN) : filtered;
  }, [data, metric, topN]);

  const ml = METRIC_LABELS[metric];
  const colors = METRIC_COLORS[metric] ?? METRIC_COLORS.daily_ridership_wan;

  const option = useMemo<EChartsOption>(() => {
    const cityNames = sliced.map((d) => d.city_cn).reverse();
    const vals = sliced.map((d) => getMetricValue(d, metric)).reverse();

    return {
      tooltip: {
        ...tooltipShadow(),
        ...PAPER_TOOLTIP,
        formatter: (p: unknown) => {
          const raw = Array.isArray(p) ? p[0] : p;
          const params = raw as { name: string; value: number | null | undefined };
          return `${params.name}<br/>${ml.name}: ${params.value != null ? params.value.toFixed(ml.decimals) : '--'} ${ml.unit}`;
        },
      },
      grid: CHART_GRID,
      xAxis: { type: 'value', axisLabel: AXIS_LABEL_STYLE, splitLine: SPLIT_LINE_STYLE },
      yAxis: { type: 'category', data: cityNames, axisLabel: Y_CATEGORY_LABEL },
      series: [{
        type: 'bar',
        // 榜首（reverse 后最后一项）用朱砂实色，其余沿用指标墨阶渐变
        data: vals.map((v, i) => ({
          value: v,
          itemStyle: i === vals.length - 1 ? { color: CHART_VERMILION } : undefined,
        })),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: colors[0] },
            { offset: 1, color: colors[1] },
          ]),
        },
        label: {
          show: true,
          position: 'right',
          color: '#6e6656',
          fontSize: 11,
          formatter: (p: unknown) => {
            const params = p as { value: number | null | undefined };
            return params.value != null ? params.value.toFixed(ml.decimals) : '--';
          },
        },
      }],
    };
  }, [sliced, metric, ml, colors]);

  useEChart(containerRef, option, [option]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 300 }} />;
}
