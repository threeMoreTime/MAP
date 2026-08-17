import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AUTOROTATE_RESUME_MS } from '../lib/hero3d/camera';
import { QUALITY_PROFILES } from '../lib/hero3d/palette';
import { buildFlylines, buildNodeData, metricMax, rankCities } from '../lib/hero3d/sceneData';
import {
  createHeroSceneState,
  heroSceneReducer,
  selectAmbientAnimation,
  selectAutoRotateActive,
} from '../lib/hero3d/sceneReducer';
import type { HeroQuality, HeroSceneState } from '../lib/hero3d/types';
import type { MergedCity } from './useMetroData';
import type { MetricKey } from '../types/metro';

export interface UseHeroSceneOptions {
  data: MergedCity[];
  /** 与 Dashboard 共用的指标状态（单一 source of truth 在页面层） */
  metric: MetricKey;
  /** URL ?city= 的选中城市（外部 source of truth，经此同步进状态机） */
  selectedCity: string | null;
  reducedMotion: boolean;
  quality: HeroQuality;
}

/**
 * Hero 场景状态机宿主：
 * - reducer 状态 + 外部状态（metric / URL city / reduced motion / quality）单向同步
 * - 派生节点/飞线/环境动画/旋转施加（暂停立即、恢复经延迟）
 * 相机命令与过渡计时在 DashboardHero3D（需要组件 ref）。
 */
export function useHeroScene({
  data,
  metric,
  selectedCity,
  reducedMotion,
  quality,
}: UseHeroSceneOptions) {
  const [state, dispatch] = useReducer(heroSceneReducer, undefined, () =>
    createHeroSceneState({ metric, selectedCity, quality, reducedMotion }),
  );

  // URL selectedCity 同步（外部变更：点击节点 / 关闭面板 / 浏览器前进后退）
  const lastPropCity = useRef(selectedCity);
  useEffect(() => {
    if (lastPropCity.current === selectedCity) return;
    lastPropCity.current = selectedCity;
    if (selectedCity) dispatch({ type: 'SELECT_CITY', city: selectedCity });
    else dispatch({ type: 'CLOSE_PANEL' });
  }, [selectedCity]);

  // 其余外部状态同步（reducer 幂等，值未变时返回原引用不触发渲染）
  useEffect(() => {
    dispatch({ type: 'SET_METRIC', metric });
  }, [metric]);
  useEffect(() => {
    dispatch({ type: 'SET_REDUCED_MOTION', value: reducedMotion });
  }, [reducedMotion]);
  useEffect(() => {
    dispatch({ type: 'SET_QUALITY', quality });
  }, [quality]);

  // ---- 派生数据（纯函数，lib/hero3d/sceneData）----
  const profile = QUALITY_PROFILES[state.quality];
  const ranked = useMemo(() => rankCities(data, state.metric), [data, state.metric]);
  const maxVal = useMemo(() => metricMax(ranked), [ranked]);
  const nodes = useMemo(
    () =>
      buildNodeData(ranked, maxVal, {
        selectedCity: state.selectedCity,
        hoveredCity: state.hoveredCity,
        labelCount: profile.labelCount,
        showLabels: state.showLabels,
      }),
    [ranked, maxVal, state.selectedCity, state.hoveredCity, state.showLabels, profile.labelCount],
  );
  const lines = useMemo(
    () => (state.showLines ? buildFlylines(ranked, profile.flylineCount) : []),
    [state.showLines, ranked, profile.flylineCount],
  );
  const ambient = useMemo(() => selectAmbientAnimation(state), [state]);

  // ---- autoRotate 施加：暂停立即，恢复经延迟（hover 离开后不立刻起转）----
  const rotationDesired = selectAutoRotateActive(state);
  const [rotationApplied, setRotationApplied] = useState(rotationDesired);
  useEffect(() => {
    const t = setTimeout(
      () => setRotationApplied(rotationDesired),
      rotationDesired ? AUTOROTATE_RESUME_MS : 0,
    );
    return () => clearTimeout(t);
  }, [rotationDesired]);

  // ---- hover 动作（地图节点 / 排行行共用）----
  const hoverCity = useCallback((city: string | null) => {
    dispatch(city ? { type: 'HOVER_ENTER', city } : { type: 'HOVER_LEAVE' });
  }, []);

  return {
    state,
    dispatch,
    ranked,
    maxVal,
    nodes,
    lines,
    profile,
    ambient,
    rotationApplied,
    hoverCity,
  } as const;
}

export type HeroScene = ReturnType<typeof useHeroScene>;
export type { HeroSceneState };
