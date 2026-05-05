# Dashboard 设计文档

## 自包含设计

`dashboard.html` 采用完全自包含的单文件设计，具有以下特点：

- **单一 HTML 文件**：所有代码、样式、数据内联在一个文件中，无需构建工具或打包流程
- **内嵌数据**：通过内嵌的 `DATA` 数组提供所有城市数据，无需后端 API
- **CDN 依赖**：ECharts 库从 CDN 加载，仅有的外部依赖
- **即开即用**：双击 HTML 文件即可在浏览器中查看完整仪表盘

这种设计使得分发和部署极为简单，只需一个文件即可运行，适合离线查看和快速分享。

---

## ECharts 图表模块

仪表盘包含 5 个核心图表：

| 图表 | ID | 类型 | 说明 |
|------|----|------|------|
| 客流排名图 | rank-chart | 横向柱状图 (bar) | 按所选指标展示 Top N 城市排名 |
| 里程对比图 | mileage-chart | 柱状图 (bar) | 各城市运营里程对比 |
| 年度趋势图 | trend-chart | 折线图 (line) | 选中城市的历年客流变化趋势 |
| 客流强度图 | intensity-chart | 柱状图/散点图 | 客流强度（客流/里程）对比 |
| 全国地图 | map-chart | 地图 (map) + scatter + effectScatter | 全国城市分布，气泡大小表示客流规模 |

所有图表共享统一的配色方案和交互风格。

---

## state 交互状态

全局状态对象管理仪表盘的所有交互参数：

```javascript
const state = {
  keyword: '',    // 搜索关键词，过滤城市名称
  metric: 'daily_ridership',  // 当前选中的指标类型
  topN: 20       // 排名显示的城市数量
};
```

每次状态变更均通过 `updateDashboard()` 进行统一分发，确保所有图表同步更新。

---

## getChart() 实例复用

为避免重复创建图表实例导致内存泄漏和性能问题，采用 `getChart(id)` 函数进行实例管理：

```javascript
function getChart(id) {
  // 查找已有实例，存在则返回
  // 不存在则调用 echarts.init 创建新实例并缓存
}
```

**设计原则**：

- 每个图表 DOM 容器只对应一个 ECharts 实例
- 更新图表时调用 `setOption()` 而非重新 `echarts.init()`
- 窗口 resize 时统一调用所有实例的 `resize()` 方法

---

## 筛选控件联动

三个筛选控件与状态对象双向绑定，任何变更都会触发全局更新：

### 搜索框

- 输入城市名称关键词
- 更新 `state.keyword`
- 实时过滤所有图表中的城市数据

### 指标选择器

- 切换展示的指标类型（日均客流、年客流等）
- 更新 `state.metric`
- 联动更新排名图、地图、强度图的展示数值

### Top N 选择器

- 调整排名图中显示的城市数量
- 更新 `state.topN`
- 影响排名图和地图中的城市数量

**联动流程**：

```
控件变更 → 更新 state → 调用 updateDashboard()
  → updateRankChart()
  → updateMileageChart()
  → updateTrendChart()
  → updateIntensityChart()
  → updateMapChart()
```

---

## 地图加载链路

全国地图的 GeoJSON 数据采用多级回退策略加载：

```
1. 本地文件: assets/china.json
   ↓ 失败
2. 阿里云 CDN: 远程加载中国地图 GeoJSON
   ↓ 失败
3. showMapFallback(): 降级为纯城市列表展示
```

**详细流程**：

1. 优先尝试从本地 `assets/china.json` 加载，速度最快且支持离线
2. 本地加载失败时，从阿里云 CDN 拉取地图数据
3. 所有来源均失败时，调用 `showMapFallback()` 显示降级的城市列表视图

地图上的 `scatter` 系列展示城市位置，`effectScatter` 系列为选中城市添加高亮动效。点击地图上的城市标记会触发 `showCityDetail(d)` 弹出城市详情面板。

---

## 缺失数据展示规则

数据完整性通过以下辅助函数统一处理：

### hasValidDailyRidership(d)

- 检查城市数据对象中是否存在有效的日均客流数据
- 返回布尔值，用于决定是否在图表中展示该项

### formatMetricValue(d, metric)

- 根据指标类型格式化显示数值
- 处理空值、无效值的格式化输出
- 添加适当的单位（万人次、公里等）

### isMetricValid(d, metric)

- 判断城市数据中指定指标是否有效
- 用于过滤图表数据源

**展示规则**：

- 有效数据正常展示数值和图表
- 无效或缺失数据显示为 **"暂无数据"**
- 图表中缺失数据点以 `null` 填充，折线自动断开
- 排名图中过滤掉无数据城市，避免空行

---

## 移动端适配

通过 CSS 媒体查询实现响应式布局：

```css
@media (max-width: 600px) {
  /* 高度缩减 */
  /* 布局调整为单列 */
  /* 字体大小调整 */
}
```

**适配要点**：

| 项目 | 桌面端 | 移动端 |
|------|--------|--------|
| 图表高度 | 默认高度 | 缩减高度，节省屏幕空间 |
| 布局方式 | 多列网格 | 单列堆叠 |
| 地图交互 | 鼠标悬停+点击 | 触摸点击 |
| 控件排列 | 横向排列 | 纵向堆叠 |

---

## 年度趋势图年份对齐

不同城市的客流数据可能覆盖不同年份区间，趋势图通过以下机制确保正确对齐：

### yearSet 合并

- 收集所有可见城市的年份，合并为完整的 `yearSet`
- 按年份升序排列作为 X 轴基准

### year → value 映射

- 每个城市的数据建立 `year → value` 的映射关系
- 查找对应年份的客流值

### null 填充

- 城市缺少某年数据时，该点填入 `null`
- ECharts 折线图自动处理 `null` 值，产生断点效果

这种处理方式确保多城市趋势对比时年份轴对齐，数据缺失处直观可见，不会产生误导性的连线。

---

## 自动化验收覆盖

`scripts/acceptance_dashboard.js` 通过 puppeteer-core 覆盖以下 Dashboard 交互项：

| 交互模块 | 验收项 | 检查方式 |
|----------|--------|----------|
| 页面加载 | T01/T02/T03 | HTTP 状态、console 错误、ECharts canvas |
| 搜索框 | T04/T05 | 输入关键词 → ECharts `getOption()` 获取 yAxis.data |
| 指标选择器 | T06a–T06d | 切换 `metricSelect` → 检查 `rankTitle` 文本 |
| Top N 选择器 | T07a–T07c | 切换 `topNSelect` → ECharts API 获取城市数量 |
| 城市详情 | T08/T09 | 调用 `showCityDetail()` → 检查 `detailContent` innerHTML |
| 移动端 | T10 | 375px viewport reload → `scrollWidth` 检查 |
| 控制台 | T11 | 全程 console error 过滤（排除 favicon/404/网络错误） |

**关键设计**：使用 ECharts API（`echarts.getInstanceByDom().getOption()`）获取图表数据，而非解析 canvas/SVG innerHTML，确保验收结果可靠。
