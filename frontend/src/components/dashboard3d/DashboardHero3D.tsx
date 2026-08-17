import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CAMERA_FOCUS_MS, CAMERA_RESET_MS } from '../../lib/hero3d/camera';
import { formatMetricValue } from '../../hooks/useDashboardFilters';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useHeroQuality } from '../../hooks/useHeroQuality';
import { useHeroScene } from '../../hooks/useHeroScene';
import { METRIC_LABELS } from '../../types/metro';
import type { MergedCity } from '../../hooks/useMetroData';
import type { MetricKey } from '../../types/metro';
import HeroMap3D, { type HeroMap3DHandle } from './HeroMap3D';
import HeroOverlay from './HeroOverlay';
import HeroRanking from './HeroRanking';
import HeroCityTooltip from './HeroCityTooltip';
import HeroControls from './HeroControls';
import HeroCityPanel from './HeroCityPanel';
import HeroAmbience from './HeroAmbience';

/** 桌面排行行数（任务决策：Top 5） */
const RANKING_COUNT = 5;

interface Props {
  data: MergedCity[];
  metric: MetricKey;
  onMetricChange: (metric: MetricKey) => void;
  selectedCity: string | null;
  onCitySelect: (city: string | null) => void;
  /** 页面侧已解析的选中城市对象（驱动详情面板） */
  cityDetail: MergedCity | null;
  citiesCount: number;
  statsCount: number;
  onScrollToOverview: () => void;
}

/**
 * 首页全屏夜墨 3D Hero（场景系统组合层）。
 * 页面只负责数据 / metric / URL；状态机、镜头、overlay、面板在这里编排。
 */
export default function DashboardHero3D({
  data,
  metric,
  onMetricChange,
  selectedCity,
  onCitySelect,
  cityDetail,
  citiesCount,
  statsCount,
  onScrollToOverview,
}: Props) {
  const reducedMotion = useReducedMotion();
  const quality = useHeroQuality();
  const {
    state,
    dispatch,
    ranked,
    nodes,
    lines,
    profile,
    ambient,
    rotationApplied,
    hoverCity,
  } = useHeroScene({ data, metric, selectedCity, reducedMotion, quality });

  const heroRef = useRef<HeroMap3DHandle>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const handleSceneReady = useCallback(() => setSceneReady(true), []);

  // ---- intro 生命周期：reduced motion / URL 直达 → 跳过整套序列直接就绪 ----
  const [skipIntro] = useState(() => !!selectedCity);
  const handleIntroDone = useCallback(() => dispatch({ type: 'INTRO_DONE' }), [dispatch]);
  useEffect(() => {
    if (!sceneReady) return;
    if (reducedMotion || skipIntro) dispatch({ type: 'INTRO_DONE' });
  }, [sceneReady, reducedMotion, skipIntro, dispatch]);

  // ---- 镜头过渡：transition 信号 → 相机命令 + 计时收尾 ----
  useEffect(() => {
    if (!state.transition) return;
    const duration = state.reducedMotion
      ? 0
      : state.transition.to === 'focus'
        ? CAMERA_FOCUS_MS
        : CAMERA_RESET_MS;
    if (state.transition.to === 'focus') {
      const city = ranked.find((r) => r.city === state.selectedCity);
      if (city) heroRef.current?.focusCity(city, duration);
    } else {
      heroRef.current?.resetView(duration);
    }
  }, [state.transition, state.selectedCity, state.reducedMotion, ranked]);

  useEffect(() => {
    if (!state.transition) return;
    const duration = state.reducedMotion
      ? 0
      : state.transition.to === 'focus'
        ? CAMERA_FOCUS_MS
        : CAMERA_RESET_MS;
    const t = setTimeout(() => dispatch({ type: 'TRANSITION_END' }), duration + 80);
    return () => clearTimeout(t);
  }, [state.transition, state.reducedMotion, dispatch]);

  // ---- URL ?city= 直达：场景就绪后补一次聚焦（面板已先行显示）----
  const initialFocusDone = useRef(false);
  useEffect(() => {
    if (!sceneReady || initialFocusDone.current || !state.selectedCity) return;
    initialFocusDone.current = true;
    const city = ranked.find((r) => r.city === state.selectedCity);
    if (city) {
      heroRef.current?.focusCity(city, state.reducedMotion ? 0 : CAMERA_FOCUS_MS);
    }
  }, [sceneReady, state.selectedCity, state.reducedMotion, ranked]);

  // ---- 交互动作 ----
  const handleCitySelect = useCallback(
    (city: string) => onCitySelect(city),
    [onCitySelect],
  );
  const handleClosePanel = useCallback(() => onCitySelect(null), [onCitySelect]);
  const handleCameraDrag = useCallback(
    () => dispatch({ type: 'USER_CAMERA_DRAG' }),
    [dispatch],
  );
  const handleResetView = useCallback(() => {
    dispatch({ type: 'RESET_VIEW' });
    if (state.selectedCity) onCitySelect(null);
  }, [dispatch, state.selectedCity, onCitySelect]);

  // ---- tooltip 内容（低频：仅在 hover 城市或指标变化时重算）----
  const tooltipInfo = useMemo(() => {
    if (!state.hoveredCity) return null;
    const r = ranked.find((x) => x.city === state.hoveredCity);
    if (!r) return null;
    return {
      cityCn: r.cityCn,
      metricName: METRIC_LABELS[state.metric].name,
      value: formatMetricValue(r.raw, state.metric),
      unit: '',
    };
  }, [state.hoveredCity, state.metric, ranked]);

  // ---- 滚动生命周期：Hero 大部分离开视口 → 暂停旋转/飞线 effect/pulse/墨尘；
  // 回到视口按状态恢复（不销毁 ECharts 实例，压低滚到下方数据区后的 GPU 占用）----
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = (entries[0]?.intersectionRatio ?? 1) >= 0.35;
        dispatch({ type: 'SET_VISIBILITY', visible });
      },
      { threshold: [0, 0.35, 0.75] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [dispatch]);

  // ---- 面板可见性与过渡姿态 ----
  const exiting = state.mode === 'transitioning' && state.transition?.to === 'reset';
  const panelOpen = exiting || (!!state.selectedCity && !!cityDetail);

  // ---- intro 后才起转 / 起 pulse / 起墨尘（overlay 显影阶梯同源）----
  const sceneSettled = state.introDone;
  const pulseCities = useMemo(
    () =>
      ranked.slice(0, profile.pulse.topN).map(({ city, lng, lat, rank }) => ({
        city,
        lng,
        lat,
        rank,
      })),
    [ranked, profile.pulse.topN],
  );

  return (
    <section
      ref={sectionRef}
      className="relative h-screen min-h-[560px] w-full overflow-hidden bg-[#0b1016]"
    >
      <div className="absolute inset-0">
        <HeroMap3D
          ref={heroRef}
          data={data}
          metric={state.metric}
          selectedCity={state.selectedCity}
          nodes={nodes}
          lines={lines}
          autoRotate={rotationApplied && sceneSettled}
          flylineEffect={ambient.flylineEffect}
          reducedMotion={reducedMotion}
          dprCap={profile.dprCap}
          pulse={ambient.pulse && sceneSettled}
          pulseCities={pulseCities}
          pulseIntervalMs={profile.pulse.intervalMs}
          skipIntro={skipIntro}
          onCityHover={hoverCity}
          onCitySelect={handleCitySelect}
          onCameraDrag={handleCameraDrag}
          onSceneReady={handleSceneReady}
          onIntroDone={handleIntroDone}
        />
      </div>

      <HeroAmbience active={ambient.ambience && sceneSettled} />

      <HeroOverlay
        citiesCount={citiesCount}
        statsCount={statsCount}
        metric={state.metric}
        onMetricChange={onMetricChange}
        revealed={sceneSettled}
      />

      {!panelOpen && (
        <HeroRanking
          ranked={ranked}
          metric={state.metric}
          hoveredCity={state.hoveredCity}
          selectedCity={state.selectedCity}
          count={RANKING_COUNT}
          onHover={hoverCity}
          onSelect={handleCitySelect}
          revealed={sceneSettled}
        />
      )}

      <HeroCityTooltip info={tooltipInfo} />

      {panelOpen && (
        <HeroCityPanel
          city={cityDetail}
          phase={exiting ? 'exit' : 'enter'}
          onClose={handleClosePanel}
        />
      )}

      <HeroControls
        autoRotateEnabled={state.autoRotateEnabled}
        showLines={state.showLines}
        showLabels={state.showLabels}
        onToggleAutoRotate={() => dispatch({ type: 'TOGGLE_AUTOROTATE' })}
        onToggleLines={() => dispatch({ type: 'TOGGLE_LINES' })}
        onToggleLabels={() => dispatch({ type: 'TOGGLE_LABELS' })}
        onResetView={handleResetView}
        revealed={sceneSettled}
      />

      {/* 下滚锚点 */}
      <button
        onClick={onScrollToOverview}
        className={`absolute bottom-6 left-1/2 z-10 -translate-x-1/2 cursor-pointer rounded-full border border-[#2b3a4e] bg-[#0b1016]/60 px-4 py-1.5 text-[12px] text-[#8a94a3] backdrop-blur-[2px] transition-colors duration-200 hover:border-[#d0553f]/60 hover:text-[#e8e4d8] focus-visible:outline-2 focus-visible:outline-[#d0553f] ${
          sceneSettled ? 'motion-safe:hero-fade-in' : 'opacity-0'
        }`}
        style={sceneSettled ? { animationDelay: '320ms' } : undefined}
      >
        ↓ 查看数据总览
      </button>

      {/* 底部渐变过渡到纸面 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-paper-50" />
    </section>
  );
}
