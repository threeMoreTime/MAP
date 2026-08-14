import { useRef, useState } from 'react';
import { useEChart } from '../../hooks/useEChart';
import { COLOR_PALETTE, AXIS_LABEL_STYLE, SPLIT_LINE_STYLE, PAPER_TOOLTIP } from '../charts/chartUtils';
import type { ComparableCity } from '../../types/metro';

interface Props {
  cities: ComparableCity[];
}

type MetricKey = 'dailyRidershipWan' | 'operatingMileageKm' | 'operatingStations' | 'operatingLines' | 'ridershipIntensity' | 'peakRidershipWan';

const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: 'dailyRidershipWan', label: '日客流', unit: '万人次' },
  { key: 'operatingMileageKm', label: '运营里程', unit: 'km' },
  { key: 'operatingStations', label: '运营站点', unit: '座' },
  { key: 'operatingLines', label: '运营线路', unit: '条' },
  { key: 'ridershipIntensity', label: '客流强度', unit: '' },
  { key: 'peakRidershipWan', label: '历史峰值客流', unit: '万人次' },
];

function BarChart({ cities, metric }: { cities: ComparableCity[]; metric: typeof METRICS[number] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const valid = cities
    .map(c => ({ name: c.city_cn, value: c[metric.key] }))
    .filter(d => d.value !== null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const excluded = cities.length - valid.length;

  const option = valid.length === 0 ? null : {
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      ...PAPER_TOOLTIP,
      formatter: (params: unknown) => {
        const raw = Array.isArray(params) ? params[0] : params;
        const p = raw as { name: string; value: string | number };
        return `${p.name}<br/>${metric.label}：<strong>${p.value}</strong> ${metric.unit}`;
      },
    },
    grid: { left: '3%', right: '12%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: {
      type: 'value' as const,
      axisLabel: { ...AXIS_LABEL_STYLE, fontSize: 11 },
      splitLine: SPLIT_LINE_STYLE,
    },
    yAxis: {
      type: 'category' as const,
      data: valid.map(d => d.name).reverse(),
      axisLabel: { ...AXIS_LABEL_STYLE, fontSize: 12 },
      axisLine: { lineStyle: { color: 'rgba(33,29,22,0.18)' } },
    },
    series: [{
      type: 'bar' as const,
      data: valid.map((d, i) => ({
        value: d.value,
        itemStyle: { color: COLOR_PALETTE[i % COLOR_PALETTE.length], borderRadius: [0, 4, 4, 0] },
      })).reverse(),
      barWidth: '50%',
    }],
  };

  useEChart(containerRef, option, [valid.map(d => `${d.name}:${d.value}`).join(','), metric.key]);

  return (
    <div>
      <div ref={containerRef} style={{ width: '100%', height: Math.max(160, valid.length * 48 + 40) }} />
      {valid.length === 0 && (
        <div className="py-6 text-center text-[13px] text-ink-500">
          当前所选城市均无该指标数据
        </div>
      )}
      {excluded > 0 && valid.length > 0 && (
        <div className="mt-1.5 text-center text-[11px] text-ink-400">
          部分指标缺失，已从图表中排除（{excluded} 个城市无数据）
        </div>
      )}
    </div>
  );
}

function RadarChart({ cities }: { cities: ComparableCity[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const dimensions = [
    { key: 'dailyRidershipWan' as const, label: '日客流' },
    { key: 'operatingMileageKm' as const, label: '运营里程' },
    { key: 'operatingStations' as const, label: '运营站点' },
    { key: 'operatingLines' as const, label: '运营线路' },
    { key: 'ridershipIntensity' as const, label: '客流强度' },
  ];

  const validDims = dimensions.filter(d =>
    cities.every(c => c[d.key] !== null),
  );

  const maxValues: Record<string, number> = {};
  for (const d of validDims) {
    maxValues[d.key] = Math.max(...cities.map(c => c[d.key] ?? 0));
  }

  const option = validDims.length < 3 ? null : {
    tooltip: {},
    radar: {
      indicator: validDims.map(d => ({ name: d.label, max: maxValues[d.key] })),
      axisName: { color: '#8f8672', fontSize: 11 },
      splitArea: { areaStyle: { color: ['rgba(33,29,22,0.015)', 'rgba(33,29,22,0.035)'] } },
      splitLine: { lineStyle: { color: 'rgba(33,29,22,0.12)' } },
      axisLine: { lineStyle: { color: 'rgba(33,29,22,0.15)' } },
    },
    series: [{
      type: 'radar' as const,
      data: cities.map((c, i) => ({
        name: c.city_cn,
        value: validDims.map(d => c[d.key] ?? 0),
        lineStyle: { color: COLOR_PALETTE[i % COLOR_PALETTE.length], width: 2 },
        areaStyle: { color: COLOR_PALETTE[i % COLOR_PALETTE.length], opacity: 0.08 },
        itemStyle: { color: COLOR_PALETTE[i % COLOR_PALETTE.length] },
      })),
    }],
  };

  useEChart(containerRef, option, [cities.map(c => c.city).join(','), validDims.map(d => d.key).join(',')]);

  if (validDims.length < 3) return null;

  return <div ref={containerRef} style={{ width: '100%', height: 340 }} />;
}

function TrendChart({ cities }: { cities: ComparableCity[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const citiesWithTrend = cities.filter(c => c.yearlyYears.length > 0);

  const allYears = [...new Set(citiesWithTrend.flatMap(c => c.yearlyYears))].sort((a, b) => a - b);

  const option = citiesWithTrend.length < 2 ? null : {
    tooltip: { trigger: 'axis' as const, ...PAPER_TOOLTIP },
    legend: {
      data: citiesWithTrend.map(c => c.city_cn),
      textStyle: { color: '#453f33', fontSize: 11 },
      inactiveColor: '#ab9f87',
      bottom: 0,
    },
    grid: { left: '3%', right: '4%', bottom: '14%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: allYears.map(String),
      axisLabel: { ...AXIS_LABEL_STYLE, fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(33,29,22,0.18)' } },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: { ...AXIS_LABEL_STYLE, fontSize: 11 },
      splitLine: SPLIT_LINE_STYLE,
    },
    series: citiesWithTrend.map((c, i) => ({
      name: c.city_cn,
      type: 'line' as const,
      data: allYears.map(y => {
        const idx = c.yearlyYears.indexOf(y);
        return idx >= 0 ? c.yearlyValues[idx] : null;
      }),
      lineStyle: { color: COLOR_PALETTE[i % COLOR_PALETTE.length], width: 2 },
      itemStyle: { color: COLOR_PALETTE[i % COLOR_PALETTE.length] },
      connectNulls: false,
    })),
  };

  useEChart(containerRef, option, [citiesWithTrend.map(c => c.city).join(','), allYears.join(',')]);

  if (citiesWithTrend.length < 2) return null;

  return <div ref={containerRef} style={{ width: '100%', height: 300 }} />;
}

export default function CompareCharts({ cities }: Props) {
  const [activeMetric, setActiveMetric] = useState<number>(0);

  return (
    <div className="flex flex-col gap-5">
      {/* Bar chart with metric switch */}
      <section className="rounded-lg bg-paper-100 p-5 shadow-card">
        <div className="mb-3 font-serif text-[15px] font-semibold text-ink-900">
          指标对比
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {METRICS.map((m, i) => (
            <button
              key={m.key}
              onClick={() => setActiveMetric(i)}
              className={`cursor-pointer rounded-full px-3 py-1 text-[12px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-vermilion-500 ${
                activeMetric === i
                  ? 'bg-vermilion-500 font-semibold text-paper-50'
                  : 'border border-paper-300 bg-paper-50 text-ink-500 hover:text-ink-900'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <BarChart cities={cities} metric={METRICS[activeMetric]} />
      </section>

      {/* Radar chart */}
      <section className="rounded-lg bg-paper-100 p-5 shadow-card">
        <div className="mb-3 font-serif text-[15px] font-semibold text-ink-900">
          多维归一化对比
        </div>
        <RadarChart cities={cities} />
        {cities.some(c => c.dailyRidershipWan === null || c.operatingMileageKm === null) && (
          <div className="mt-2 text-center text-[11px] text-ink-400">
            仅展示所有已选城市均具备有效值的维度
          </div>
        )}
      </section>

      {/* Trend chart */}
      <section className="rounded-lg bg-paper-100 p-5 shadow-card">
        <div className="mb-3 font-serif text-[15px] font-semibold text-ink-900">
          年度日均客流趋势对比
        </div>
        <TrendChart cities={cities} />
        {cities.filter(c => c.yearlyYears.length > 0).length < 2 && (
          <div className="py-6 text-center text-[13px] text-ink-500">
            需至少 2 个城市有年度趋势数据时展示
          </div>
        )}
      </section>
    </div>
  );
}
