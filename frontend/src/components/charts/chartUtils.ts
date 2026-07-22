// === 项目统一图表色板 — 深色科技主题 ===
// 核心色系：cyan / teal / emerald / amber / indigo / sky / violet / orange / slate
// 无 red / rose / pink，保持与整体设计系统一致
export const COLOR_PALETTE = [
  '#22d3ee', // cyan-400      — 主青
  '#2dd4bf', // teal-400      — 湖绿
  '#34d399', // emerald-400   — 翠绿
  '#fbbf24', // amber-400     — 琥珀
  '#818cf8', // indigo-400    — 靛蓝
  '#38bdf8', // sky-400       — 天蓝
  '#a78bfa', // violet-400    — 紫罗兰
  '#fb923c', // orange-400    — 橙
  '#67e8f9', // cyan-300      — 浅青
  '#5eead4', // teal-300      — 浅湖绿
  '#6ee7b7', // emerald-300   — 浅翠绿
  '#fde68a', // amber-200     — 浅琥珀
  '#c4b5fd', // violet-300    — 浅紫
  '#7dd3fc', // sky-300       — 浅天蓝
  '#94a3b8', // slate-400     — 石板灰（最低优先）
  '#fdba74', // orange-300    — 浅橙
];

export const METRIC_COLORS: Record<string, [string, string]> = {
  daily_ridership_wan:    ['#0e7490', '#22d3ee'],  // 深青 → 青
  operating_mileage_km:  ['#0f766e', '#2dd4bf'],  // 深湖绿 → 湖绿
  operating_stations:    ['#4338ca', '#818cf8'],  // 深靛 → 蓝紫
  ridership_intensity:   ['#b45309', '#fbbf24'],  // 深琥珀 → 琥珀
};

export const AXIS_LABEL_STYLE = { color: '#94a3b8', fontSize: 11 };
export const SPLIT_LINE_STYLE = { lineStyle: { color: '#1a3a5a' } };
export const Y_CATEGORY_LABEL = { color: '#94a3b8', fontSize: 11 };
export const CHART_GRID = { left: '4%', right: '12%', bottom: '3%', top: '3%', containLabel: true };

export function tooltipShadow() {
  return { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } };
}

