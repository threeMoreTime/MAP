import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { echarts, type EChartsCoreOption } from '../../lib/echarts';
import { withBaseUrl } from '../../utils/path';
import { OVERVIEW_POSE, cityFocusPose } from '../../lib/hero3d/camera';
import {
  INTRO_FINISH_MS,
  INTRO_LIGHT_UP_MS,
  INTRO_LINES_MS,
  INTRO_NODE_BATCHES_MS,
  INTRO_NODE_BATCH_SIZE,
  METRIC_LINES_PREPARE_MS,
  METRIC_LINES_REVEAL_MS,
  METRIC_NODES_MS,
} from '../../lib/hero3d/animation';
import {
  buildBaseOption,
  dimmedNodesOption,
  linesSeriesOption,
  nodesSeriesOption,
  withCameraNeutralizer,
} from '../../lib/hero3d/optionBuilders';
import type { HeroLineDatum, HeroNodeDatum, RankedCity } from '../../lib/hero3d/types';
import type { MergedCity } from '../../hooks/useMetroData';
import type { MetricKey } from '../../types/metro';
import MetroMapChart from '../charts/MetroMapChart';
import { useHeroMapEvents } from './useHeroMapEvents';

/**
 * 夜墨 3D 场景画布（geo3D + scatter3D + lines3D）。
 *
 * 职责：GL 生命周期（加载/回退/释放）、一次性 intro、数据/指标分拍应用、
 * Top 城市 pulse、autoRotate 开关、相机命令（imperative handle）。
 * 事件桥与拖拽判定在 useHeroMapEvents；option 构建在 lib/hero3d/optionBuilders。
 *
 * 相机纪律：
 * - 数据/样式更新只走 series merge + 相机中和载荷，不重置用户视角。
 * - 相机命令走独立 setOption（viewControl + animationDurationUpdate/cubicOut），
 *   由 echarts-gl 原生 animateTo 插值，不自写 RAF tween。
 */

export interface HeroMap3DHandle {
  focusCity(city: RankedCity, durationMs: number): void;
  resetView(durationMs: number): void;
}

/** pulse 目标城市（Top N，由 quality 档决定） */
export interface PulseCity {
  city: string;
  lng: number;
  lat: number;
  rank: number;
}

interface Props {
  data: MergedCity[];
  metric: MetricKey;
  selectedCity: string | null;
  nodes: HeroNodeDatum[];
  lines: HeroLineDatum[];
  autoRotate: boolean;
  flylineEffect: boolean;
  reducedMotion: boolean;
  dprCap: number | null;
  pulse: boolean;
  pulseCities: PulseCity[];
  pulseIntervalMs: number;
  /** URL 直达等场景跳过整套 intro */
  skipIntro: boolean;
  onCityHover: (city: string | null) => void;
  onCitySelect: (city: string) => void;
  onCameraDrag: () => void;
  onSceneReady: () => void;
  onIntroDone: () => void;
}

type Phase = 'loading' | 'ready' | 'fallback';

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

const HeroMap3D = forwardRef<HeroMap3DHandle, Props>(function HeroMap3D(
  {
    data,
    metric,
    selectedCity,
    nodes,
    lines,
    autoRotate,
    flylineEffect,
    reducedMotion,
    dprCap,
    pulse,
    pulseCities,
    pulseIntervalMs,
    skipIntro,
    onCityHover,
    onCitySelect,
    onCameraDrag,
    onSceneReady,
    onIntroDone,
  },
  ref,
) {
  const [phase, setPhase] = useState<Phase>(() => (webglAvailable() ? 'loading' : 'fallback'));
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const hoverRef = useRef<{ city: string; dataIndex: number; x: number; y: number } | null>(null);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const revalidateTimerRef = useRef<number | null>(null);

  // 最新 props/回调引用（事件与定时器绑定一次，读取保持最新值）
  const handlersRef = useRef({ onCityHover, onCitySelect, onCameraDrag, onIntroDone });
  handlersRef.current = { onCityHover, onCitySelect, onCameraDrag, onIntroDone };
  const propsRef = useRef({ nodes, lines, flylineEffect });
  propsRef.current = { nodes, lines, flylineEffect };
  const pulseCitiesRef = useRef(pulseCities);
  pulseCitiesRef.current = pulseCities;

  // intro / 指标过渡进行中：pulse 暂停，避免互相踩
  const introActiveRef = useRef(false);
  const introPlayedRef = useRef(false);
  const metricTransitionRef = useRef(false);
  const introTimersRef = useRef<number[]>([]);

  const goToFallback = useCallback(() => {
    instanceRef.current?.dispose();
    instanceRef.current = null;
    setPhase('fallback');
  }, []);

  const applySeriesPayload = useCallback(
    (payload: object[]) => {
      const inst = instanceRef.current;
      if (!inst) return;
      try {
        inst.setOption(withCameraNeutralizer(payload));
      } catch {
        goToFallback();
      }
    },
    [goToFallback],
  );

  const applyScene = useCallback(
    (applyNodes: HeroNodeDatum[], applyLines: HeroLineDatum[], effect: boolean) => {
      applySeriesPayload([linesSeriesOption(applyLines, effect), nodesSeriesOption(applyNodes)]);
    },
    [applySeriesPayload],
  );

  /** intro 收尾：立即呈现最终状态（主动完成或被用户交互打断） */
  const finishIntro = useCallback(() => {
    introTimersRef.current.forEach((t) => clearTimeout(t));
    introTimersRef.current = [];
    introActiveRef.current = false;
    const current = propsRef.current;
    applyScene(current.nodes, current.lines, current.flylineEffect);
    handlersRef.current.onIntroDone();
  }, [applyScene]);

  // 相机命令（imperative handle）：viewControl + 原生 animateTo
  useImperativeHandle(
    ref,
    () => ({
      focusCity(city: RankedCity, durationMs: number) {
        const inst = instanceRef.current;
        if (!inst) return;
        const geo3D = (inst as unknown as {
          getModel: () => { getComponent: (t: string) => unknown };
        }).getModel().getComponent('geo3D') as
          | { coordinateSystem?: { dataToPoint?: (d: number[]) => number[] } }
          | undefined;
        const project = (lngLat: [number, number]) =>
          geo3D?.coordinateSystem?.dataToPoint?.(lngLat) ?? [0, 0, 0];
        try {
          inst.setOption({
            geo3D: {
              viewControl: {
                ...cityFocusPose(project, city),
                animation: true,
                animationDurationUpdate: durationMs,
                animationEasingUpdate: 'cubicOut',
              },
            },
          });
        } catch {
          goToFallback();
        }
      },
      resetView(durationMs: number) {
        const inst = instanceRef.current;
        if (!inst) return;
        try {
          inst.setOption({
            geo3D: {
              viewControl: {
                ...OVERVIEW_POSE,
                animation: true,
                animationDurationUpdate: durationMs,
                animationEasingUpdate: 'cubicOut',
              },
            },
          });
        } catch {
          goToFallback();
        }
      },
    }),
    [goToFallback],
  );

  // GL 扩展与地图 GeoJSON 加载（失败一律回退 2D，不白屏）
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
    return () => {
      cancelled = true;
    };
  }, [phase]);

  // 建实例 + 基础 option + 一次性 intro（相机异常时回退 2D）
  useEffect(() => {
    if (phase !== 'ready') return;
    const el = containerRef.current;
    if (!el) return;

    try {
      if (!instanceRef.current) {
        const existing = echarts.getInstanceByDom(el);
        instanceRef.current =
          existing ||
          echarts.init(el, undefined, {
            devicePixelRatio: dprCap
              ? Math.min(window.devicePixelRatio ?? 1, dprCap)
              : undefined,
          });
      }
      instanceRef.current.setOption(buildBaseOption(autoRotate) satisfies EChartsCoreOption);
    } catch {
      goToFallback();
      return;
    }

    let introInterrupt: (() => void) | null = null;
    if (!reducedMotion && !skipIntro && !introPlayedRef.current) {
      introPlayedRef.current = true;
      introActiveRef.current = true;
      const timers = introTimersRef.current;
      try {
        // 0ms：暗场 + 空场景（夜墨底先行）
        instanceRef.current?.setOption({
          geo3D: { light: { main: { intensity: 0.3 }, ambient: { intensity: 0.2 } } },
        });
        applyScene([], [], false);
      } catch {
        goToFallback();
        return;
      }
      // 灯光显影（light intensity 是契约允许的动画通道）
      timers.push(
        window.setTimeout(() => {
          instanceRef.current?.setOption({
            geo3D: { light: { main: { intensity: 1.25 }, ambient: { intensity: 0.45 } } },
          });
        }, INTRO_LIGHT_UP_MS),
      );
      // 城市节点分批点亮（stagger）
      INTRO_NODE_BATCHES_MS.forEach((ms, i) => {
        timers.push(
          window.setTimeout(() => {
            applySeriesPayload([
              nodesSeriesOption(
                propsRef.current.nodes.slice(0, INTRO_NODE_BATCH_SIZE * (i + 1)),
              ),
            ]);
          }, ms),
        );
      });
      // Top 城市飞线建立
      timers.push(
        window.setTimeout(() => {
          const current = propsRef.current;
          applySeriesPayload([
            linesSeriesOption(current.lines, current.flylineEffect),
          ]);
        }, INTRO_LINES_MS),
      );
      // 收尾（完整状态 + overlay 阶梯开始）
      timers.push(window.setTimeout(finishIntro, INTRO_FINISH_MS));
      // 用户交互立即打断 intro，允许马上操作
      introInterrupt = () => finishIntro();
      el.addEventListener('pointerdown', introInterrupt);
    }

    onSceneReady();

    const canvas = el.querySelector('canvas');
    const onContextLost = (e: Event) => {
      e.preventDefault();
      goToFallback();
    };
    canvas?.addEventListener('webglcontextlost', onContextLost);
    return () => {
      if (introInterrupt) el.removeEventListener('pointerdown', introInterrupt);
      canvas?.removeEventListener('webglcontextlost', onContextLost);
    };
    // 基础 option 与 intro 只在 ready 时执行一次；autoRotate/数据由专门 effect 处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // 事件桥 + 拖拽判定 + hover 重验证 + 拾取预热。
  // 必须声明在 init effect 之后：phase 变 ready 的那次 commit 中，
  // init 先建实例，这里才能拿到 instanceRef.current 完成绑定。
  useHeroMapEvents(
    { instanceRef, containerRef, handlersRef, hoverRef, lastMouseRef, revalidateTimerRef },
    phase,
  );

  // 数据/视觉更新：仅 series merge（id 定位），不带相机字段。
  // 指标切换时分拍过渡：旧飞线淡出+节点降弱 → 节点重排 → 新飞线渐进显影；
  // 其余变化（hover/选中/开关）即时应用；reduced motion 直接呈现最终状态。
  const prevMetricRef = useRef(metric);
  const prevNodesRef = useRef(nodes);
  const appliedOnceRef = useRef(false);
  useEffect(() => {
    if (phase !== 'ready' || !instanceRef.current) return;
    // intro 进行中不应用：收尾时会以最新 props 全量呈现
    if (introActiveRef.current) return;

    const timers: number[] = [];
    const schedule = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, ms));
    };

    const metricChanged = appliedOnceRef.current && prevMetricRef.current !== metric;
    if (!metricChanged || reducedMotion) {
      applyScene(nodes, lines, flylineEffect);
    } else {
      metricTransitionRef.current = true;
      // 旧飞线淡出、旧节点视觉降弱
      applySeriesPayload([
        linesSeriesOption([], false),
        dimmedNodesOption(prevNodesRef.current),
      ]);
      // 新指标节点（尺寸重排）
      schedule(METRIC_NODES_MS, () => applySeriesPayload([nodesSeriesOption(nodes)]));
      // 新飞线以全透明数据就位
      schedule(METRIC_LINES_PREPARE_MS, () =>
        applySeriesPayload([linesSeriesOption(lines, false)]),
      );
      // 渐进显影至目标状态
      schedule(METRIC_LINES_REVEAL_MS, () => {
        applyScene(nodes, lines, flylineEffect);
        metricTransitionRef.current = false;
      });
    }

    prevNodesRef.current = nodes;
    prevMetricRef.current = metric;
    appliedOnceRef.current = true;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      metricTransitionRef.current = false;
    };
  }, [phase, nodes, lines, flylineEffect, metric, reducedMotion, applyScene, applySeriesPayload]);

  // Top 城市错峰呼吸：低频 setOption 调制 symbolSize/opacity（幅度 ≤10%），
  // 相位按 rank 错开；intro / 指标过渡 / 不可见 / reduced motion 时暂停。
  useEffect(() => {
    if (phase !== 'ready' || !pulse || pulseIntervalMs <= 0) return;
    const id = window.setInterval(() => {
      if (introActiveRef.current || metricTransitionRef.current) return;
      const inst = instanceRef.current;
      if (!inst) return;
      const targets = new Map(pulseCitiesRef.current.map((c) => [c.city, c.rank]));
      if (targets.size === 0) return;
      const t = Date.now() / 1000;
      const modulated = propsRef.current.nodes.map((n) => {
        const rank = targets.get(n.city);
        if (rank == null) return n;
        const wave = 0.5 + 0.5 * Math.sin(t * 1.7 + rank * 1.9);
        return {
          ...n,
          symbolSize: Math.round(n.symbolSize * (1 + 0.1 * wave) * 10) / 10,
          itemStyle: {
            ...n.itemStyle,
            opacity: Math.min(0.95, n.itemStyle.opacity + 0.05 * wave),
          },
        };
      });
      applySeriesPayload([nodesSeriesOption(modulated)]);
    }, pulseIntervalMs);
    return () => clearInterval(id);
  }, [phase, pulse, pulseIntervalMs, applySeriesPayload]);

  // autoRotate 开关（animation:false 走直设路径，不打断进行中的相机动画）
  useEffect(() => {
    const inst = instanceRef.current;
    if (phase !== 'ready' || !inst) return;
    try {
      inst.setOption({
        geo3D: { viewControl: { autoRotate, animation: false, animationDurationUpdate: 0 } },
      });
    } catch {
      /* 旋转开关失败不致命 */
    }
  }, [phase, autoRotate]);

  // 尺寸自适应
  useEffect(() => {
    const el = containerRef.current;
    if (phase !== 'ready' || !el) return;
    const ro = new ResizeObserver(() => instanceRef.current?.resize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [phase]);

  // 卸载释放
  useEffect(() => {
    return () => {
      introTimersRef.current.forEach((t) => clearTimeout(t));
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

  if (phase === 'loading') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0b1016]">
        <div className="loading-spinner size-10 rounded-full border-[3px] border-[#2b3a4e] border-t-[#d0553f] motion-safe:animate-[spin_1s_linear_infinite]" />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
});

export default HeroMap3D;
