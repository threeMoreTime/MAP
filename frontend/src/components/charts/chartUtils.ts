// === 项目统一图表色板 — 深色科技主题 ===
// 核心色：青色 / 湖绿 / 翠绿 / 琥珀 / 蓝紫 / 玫红 / 天蓝 / 橙黄
export const COLOR_PALETTE = [
  '#22d3ee', // cyan-400
  '#2dd4bf', // teal-400
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#818cf8', // indigo-400
  '#fb7185', // rose-400
  '#38bdf8', // sky-400
  '#fb923c', // orange-400
  '#a78bfa', // violet-400
  '#4ade80', // green-400
  '#facc15', // yellow-400
  '#60a5fa', // blue-400
  '#f472b6', // pink-400
  '#86efac', // green-300
  '#67e8f9', // cyan-300
  '#5eead4', // teal-300
  '#6ee7b7', // emerald-300
  '#fde68a', // amber-200
  '#c4b5fd', // violet-300
  '#fdba74', // orange-300
];

export const METRIC_COLORS: Record<string, [string, string]> = {
  daily_ridership_wan:    ['#0e7490', '#22d3ee'],  // 深青 → 青
  operating_mileage_km:  ['#0f766e', '#2dd4bf'],  // 深湖绿 → 湖绿
  operating_stations:    ['#4338ca', '#818cf8'],  // 深靛 → 蓝紫
  ridership_intensity:   ['#b45309', '#fbbf24'],  // 深琥珀 → 琥珀
};

export const AXIS_LABEL_STYLE = { color: '#aaa' };
export const SPLIT_LINE_STYLE = { lineStyle: { color: '#1a3a5a' } };
export const Y_CATEGORY_LABEL = { color: '#ccc' };
export const CHART_GRID = { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true };

export function tooltipShadow() {
  return { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } };
}
