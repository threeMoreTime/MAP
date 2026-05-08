export const COLOR_PALETTE = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#48b8d0',
  '#ff9f7f', '#87cefa', '#da70d6', '#32cd32', '#ffa07a',
  '#20b2aa', '#778899', '#ffb6c1', '#98fb98', '#dda0dd',
  '#f0e68c', '#add8e6', '#ffb347', '#77dd77', '#fdfd96',
  '#aec6cf', '#cb99c9', '#c23b22', '#779ecb', '#f7b7d0',
  '#b39eb5', '#fdfc8f', '#836953', '#b19cd9', '#ff6961',
];

export const METRIC_COLORS: Record<string, [string, string]> = {
  daily_ridership_wan: ['#1565C0', '#42A5F5'],
  operating_mileage_km: ['#2E7D32', '#66BB6A'],
  operating_stations: ['#6A1B9A', '#AB47BC'],
  ridership_intensity: ['#E65100', '#FFB74D'],
};

export const AXIS_LABEL_STYLE = { color: '#aaa' };
export const SPLIT_LINE_STYLE = { lineStyle: { color: '#1a3a5a' } };
export const Y_CATEGORY_LABEL = { color: '#ccc' };
export const CHART_GRID = { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true };

export function tooltipShadow() {
  return { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } };
}
