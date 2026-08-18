import type { EChartsCoreOption } from '../echarts';
import { NIGHT } from './palette';
import { AUTOROTATE, OVERVIEW_POSE } from './camera';
import type { HeroLineDatum, HeroNodeDatum } from './types';

/**
 * ECharts option 构建器（纯函数，无实例依赖）。
 * 相机纪律：系列更新只经 withCameraNeutralizer 附加中和载荷，
 * 相机命令（focus/reset）由 HeroMap3D 的 imperative handle 独立下发。
 */

/** 非相机 setOption 的相机中和载荷：阻止 geo3D 重渲染拿残留的
 * animation/duration 把镜头 animate 回飞行中的中间值 */
export const NEUTRALIZED_VIEWCONTROL = {
  animation: false,
  animationDurationUpdate: 0,
} as const;

export function withCameraNeutralizer(seriesPayload: object[]): EChartsCoreOption {
  return {
    series: seriesPayload,
    geo3D: { viewControl: { ...NEUTRALIZED_VIEWCONTROL } },
  };
}

export function linesSeriesOption(lines: HeroLineDatum[], effect: boolean) {
  return {
    id: 'hero-lines',
    effect: {
      show: effect,
      trailWidth: 1.6,
      trailLength: 0.4,
      trailColor: NIGHT.accent,
      trailOpacity: 0.9,
      constantSpeed: 22,
    },
    lineStyle: { color: NIGHT.accent, opacity: effect ? 0.16 : 0, width: 1 },
    data: lines,
  };
}

export function nodesSeriesOption(nodes: HeroNodeDatum[]) {
  return { id: 'hero-nodes', data: nodes };
}

/** 指标过渡第一拍：旧节点视觉降弱（标签隐藏、透明度打折） */
export function dimmedNodesOption(nodes: HeroNodeDatum[]) {
  return nodesSeriesOption(
    nodes.map((n) => ({
      ...n,
      itemStyle: { ...n.itemStyle, opacity: n.itemStyle.opacity * 0.55 },
      label: { show: false },
    })),
  );
}

/** 基础 option：仅在实例创建时应用一次（相机初始位姿 + 系列骨架 + id） */
export function buildBaseOption(initialAutoRotate: boolean): EChartsCoreOption {
  return {
    animation: false,
    animationDurationUpdate: 0,
    backgroundColor: NIGHT.bg,
    geo3D: {
      map: 'china',
      roam: true,
      boxWidth: 100,
      boxHeight: 8,
      regionHeight: 2,
      shading: 'lambert',
      itemStyle: {
        color: NIGHT.terrain,
        borderColor: NIGHT.terrainEdge,
        borderWidth: 0.6,
      },
      emphasis: { itemStyle: { color: NIGHT.terrainEmphasis } },
      light: {
        main: { intensity: 1.25, alpha: 55, beta: 20, shadow: false },
        ambient: { intensity: 0.45 },
      },
      viewControl: {
        autoRotate: initialAutoRotate,
        autoRotateSpeed: AUTOROTATE.speed,
        autoRotateAfterStill: AUTOROTATE.afterStill,
        distance: OVERVIEW_POSE.distance,
        alpha: OVERVIEW_POSE.alpha,
        beta: OVERVIEW_POSE.beta,
        minDistance: 55,
        maxDistance: 260,
        panSensitivity: 0,
      },
      postEffect: { enable: false },
    },
    series: [
      {
        id: 'hero-lines',
        type: 'lines3D',
        coordinateSystem: 'geo3D',
        effect: {
          show: true,
          trailWidth: 1.6,
          trailLength: 0.4,
          trailColor: NIGHT.accent,
          trailOpacity: 0.9,
          constantSpeed: 22,
        },
        lineStyle: { color: NIGHT.accent, opacity: 0.16, width: 1 },
        data: [],
        silent: true,
      },
      {
        id: 'hero-nodes',
        type: 'scatter3D',
        coordinateSystem: 'geo3D',
        data: [],
        symbolSize: 8,
        itemStyle: { opacity: 0.95 },
        label: {
          show: false,
          formatter: '{b}',
          position: 'right',
          distance: 3,
          textStyle: {
            color: NIGHT.text,
            fontSize: 11,
            backgroundColor: 'rgba(11,16,22,0.55)',
            padding: [1, 3],
          },
        },
      },
    ],
  } satisfies EChartsCoreOption;
}
