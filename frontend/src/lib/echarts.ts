/**
 * ECharts 按需注册中心：全站唯一入口。
 * 新增图表类型或组件时在此登记，禁止直接 import 'echarts' 整包。
 */
import * as echarts from 'echarts/core';
import {
  BarChart,
  EffectScatterChart,
  LineChart,
  RadarChart,
  ScatterChart,
} from 'echarts/charts';
import {
  AxisPointerComponent,
  GeoComponent,
  GridComponent,
  LegendComponent,
  RadarComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type {
  BarSeriesOption,
  EffectScatterSeriesOption,
  LineSeriesOption,
  RadarSeriesOption,
  ScatterSeriesOption,
} from 'echarts/charts';
import type {
  AxisPointerComponentOption,
  GeoComponentOption,
  GridComponentOption,
  LegendComponentOption,
  RadarComponentOption,
  TitleComponentOption,
  TooltipComponentOption,
} from 'echarts/components';
import type { ComposeOption, EChartsCoreOption } from 'echarts/core';

echarts.use([
  BarChart,
  EffectScatterChart,
  LineChart,
  RadarChart,
  ScatterChart,
  AxisPointerComponent,
  GeoComponent,
  GridComponent,
  LegendComponent,
  RadarComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
]);

export type EChartsOption = ComposeOption<
  | BarSeriesOption
  | EffectScatterSeriesOption
  | LineSeriesOption
  | RadarSeriesOption
  | ScatterSeriesOption
  | AxisPointerComponentOption
  | GeoComponentOption
  | GridComponentOption
  | LegendComponentOption
  | RadarComponentOption
  | TitleComponentOption
  | TooltipComponentOption
>;

export { echarts };
/** echarts-gl 扩展（geo3D/lines3D 等）不在 ComposeOption 组合内，用 core 宽松类型 */
export type { EChartsCoreOption };
