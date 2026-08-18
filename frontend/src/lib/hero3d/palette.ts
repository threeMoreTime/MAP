import type { HeroQuality } from './types';

/**
 * 夜墨色板：tokens.css `--night-*` 的 ECharts 投影。
 * 图表无法消费 CSS 变量，此处色值必须与 token 保持一致（改色先改 tokens.css）。
 */
export const NIGHT = {
  bg: 'transparent',
  terrain: '#16202e',
  terrainEdge: '#2b3a4e',
  terrainEmphasis: '#1f2d3f',
  text: '#e8e4d8',
  textDim: '#8a94a3',
  accent: '#d0553f',
  accentGlow: 'rgba(208, 85, 63, 0.55)',
  node: '#cfd8e3',
  grid: 'rgba(232,228,216,0.06)',
} as const;

/**
 * 各 quality 档的视觉预算（不触碰数据口径）。
 * pulse 实测成本：每次 setOption 阻塞主线程 ~50ms（scatter3D 全量更新 + geo3D
 * render 重放），900ms 间隔时每秒造成 2-3 帧长帧——high 降频至 1200ms，
 * medium 直接关闭（长帧源消除，呼吸感由节点视觉静态层次承担）。
 */
export interface QualityProfile {
  /** 飞线数量（Top N-1 条，hub 除外） */
  flylineCount: number;
  /** 常显城市标签数（Top N） */
  labelCount: number;
  /** Top 城市错峰呼吸 */
  pulse: { enabled: boolean; topN: number; intervalMs: number };
  /** DOM 墨尘环境微粒（仅 High） */
  ambience: boolean;
  /** devicePixelRatio 上限（null = 不限制） */
  dprCap: number | null;
}

export const QUALITY_PROFILES: Record<HeroQuality, QualityProfile> = {
  high: {
    flylineCount: 9,
    labelCount: 8,
    pulse: { enabled: true, topN: 5, intervalMs: 1200 },
    ambience: true,
    dprCap: null,
  },
  medium: {
    flylineCount: 5,
    labelCount: 5,
    pulse: { enabled: false, topN: 0, intervalMs: 0 },
    ambience: false,
    dprCap: 1.5,
  },
  low: {
    flylineCount: 3,
    labelCount: 3,
    pulse: { enabled: false, topN: 0, intervalMs: 0 },
    ambience: false,
    dprCap: 1,
  },
};

/** 节点尺寸曲线（与基线 HeroMap3D 保持一致：sqrt 比例，4-16 基准） */
export const NODE_SIZE = {
  baseMin: 4,
  baseMax: 16,
  selectedScale: 1.35,
  hoveredScale: 1.3,
  sizeCap: 26,
  /** hover/selected 存在时，其余节点的降弱透明度 */
  dimOpacity: 0.45,
  normalOpacity: 0.95,
} as const;
