import { useEffect, useMemo, useRef, useState } from 'react';
import { echarts, type EChartsCoreOption } from '../../lib/echarts';
import { CITY_COORDS } from '../../data/cityCoords';
import { getMetricValue, isMetricValid } from '../../hooks/useDashboardFilters';
import { withBaseUrl } from '../../utils/path';
import type { MergedCity } from '../../hooks/useMetroData';
import type { MetricKey } from '../../types/metro';
import MetroMapChart from './MetroMapChart';

interface Props {
  data: MergedCity[];
  metric: MetricKey;
  selectedCity: string | null;
  onCitySelect: (city: string) => void;
}

/** 夜墨色板（tokens.css --night-*，ECharts 需具体色值） */
const NIGHT = {
  bg: 'transparent',
  terrain: '#16202e',
  terrainEdge: '#2b3a4e',
  terrainEmphasis: '#1f2d3f',
  text: '#e8e4d8',
  textDim: '#8a94a3',
  accent: '#d0553f',
  node: '#cfd8e3',
  grid: 'rgba(232,228,216,0.06)',
};

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

interface NodeDatum {
  name: string;
  city: string;
  value: [number, number, number];
  itemStyle?: { color: string };
  label?: { show?: boolean };
}

interface LineDatum {
  coords: [[number, number], [number, number]];
  value: number;
}

/**
 * 全屏夜墨 3D 地形图（geo3D + scatter3D + lines3D）。
 * echarts-gl 以动态 import 懒加载（独立 chunk，不进首屏）；
 * WebGL 不可用或资源加载失败时回退到 2D 纸墨地图。
 * 飞线为视觉示意（榜首城市 → 指标前 9 名），不代表实际客流流向。
 */
export default function HeroMap3D({ data, metric, selectedCity, onCitySelect }: Props) {
  // WebGL 能力在初始化时判定（lazy initializer，无副作用丢弃）
  const [phase, setPhase] = useState<'loading' | 'ready' | 'fallback'>(() =>
    webglAvailable() ? 'loading' : 'fallback',
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  // 加载 GL 扩展与地图 GeoJSON
  useEffect(() => {
    if (phase !== 'loading') return;
    let cancelled = false;
    (async () => {
      try {
        await import('echarts-gl');
        const resp = await fetch(withBaseUrl('assets/china.json'));
        if (!resp.ok) throw new Error(`china.json HTTP ${resp.status}`);
        const geoJson = await resp.json();
        if (cancelled) return;
        echarts.registerMap('china', geoJson);
        setPhase('ready');
      } catch {
        if (!cancelled) setPhase('fallback');
      }
    })();
    return () => { cancelled = true; };
  }, [phase]);

  const option = useMemo<EChartsCoreOption | null>(() => {
    if (phase !== 'ready') return null;

    const valid = data.filter((d) => CITY_COORDS[d.city] && isMetricValid(d, metric));
    const sorted = [...valid].sort(
      (a, b) => (getMetricValue(b, metric) ?? 0) - (getMetricValue(a, metric) ?? 0),
    );
    const maxVal = Math.max(...sorted.map((d) => getMetricValue(d, metric) ?? 0), 1);
    const hub = sorted[0];
    const labeledCities = new Set(sorted.slice(0, 8).map((d) => d.city));

    const nodes: NodeDatum[] = sorted.map((d) => {
      const isSelected = selectedCity === d.city;
      return {
        name: d.city_cn,
        city: d.city,
        value: [CITY_COORDS[d.city][0], CITY_COORDS[d.city][1], getMetricValue(d, metric) ?? 0],
        itemStyle: { color: isSelected ? NIGHT.accent : NIGHT.node },
        label: { show: isSelected || labeledCities.has(d.city) },
      };
    });

    const lines: LineDatum[] = hub
      ? sorted.slice(1, 10).map((d) => ({
          coords: [
            [CITY_COORDS[hub.city][0], CITY_COORDS[hub.city][1]],
            [CITY_COORDS[d.city][0], CITY_COORDS[d.city][1]],
          ],
          value: getMetricValue(d, metric) ?? 0,
        }))
      : [];

    return {
      backgroundColor: NIGHT.bg,
      geo3D: {
        map: 'china',
        roam: true,
        boxWidth: 100,
        boxHeight: 8,
        regionHeight: 2,
        shading: 'lambert',
        itemStyle: {
          color: NIGHT.terrain,
          borderColor: NIGHT.terrainEdge,
          borderWidth: 0.6,
        },
        emphasis: { itemStyle: { color: NIGHT.terrainEmphasis } },
        light: {
          main: { intensity: 1.25, alpha: 55, beta: 20, shadow: false },
          ambient: { intensity: 0.45 },
        },
        viewControl: {
          autoRotate: true,
          autoRotateSpeed: 0.55,
          distance: 118,
          alpha: 38,
          beta: 12,
          minDistance: 55,
          maxDistance: 260,
          panSensitivity: 0,
        },
        postEffect: { enable: false },
      },
      series: [
        {
          type: 'lines3D',
          coordinateSystem: 'geo3D',
          effect: {
            show: true,
            trailWidth: 1.6,
            trailLength: 0.4,
            trailColor: NIGHT.accent,
            trailOpacity: 0.9,
            constantSpeed: 22,
          },
          lineStyle: { color: NIGHT.accent, opacity: 0.16, width: 1 },
          data: lines,
          silent: true,
        },
        {
          type: 'scatter3D',
          coordinateSystem: 'geo3D',
          data: nodes,
          symbolSize: (val: number[]) => Math.max(4, Math.sqrt((val[2] ?? 0) / maxVal) * 16),
          itemStyle: { opacity: 0.95 },
          label: {
            show: false,
            formatter: '{b}',
            position: 'right',
            distance: 3,
            textStyle: { color: NIGHT.text, fontSize: 11, backgroundColor: 'rgba(11,16,22,0.55)', padding: [1, 3] },
          },
        },
      ],
    } satisfies EChartsCoreOption;
  }, [phase, data, metric, selectedCity]);

  // 建实例 / 应用 option（GL 上下文异常时回退 2D）
  useEffect(() => {
    if (phase !== 'ready' || !option) return;
    const el = containerRef.current;
    if (!el) return;

    try {
      if (!instanceRef.current) {
        const existing = echarts.getInstanceByDom(el);
        instanceRef.current = existing || echarts.init(el);
      }
      // merge 模式：数据/选中态变化不重置用户视角
      instanceRef.current.setOption(option);
    } catch {
      instanceRef.current?.dispose();
      instanceRef.current = null;
      // 错误处理路径：GL 上下文创建失败时同步转入 2D 回退，避免白屏
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase('fallback');
    }
  }, [phase, option]);

  // 点击选中城市（回调可能随父组件渲染更新，独立绑定保持最新闭包）
  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst || phase !== 'ready') return;
    const handler = (params: unknown) => {
      const p = params as { data?: { city?: string } };
      if (p.data?.city) onCitySelect(p.data.city);
    };
    inst.on('click', handler);
    return () => { inst.off('click', handler); };
  }, [phase, onCitySelect]);

  // 尺寸自适应
  useEffect(() => {
    const el = containerRef.current;
    if (!el || phase !== 'ready') return;
    const ro = new ResizeObserver(() => instanceRef.current?.resize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [phase]);

  // 卸载释放
  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  if (phase === 'fallback') {
    return (
      <div className="h-full w-full bg-paper-50">
        <MetroMapChart
          data={data}
          metric={metric}
          selectedCity={selectedCity}
          onCitySelect={onCitySelect}
        />
      </div>
    );
  }

  if (phase === 'loading' || !option) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0b1016]">
        <div className="loading-spinner size-10 rounded-full border-[3px] border-[#2b3a4e] border-t-[#d0553f] motion-safe:animate-[spin_1s_linear_infinite]" />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
