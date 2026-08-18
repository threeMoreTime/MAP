/**
 * 场景动画时序（唯一来源）。
 * 相机几何（pose/构图）在 camera.ts；性能档预算在 palette.ts。
 */

// ---- 相机与旋转 ----
export const CAMERA_FOCUS_MS = 900;
export const CAMERA_RESET_MS = 900;
/** hover 离开后 autoRotate 恢复延迟 */
export const AUTOROTATE_RESUME_MS = 900;
/** 过渡计时收尾的余量（等 animateTo 完成后再发 TRANSITION_END） */
export const TRANSITION_SETTLE_PAD_MS = 80;

// ---- 一次性 intro（总时长 ~1.3s，pointerdown 可打断） ----
export const INTRO_LIGHT_UP_MS = 140;
export const INTRO_NODE_BATCHES_MS = [380, 490, 600, 710, 820] as const;
export const INTRO_NODE_BATCH_SIZE = 12;
export const INTRO_LINES_MS = 1080;
export const INTRO_FINISH_MS = 1280;

// ---- 指标切换分拍过渡（总时长 ~460ms + 显影余量） ----
export const METRIC_DIM_MS = 0;
export const METRIC_NODES_MS = 180;
export const METRIC_LINES_PREPARE_MS = 280;
export const METRIC_LINES_REVEAL_MS = 460;
