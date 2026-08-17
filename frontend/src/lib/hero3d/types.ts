import type { MetricKey } from '../../types/metro';
import type { MergedCity } from '../../hooks/useMetroData';

/** 场景模式：全国总览 / 城市悬停 / 镜头过渡 / 城市聚焦 */
export type HeroSceneMode = 'overview' | 'hover' | 'transitioning' | 'focused';

/** 性能档位（只影响视觉丰富度，不影响数据口径） */
export type HeroQuality = 'high' | 'medium' | 'low';

/** 场景状态机唯一状态源；派生量一律走 selector，不冗余存储 */
export interface HeroSceneState {
  mode: HeroSceneMode;
  metric: MetricKey;
  selectedCity: string | null;
  hoveredCity: string | null;
  /** controls 上自动旋转开关的用户意图 */
  autoRotateEnabled: boolean;
  /** 用户拖拽/缩放后挂起；重置视角或再次切换开关才解除 */
  autoRotateSuspended: boolean;
  showLines: boolean;
  showLabels: boolean;
  reducedMotion: boolean;
  quality: HeroQuality;
  /** Hero 是否主要位于视口内（滚到下方数据区时暂停持续动画） */
  visible: boolean;
  /** 一次性 intro 是否已结束（含被跳过），数据更新不重播 */
  introDone: boolean;
  /** 进行中的镜头过渡目标 */
  transition: { to: 'focus' | 'reset'; city: string | null } | null;
}

export type HeroSceneAction =
  | { type: 'HOVER_ENTER'; city: string }
  | { type: 'HOVER_LEAVE' }
  | { type: 'SELECT_CITY'; city: string }
  | { type: 'CLOSE_PANEL' }
  | { type: 'TRANSITION_END' }
  | { type: 'SET_METRIC'; metric: MetricKey }
  | { type: 'TOGGLE_AUTOROTATE' }
  | { type: 'TOGGLE_LINES' }
  | { type: 'TOGGLE_LABELS' }
  | { type: 'RESET_VIEW' }
  | { type: 'USER_CAMERA_DRAG' }
  | { type: 'SET_REDUCED_MOTION'; value: boolean }
  | { type: 'SET_QUALITY'; quality: HeroQuality }
  | { type: 'SET_VISIBILITY'; visible: boolean }
  | { type: 'INTRO_DONE' };

/** 排序后的城市节点业务数据（与视觉无关，metric 变化时重算） */
export interface RankedCity {
  city: string;
  cityCn: string;
  lng: number;
  lat: number;
  value: number;
  rank: number;
  raw: MergedCity;
}

/** 散点节点（视觉化后，供 scatter3D data） */
export interface HeroNodeDatum {
  name: string;
  city: string;
  value: [number, number, number];
  itemStyle: { color: string; opacity: number };
  symbolSize: number;
  label: { show: boolean };
}

/** 飞线（hub → target） */
export interface HeroLineDatum {
  coords: [[number, number], [number, number]];
  value: number;
}
