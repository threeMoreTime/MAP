import { CITY_COORDS } from '../../data/cityCoords';
import { getMetricValue, isMetricValid } from '../../hooks/useDashboardFilters';
import type { MergedCity } from '../../hooks/useMetroData';
import type { MetricKey } from '../../types/metro';
import { NIGHT, NODE_SIZE } from './palette';
import type { HeroLineDatum, HeroNodeDatum, RankedCity } from './types';

/**
 * 场景数据变换（纯函数）：
 * 业务排序 / 节点视觉化 / 飞线构型都在这里，与 ECharts 实例和 React 状态解耦。
 */

/** 按当前 metric 降序排序的有效城市（含坐标与排名） */
export function rankCities(data: MergedCity[], metric: MetricKey): RankedCity[] {
  return data
    .filter((d) => CITY_COORDS[d.city] && isMetricValid(d, metric))
    .map((d) => ({
      city: d.city,
      cityCn: d.city_cn,
      lng: CITY_COORDS[d.city][0],
      lat: CITY_COORDS[d.city][1],
      value: getMetricValue(d, metric) ?? 0,
      rank: 0,
      raw: d,
    }))
    .sort((a, b) => b.value - a.value)
    .map((d, i) => ({ ...d, rank: i + 1 }));
}

/** 指标最大值（尺寸归一化分母，保底 1 防除零） */
export function metricMax(ranked: RankedCity[]): number {
  return Math.max(...ranked.map((d) => d.value), 1);
}

/** 飞线：榜首城市 → 指标前 count 名（视觉示意，非实际客流流向） */
export function buildFlylines(ranked: RankedCity[], count: number): HeroLineDatum[] {
  const hub = ranked[0];
  if (!hub || count <= 0) return [];
  return ranked.slice(1, count + 1).map((d) => ({
    coords: [
      [hub.lng, hub.lat],
      [d.lng, d.lat],
    ],
    value: d.value,
  }));
}

export interface NodeVisualState {
  selectedCity: string | null;
  hoveredCity: string | null;
  /** 常显标签的 Top N 数量 */
  labelCount: number;
  showLabels: boolean;
}

/**
 * 节点视觉化：尺寸（sqrt 比例 + 选中/悬停放大）、朱砂/墨白配色、
 * hover 或 selected 存在时其余节点降弱、标签显隐。
 */
export function buildNodeData(
  ranked: RankedCity[],
  maxVal: number,
  state: NodeVisualState,
): HeroNodeDatum[] {
  const { selectedCity, hoveredCity, labelCount, showLabels } = state;
  const focusCity = hoveredCity ?? selectedCity;
  const labelSet = new Set(ranked.slice(0, labelCount).map((d) => d.city));

  return ranked.map((d) => {
    const isSelected = selectedCity === d.city;
    const isHovered = hoveredCity === d.city;
    let size = Math.max(
      NODE_SIZE.baseMin,
      Math.sqrt(d.value / maxVal) * NODE_SIZE.baseMax,
    );
    if (isSelected) size *= NODE_SIZE.selectedScale;
    if (isHovered) size *= NODE_SIZE.hoveredScale;
    size = Math.min(size, NODE_SIZE.sizeCap);

    const dimmed = focusCity != null && !isSelected && !isHovered;

    return {
      name: d.cityCn,
      city: d.city,
      value: [d.lng, d.lat, d.value] as [number, number, number],
      itemStyle: {
        color: isSelected || isHovered ? NIGHT.accent : NIGHT.node,
        opacity: dimmed ? NODE_SIZE.dimOpacity : NODE_SIZE.normalOpacity,
      },
      symbolSize: Math.round(size * 10) / 10,
      label: {
        show:
          showLabels &&
          (isSelected || isHovered || labelSet.has(d.city)),
      },
    };
  });
}

/** 指标切换期间的旧飞线淡出 payload（progressive reveal 的第一拍） */
export function flylineFadeOption(visible: boolean): {
  lineStyle: { opacity: number };
} {
  return { lineStyle: { opacity: visible ? 0.16 : 0 } };
}
