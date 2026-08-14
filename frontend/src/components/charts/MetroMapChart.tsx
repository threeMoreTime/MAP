import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { echarts, type EChartsOption } from '../../lib/echarts';
import { CITY_COORDS } from '../../data/cityCoords';
import { getMetricValue, isMetricValid, formatMetricValue } from '../../hooks/useDashboardFilters';
import type { MergedCity } from '../../hooks/useMetroData';
import type { MetricKey } from '../../types/metro';
import { METRIC_LABELS } from '../../types/metro';
import { withBaseUrl } from '../../utils/path';
import { PAPER_TOOLTIP } from './chartUtils';

interface Props {
  data: MergedCity[];
  metric: MetricKey;
  selectedCity: string | null;
  onCitySelect: (city: string) => void;
  keyword?: string;
}

interface MapItemData {
  name: string;
  value: [number, number, number | null];
  city: string;
  rawData: MergedCity;
}

export default function MetroMapChart({ data, metric, onCitySelect, keyword }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const instanceRef = useRef<echarts.ECharts | null>(null);

  const ml = METRIC_LABELS[metric];

  const mapData = useMemo(() => {
    let base = data;
    if (keyword) {
      const kw = keyword.toLowerCase();
      base = base.filter((d) => d.city_cn.includes(kw) || d.city.toLowerCase().includes(kw));
    }
    const valid = base.filter((d) => CITY_COORDS[d.city] && isMetricValid(d, metric));

    const bubble: MapItemData[] = valid.map((d) => {
      const v = getMetricValue(d, metric);
      return { name: d.city_cn, value: [...CITY_COORDS[d.city], v] as [number, number, number | null], city: d.city, rawData: d };
    });

    const sorted = [...valid].sort((a, b) => (getMetricValue(b, metric) ?? 0) - (getMetricValue(a, metric) ?? 0));
    const top = sorted.slice(0, 10);
    const ripple: MapItemData[] = top.map((d) => {
      const v = getMetricValue(d, metric);
      return { name: d.city_cn, value: [...CITY_COORDS[d.city], v] as [number, number, number | null], city: d.city, rawData: d };
    });

    return { bubble, ripple };
  }, [data, metric, keyword]);

  const getMapOption = useCallback((): EChartsOption => {
    const maxVal = Math.max(...mapData.bubble.map((d) => d.value[2] ?? 0), 1);

    return {
      tooltip: {
        ...PAPER_TOOLTIP,
        trigger: 'item',
        formatter: (p: unknown) => {
          const params = p as { seriesType: string; data?: MapItemData };
          if ((params.seriesType === 'effectScatter' || params.seriesType === 'scatter') && params.data?.rawData) {
            const d = params.data.rawData;
            return (
              `<b style="font-size:14px">${d.city_cn}</b><br/>` +
              `${ml.name}: <b>${formatMetricValue(d, metric)}</b><br/>` +
              `运营里程: ${d.operating_mileage_km} km<br/>` +
              `站点数: ${d.operating_stations} 座<br/>` +
              `客流强度: ${d.ridership_intensity.toFixed(2)}`
            );
          }
          return (params as { name?: string }).name ?? '';
        },
      },
      geo: {
        map: 'china',
        roam: true,
        zoom: 1.2,
        center: [105, 36],
        label: { show: false },
        itemStyle: { areaColor: '#eae4d5', borderColor: '#c8bda3', borderWidth: 0.8 },
        emphasis: { itemStyle: { areaColor: '#dcd4c0' }, label: { show: false } },
      },
      series: [
        {
          name: ml.name,
          type: 'scatter',
          coordinateSystem: 'geo',
          data: mapData.bubble,
          symbolSize: (val: number[]) => Math.max(6, Math.sqrt((val[2] ?? 0) / maxVal * 900)),
          itemStyle: {
            color: (p: unknown) => {
              const params = p as { value: number[] };
              const ratio = (params.value[2] ?? 0) / maxVal;
              if (ratio > 0.7) return '#2b2620';
              if (ratio > 0.4) return '#4a443a';
              if (ratio > 0.2) return '#6b6354';
              if (ratio > 0.1) return '#8d846f';
              return '#aea48b';
            },
            shadowBlur: 6,
            shadowColor: 'rgba(33,29,22,0.25)',
          },
          label: { show: true, formatter: '{b}', position: 'right', fontSize: 10, color: '#453f33' },
        },
        {
          name: 'Top 涟漪',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: mapData.ripple,
          symbolSize: (val: number[]) => Math.max(10, Math.sqrt((val[2] ?? 0) / maxVal * 900)),
          rippleEffect: { brushType: 'stroke', scale: 4, period: 4 },
          itemStyle: {
            color: '#c03d2b',
          },
          label: { show: false },
        },
      ],
    };
  }, [mapData, metric, ml]);

  // Load GeoJSON
  useEffect(() => {
    let cancelled = false;

    async function loadMap() {
      try {
        // Try local first
        const localResp = await fetch(withBaseUrl('assets/china.json'));
        if (!localResp.ok) throw new Error('local miss');
        const geoJson = await localResp.json();
        if (cancelled) return;

        echarts.registerMap('china', geoJson);
        setMapState('ready');
      } catch {
        // Remote fallback
        try {
          const remoteResp = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json');
          if (!remoteResp.ok) throw new Error('remote miss');
          const geoJson = await remoteResp.json();
          if (cancelled) return;

          echarts.registerMap('china', geoJson);
          setMapState('ready');
        } catch {
          if (!cancelled) setMapState('fallback');
        }
      }
    }

    loadMap();
    return () => { cancelled = true; };
  }, []);

  // Apply option when map is ready or data changes
  useEffect(() => {
    if (mapState !== 'ready') return;
    const el = containerRef.current;
    if (!el) return;

    if (!instanceRef.current) {
      const existing = echarts.getInstanceByDom(el);
      instanceRef.current = existing || echarts.init(el);
    }

    instanceRef.current.setOption(getMapOption(), true);
  }, [mapState, getMapOption]);

  // Click handler
  useEffect(() => {
    if (mapState !== 'ready' || !instanceRef.current) return;
    const instance = instanceRef.current;

    const handler = (params: echarts.ECElementEvent) => {
      if (params.data && (params.data as MapItemData).city) {
        onCitySelect((params.data as MapItemData).city);
      }
    };

    instance.on('click', handler);
    return () => { instance.off('click', handler); };
  }, [mapState, onCitySelect]);

  // Resize
  useEffect(() => {
    if (mapState !== 'ready' || !instanceRef.current) return;
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => { instanceRef.current?.resize(); });
    ro.observe(el);
    const handleResize = () => { instanceRef.current?.resize(); };
    window.addEventListener('resize', handleResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [mapState]);

  // Dispose on unmount
  useEffect(() => {
    const el = containerRef.current;
    return () => {
      if (instanceRef.current && el) {
        instanceRef.current.dispose();
        instanceRef.current = null;
      }
    };
  }, []);

  const handleResetView = useCallback(() => {
    if (instanceRef.current) {
      instanceRef.current.setOption({
        geo: {
          zoom: 1.2,
          center: [105, 36],
        },
      });
    }
  }, []);

  if (mapState === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-ink-500">
        加载地图数据...
      </div>
    );
  }

  if (mapState === 'fallback') {
    return (
      <div className="h-full overflow-auto">
        <div className="py-3 text-center text-[13px] text-ink-500">
          地图数据加载失败，排行榜和城市详情仍可正常使用
        </div>
        <FallbackTable data={data} metric={metric} />
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[460px] w-full">
      <button
        onClick={handleResetView}
        title="还原地图视角"
        aria-label="还原地图视角"
        className="absolute right-2 top-2 z-10 cursor-pointer rounded-sm border border-paper-300 bg-paper-100 px-2.5 py-1 text-[11px] text-ink-700 shadow-card transition-colors duration-200 hover:bg-paper-200 focus-visible:outline-2 focus-visible:outline-vermilion-500"
      >
        ↻ 还原视角
      </button>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

function FallbackTable({ data, metric }: { data: MergedCity[]; metric: MetricKey }) {
  const ml = METRIC_LABELS[metric];
  const sorted = useMemo(() => {
    return [...data]
      .filter((d) => isMetricValid(d, metric))
      .sort((a, b) => (getMetricValue(b, metric) ?? 0) - (getMetricValue(a, metric) ?? 0));
  }, [data, metric]);

  return (
    <div className="max-h-[440px] overflow-y-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            {['城市', `${ml.name}(${ml.unit})`, '里程(km)', '站点'].map((h) => (
              <th
                key={h}
                className="sticky top-0 border-b border-paper-300 bg-paper-100 px-2 py-1.5 text-left font-medium text-ink-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((d) => (
            <tr key={d.city}>
              <td className="border-b border-[rgba(33,29,22,0.06)] px-2 py-1.5 text-ink-900">{d.city_cn}</td>
              <td className="border-b border-[rgba(33,29,22,0.06)] px-2 py-1.5 text-ink-700 tabular-nums">{formatMetricValue(d, metric)}</td>
              <td className="border-b border-[rgba(33,29,22,0.06)] px-2 py-1.5 text-right text-ink-700 tabular-nums">{d.operating_mileage_km}</td>
              <td className="border-b border-[rgba(33,29,22,0.06)] px-2 py-1.5 text-right text-ink-700 tabular-nums">{d.operating_stations}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
