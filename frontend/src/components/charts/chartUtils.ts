// === 项目统一图表色板 — 纸墨 · 朱印主题 ===
// 与 src/styles/tokens.css 的 --chart-* 变量保持同值；
// ECharts option 无法消费 CSS 变量，故以常量形式在此集中定义。
// 墨阶为主，朱砂仅用于"当前关注的系列/榜首"。

/** 墨阶序列：多系列/低强调场景，从深到浅 */
export const COLOR_PALETTE = [
  '#2b2620', // 墨 1 — 最深
  '#6b6354', // 墨 3
  '#9a7325', // 赭金
  '#37755a', // 黛绿
  '#8d846f', // 墨 4
  '#aea48b', // 墨 5
  '#c03d2b', // 朱砂（对比场景压轴使用）
  '#4a443a', // 墨 2
  '#cdc4ab', // 墨 6 — 最浅
];

/** 主指标墨阶对：单指标图表的起止色（深 → 浅） */
export const METRIC_COLORS: Record<string, [string, string]> = {
  daily_ridership_wan: ['#2b2620', '#8d846f'], // 墨
  operating_mileage_km: ['#37755a', '#8fae9c'], // 黛绿
  operating_stations: ['#453f33', '#ab9f87'], // 褐墨
  ridership_intensity: ['#c03d2b', '#dfa08f'], // 朱砂（强度 = 唯一朱砂主图表）
};

export const CHART_VERMILION = '#c03d2b';
export const CHART_INK = '#2b2620';

export const AXIS_LABEL_STYLE = { color: '#8f8672', fontSize: 11 };
export const SPLIT_LINE_STYLE = { lineStyle: { color: 'rgba(33,29,22,0.08)' } };
export const Y_CATEGORY_LABEL = { color: '#453f33', fontSize: 11 };
export const CHART_GRID = { left: '4%', right: '12%', bottom: '3%', top: '3%', containLabel: true };

/** 浅纸底 tooltip：纸面 + 墨字 + 细边线 */
export const PAPER_TOOLTIP = {
  backgroundColor: '#faf8f1',
  borderColor: '#dcd4c0',
  borderWidth: 1,
  padding: [8, 12] as [number, number],
  textStyle: { color: '#211d16', fontSize: 12 },
  extraCssText: 'box-shadow: 0 2px 10px rgba(33,29,22,0.12); border-radius: 4px;',
};

export function tooltipShadow() {
  return { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } };
}
