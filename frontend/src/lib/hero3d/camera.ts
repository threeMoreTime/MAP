import type { RankedCity } from './types';

/**
 * 相机数学（纯函数）：构图参数与聚焦目标计算。
 * 实际插值交给 echarts-gl 原生 animateTo（setOption viewControl +
 * animationDurationUpdate/cubicOut），不自写 RAF tween。
 */

export interface CameraPose {
  /** 相机注视点（geo3D 内部 3D 坐标；overview 为盒中心） */
  center?: number[];
  distance?: number;
  alpha?: number;
  beta?: number;
}

/** 全国总览构图（与基线一致） */
export const OVERVIEW_POSE: CameraPose = {
  center: [0, 0, 0],
  distance: 118,
  alpha: 38,
  beta: 12,
};

/** 聚焦中景：城市为画面主体，周边地形与弱化邻城仍可见 */
export const FOCUS_POSE = {
  distance: 64,
  alpha: 40,
} as const;

/** 经纬度 → geo3D 内部 3D 坐标的投影函数（由运行时注入 dataToPoint） */
export type ProjectLngLat = (lngLat: [number, number]) => number[];

/** 城市聚焦构图：center 对准城市，距离/俯角取中景，beta 省略保持当前方位 */
export function cityFocusPose(project: ProjectLngLat, city: RankedCity): CameraPose {
  return {
    center: project([city.lng, city.lat]),
    distance: FOCUS_POSE.distance,
    alpha: FOCUS_POSE.alpha,
  };
}

/** 镜头过渡时长；reducedMotion 时由调用方归零 */
export const CAMERA_FOCUS_MS = 900;
export const CAMERA_RESET_MS = 900;
/** hover 离开后 autoRotate 恢复延迟 */
export const AUTOROTATE_RESUME_MS = 900;

/** 全国总览视角下 viewControl 的旋转参数 */
export const AUTOROTATE = {
  speed: 0.55,
  /**
   * 拖拽后永不自动恢复（只有重置视角 / controls 开关经 React 通道再起转）。
   * 取 0：OrbitControl._startCountingStill 对 0/非法值不安排恢复倒计时；
   * 不能用 Infinity（option 归一化后变 null，且 setTimeout(fn, Infinity) 被浏览器视为立即触发）。
   */
  afterStill: 0,
} as const;
