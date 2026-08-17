import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { echarts, type EChartsCoreOption } from '../../lib/echarts';
import { withBaseUrl } from '../../utils/path';
import { NIGHT } from '../../lib/hero3d/palette';
import { AUTOROTATE, OVERVIEW_POSE, cityFocusPose } from '../../lib/hero3d/camera';
import type { HeroLineDatum, HeroNodeDatum, RankedCity } from '../../lib/hero3d/types';
import type { MergedCity } from '../../hooks/useMetroData';
import type { MetricKey } from '../../types/metro';
import MetroMapChart from '../charts/MetroMapChart';

/**
 * 夜墨 3D 场景画布（geo3D + scatter3D + lines3D）。
 *
 * 职责边界：只管 WebGL 世界（GL 生命周期 / option 应用 / 事件桥 / 相机命令 /
 * 一次性 intro / Top 城市 pulse / 2D 回退），场景状态机与 UI 在 DashboardHero3D 层。
 *
 * 相机纪律：
 * - 数据/样式更新只走 series merge（id 定位），不带 viewControl 相机字段，
 *   不重置用户视角（用户视角由 echarts-gl 的 geo3DChangeCamera 回写 model 保持）。
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

/** geo3D 组件的内部坐标系逃逸口（echarts-gl 无官方类型，收敛在此处） */
interface Geo3DComponentLike {
  coordinateSystem?: { dataToPoint?: (data: number[]) => number[] };
}
/** ECharts#getModel 为 private 类型，但 echarts-gl 相机/坐标系只能经此抵达，局部收敛 */
type InstanceWithModel = {
  getModel: () => { getComponent: (mainType: string) => unknown };
};

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

/** 判定拖拽的位移阈值（px）：小于此视为点击，不挂起旋转 */
const DRAG_THRESHOLD = 6;
/** hover 命中半径（px）：鼠标远离节点屏幕位置即视为离开 */
const HOVER_LEAVE_RADIUS = 30;

/** intro 时间线（ms）：灯光显影 → 节点分批点亮 → 飞线 → 收尾 */
const INTRO_LIGHT_UP_MS = 140;
const INTRO_NODE_BATCHES = [380, 490, 600, 710, 820];
const INTRO_NODE_BATCH_SIZE = 12;
const INTRO_LINES_MS = 1080;
const INTRO_FINISH_MS = 1280;

function linesSeriesOption(lines: HeroLineDatum[], effect: boolean) {
  return {
    id: 'hero-lines',
    effect: {
      show: effect,
      trailWidth: 1.6,
      trailLength: 0.4,
      trailColor: NIGHT.accent,
      trailOpacity: 0.9,
      constantSpeed: 22,
    },
    lineStyle: { color: NIGHT.accent, opacity: effect ? 0.16 : 0, width: 1 },
    data: lines,
  };
}

function nodesSeriesOption(nodes: HeroNodeDatum[]) {
  return { id: 'hero-nodes', data: nodes };
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
  const [phase, setPhase] = useState<'loading' | 'ready' | 'fallback'>(() =>
    webglAvailable() ? 'loading' : 'fallback',
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const hoverRef = useRef<{ city: string; x: number; y: number } | null>(null);

  // 最新 props/回调引用（事件与定时器绑定一次，读取保持最新值）
  const handlersRef = useRef({ onCityHover, onCitySelect, onCameraDrag, onIntroDone });
  handlersRef.current = { onCityHover, onCitySelect, onCameraDrag, onIntroDone };
  const propsRef = useRef({ nodes, lines, flylineEffect });
  propsRef.current = { nodes, lines, flylineEffect };
  const pulseCitiesRef = useRef(pulseCities);
  pulseCitiesRef.current = pulseCities;

  // intro / 指标过渡进行中：pump 类动画暂停，避免互相踩
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
        inst.setOption({ series: payload });
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

  useImperativeHandle(
    ref,
    () => ({
      focusCity(city: RankedCity, durationMs: number) {
        const inst = instanceRef.current;
        if (!inst) return;
        const geo3D = (inst as unknown as InstanceWithModel)
          .getModel()
          .getComponent('geo3D') as Geo3DComponentLike | undefined;
        const project = (lngLat: [number, number]) =>
          geo3D?.coordinateSystem?.dataToPoint?.(lngLat) ?? [0, 0, 0];
        const pose = cityFocusPose(project, city);
        try {
          inst.setOption({
            geo3D: {
              viewControl: {
                ...pose,
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
      instanceRef.current?.setOption(buildBaseOption(autoRotate) satisfies EChartsCoreOption);
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
      // 140ms：灯光显影（light intensity 是契约允许的动画通道）
      timers.push(
        window.setTimeout(() => {
          instanceRef.current?.setOption({
            geo3D: { light: { main: { intensity: 1.25 }, ambient: { intensity: 0.45 } } },
          });
        }, INTRO_LIGHT_UP_MS),
      );
      // 380ms+：城市节点分批点亮（stagger）
      INTRO_NODE_BATCHES.forEach((ms, i) => {
        timers.push(
          window.setTimeout(() => {
            applySeriesPayload([
              nodesSeriesOption(propsRef.current.nodes.slice(0, INTRO_NODE_BATCH_SIZE * (i + 1))),
            ]);
          }, ms),
        );
      });
      // 1080ms：Top 城市飞线建立
      timers.push(
        window.setTimeout(() => {
          applySeriesPayload([
            linesSeriesOption(propsRef.current.lines, propsRef.current.flylineEffect),
          ]);
        }, INTRO_LINES_MS),
      );
      // 1280ms：收尾（完整状态 + overlay 阶梯开始）
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

  // 数据/视觉更新：仅 series merge（id 定位），不带相机字段。
  // 指标切换时分拍过渡（约 800ms）：旧飞线淡出+节点降弱 → 节点重排 → 新飞线渐进显影；
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
      // 0ms：旧飞线淡出、旧节点视觉降弱
      applySeriesPayload([
        linesSeriesOption([], false),
        {
          ...nodesSeriesOption(
            prevNodesRef.current.map((n) => ({
              ...n,
              itemStyle: { ...n.itemStyle, opacity: n.itemStyle.opacity * 0.55 },
              label: { show: false },
            })),
          ),
        },
      ]);
      // 180ms：新指标节点（尺寸重排）
      schedule(180, () => applySeriesPayload([nodesSeriesOption(nodes)]));
      // 280ms：新飞线以全透明数据就位
      schedule(280, () => applySeriesPayload([linesSeriesOption(lines, false)]));
      // 460ms：渐进显影至目标状态
      schedule(460, () => {
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
      const data = propsRef.current.nodes.map((n) => {
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
      try {
        inst.setOption({ series: [nodesSeriesOption(data)] });
      } catch {
        /* pulse 失败不致命 */
      }
    }, pulseIntervalMs);
    return () => clearInterval(id);
  }, [phase, pulse, pulseIntervalMs]);

  // autoRotate 开关（payload 附 duration 0，避免残留的相机插值时长造成无谓动画）
  useEffect(() => {
    const inst = instanceRef.current;
    if (phase !== 'ready' || !inst) return;
    try {
      inst.setOption({
        geo3D: { viewControl: { autoRotate, animationDurationUpdate: 0 } },
      });
    } catch {
      /* 旋转开关失败不致命 */
    }
  }, [phase, autoRotate]);

  // 事件桥：点击 / hover（进入用 pick 事件，离开用 zr mousemove 距离判定）
  useEffect(() => {
    const inst = instanceRef.current;
    if (phase !== 'ready' || !inst) return;

    const onClick = (params: unknown) => {
      const p = params as { data?: { city?: string } };
      if (p.data?.city) handlersRef.current.onCitySelect(p.data.city);
    };
    const onMouseOver = (params: unknown) => {
      const p = params as {
        data?: { city?: string };
        event?: { offsetX?: number; offsetY?: number };
      };
      const city = p.data?.city;
      if (!city) return;
      hoverRef.current = { city, x: p.event?.offsetX ?? 0, y: p.event?.offsetY ?? 0 };
      handlersRef.current.onCityHover(city);
    };
    const onZrMouseMove = (e: { offsetX?: number; offsetY?: number }) => {
      const hover = hoverRef.current;
      if (!hover) return;
      const dx = (e.offsetX ?? 0) - hover.x;
      const dy = (e.offsetY ?? 0) - hover.y;
      if (Math.hypot(dx, dy) > HOVER_LEAVE_RADIUS) {
        hoverRef.current = null;
        handlersRef.current.onCityHover(null);
      }
    };

    inst.on('click', onClick);
    inst.on('mouseover', onMouseOver);
    inst.getZr().on('mousemove', onZrMouseMove);
    return () => {
      inst.off('click', onClick);
      inst.off('mouseover', onMouseOver);
      inst.getZr().off('mousemove', onZrMouseMove);
    };
  }, [phase]);

  // 用户拖拽/缩放判定：位移超阈值或滚轮 → 挂起自动旋转（点击不受影响）
  useEffect(() => {
    const el = containerRef.current;
    if (phase !== 'ready' || !el) return;
    let down = false;
    let moved = 0;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (e: PointerEvent) => {
      down = true;
      moved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!down) return;
      moved += Math.hypot(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerUp = () => {
      if (down && moved > DRAG_THRESHOLD) handlersRef.current.onCameraDrag();
      down = false;
    };
    const onWheel = () => handlersRef.current.onCameraDrag();
    const onLeave = () => {
      down = false;
      if (hoverRef.current) {
        hoverRef.current = null;
        handlersRef.current.onCityHover(null);
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [phase]);

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

/** 基础 option：仅在实例创建时应用一次（相机初始位姿 + 系列骨架 + id） */
function buildBaseOption(initialAutoRotate: boolean): EChartsCoreOption {
  return {
    animation: false,
    animationDurationUpdate: 0,
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
        autoRotate: initialAutoRotate,
        autoRotateSpeed: AUTOROTATE.speed,
        autoRotateAfterStill: AUTOROTATE.afterStill,
        distance: OVERVIEW_POSE.distance,
        alpha: OVERVIEW_POSE.alpha,
        beta: OVERVIEW_POSE.beta,
        minDistance: 55,
        maxDistance: 260,
        panSensitivity: 0,
      },
      postEffect: { enable: false },
    },
    series: [
      {
        id: 'hero-lines',
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
        data: [],
        silent: true,
      },
      {
        id: 'hero-nodes',
        type: 'scatter3D',
        coordinateSystem: 'geo3D',
        data: [],
        symbolSize: 8,
        itemStyle: { opacity: 0.95 },
        label: {
          show: false,
          formatter: '{b}',
          position: 'right',
          distance: 3,
          textStyle: {
            color: NIGHT.text,
            fontSize: 11,
            backgroundColor: 'rgba(11,16,22,0.55)',
            padding: [1, 3],
          },
        },
      },
    ],
  } satisfies EChartsCoreOption;
}

export default HeroMap3D;
