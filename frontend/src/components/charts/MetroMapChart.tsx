import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import { useEChart } from '../../hooks/useEChart';
import { CITY_COORDS } from '../../data/cityCoords';
import { getMetricValue, isMetricValid, formatMetricValue } from '../../hooks/useDashboardFilters';
import type { MergedCity } from '../../hooks/useMetroData';
import type { MetricKey } from '../../types/metro';
import { METRIC_LABELS } from '../../types/metro';
import { withBaseUrl } from '../../utils/path';

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

export default function MetroMapChart({ data, metric, selectedCity, onCitySelect, keyword }: Props) {
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

  const getMapOption = useCallback((): echarts.EChartsOption => {
    const maxVal = Math.max(...mapData.bubble.map((d) => d.value[2] ?? 0), 1);

    return {
      tooltip: {
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
        itemStyle: { areaColor: '#0d2550', borderColor: '#1e5a8a', borderWidth: 0.8 },
        emphasis: { itemStyle: { areaColor: '#1a3a6a' }, label: { show: false } },
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
              if (ratio > 0.7) return '#ff5252';
              if (ratio > 0.4) return '#ff9800';
              if (ratio > 0.2) return '#ffd740';
              if (ratio > 0.1) return '#69f0ae';
              return '#40c4ff';
            },
            shadowBlur: 8,
            shadowColor: 'rgba(33,150,243,0.4)',
          },
          label: { show: true, formatter: '{b}', position: 'right', fontSize: 10, color: '#b0c4de' },
        },
        {
          name: 'Top 涟漪',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: mapData.ripple,
          symbolSize: (val: number[]) => Math.max(10, Math.sqrt((val[2] ?? 0) / maxVal * 900)),
          rippleEffect: { brushType: 'stroke', scale: 4, period: 4 },
          itemStyle: {
            color: (p: unknown) => {
              const params = p as { value: number[] };
              const ratio = (params.value[2] ?? 0) / maxVal;
              if (ratio > 0.8) return '#ff1744';
              if (ratio > 0.5) return '#ff9100';
              return '#ffea00';
            },
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
    return () => {
      if (instanceRef.current && containerRef.current) {
        instanceRef.current.dispose();
        instanceRef.current = null;
      }
    };
  }, []);

  if (mapState === 'loading') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a6a8a' }}>
        加载地图数据...
      </div>
    );
  }

  if (mapState === 'fallback') {
    return (
      <div style={{ height: '100%', overflow: 'auto' }}>
        <div style={{ color: '#90caf9', textAlign: 'center', padding: '12px 0', fontSize: 13 }}>
          地图数据加载失败，排行榜和城市详情仍可正常使用
        </div>
        <FallbackTable data={data} metric={metric} />
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 460 }} />;
}

function FallbackTable({ data, metric }: { data: MergedCity[]; metric: MetricKey }) {
  const ml = METRIC_LABELS[metric];
  const sorted = useMemo(() => {
    return [...data]
      .filter((d) => isMetricValid(d, metric))
      .sort((a, b) => (getMetricValue(b, metric) ?? 0) - (getMetricValue(a, metric) ?? 0));
  }, [data, metric]);

  return (
    <div style={{ maxHeight: 440, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ color: '#4a6a8a', textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid rgba(0,120,180,0.15)', position: 'sticky', top: 0, background: '#061028' }}>城市</th>
            <th style={{ color: '#4a6a8a', textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid rgba(0,120,180,0.15)', position: 'sticky', top: 0, background: '#061028' }}>{ml.name}({ml.unit})</th>
            <th style={{ color: '#4a6a8a', textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid rgba(0,120,180,0.15)', position: 'sticky', top: 0, background: '#061028' }}>里程(km)</th>
            <th style={{ color: '#4a6a8a', textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid rgba(0,120,180,0.15)', position: 'sticky', top: 0, background: '#061028' }}>站点</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((d) => (
            <tr key={d.city}>
              <td style={{ padding: '5px 8px', borderBottom: '1px solid rgba(0,120,180,0.08)' }}>{d.city_cn}</td>
              <td style={{ padding: '5px 8px', borderBottom: '1px solid rgba(0,120,180,0.08)' }}>{formatMetricValue(d, metric)}</td>
              <td style={{ padding: '5px 8px', borderBottom: '1px solid rgba(0,120,180,0.08)' }}>{d.operating_mileage_km}</td>
              <td style={{ padding: '5px 8px', borderBottom: '1px solid rgba(0,120,180,0.08)' }}>{d.operating_stations}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
