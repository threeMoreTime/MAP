# OpenSpec: Phase 8 城市对比功能

> **阶段**：Phase 8 — 多城市数据交叉对比功能
> **优先级**：P2
> **状态**：OpenSpec 设计中，待人工审阅
> **日期**：2026-05-28
> **仓库**：threeMoreTime/MAP

---

## 1. 背景与问题

当前 MAP 项目已具备五个核心页面：

| 页面 | 路由 | 能力 |
|------|------|------|
| Dashboard | `/#/dashboard` | 全国总体概览、地图散点、排行、趋势 |
| Cities | `/#/cities` | 50 城网格总览、封面图、筛选 |
| City Detail | `/#/city/:id` | 单城详情、统计卡片、线路图查看器 |
| Data Quality | `/#/data-quality` | 收录完整度大纲、缺失索引、50 城检索大表 |
| About | `/#/about` | 项目说明、数据来源、免责声明 |

**缺失能力：多城市横向对比。**

用户无法在同一个视图内将两个或多个城市的运营指标并排比较。单城详情页只能看一个城市，Data Quality 页面聚焦收录完整度而非运营指标。Phase 8 将补足"多城市横向对比"这一能力。

---

## 2. 目标

| # | 目标 | Must / Should / Could |
|---|------|-----------------------|
| 1 | 新增 `/#/compare` 页面 | **Must** |
| 2 | 支持选择 2-5 个城市 | **Must** |
| 3 | 支持日客流/里程/站点/线路/客流强度/峰值客流横向对比 | **Must** |
| 4 | 支持数据完整度评分与收录完整度对比 | **Must** |
| 5 | 支持图表（条形图）+ 指标卡片 + 表格组合展示 | **Must** |
| 6 | 缺失数据中性展示，不当 0 | **Must** |
| 7 | 移动端 375px 无横向溢出 | **Must** |
| 8 | URL 参数保存选择状态，便于分享与测试 | **Must** |
| 9 | 雷达图多维归一化对比 | **Should** |
| 10 | 年度客流趋势折线对比 | **Should** |
| 11 | localStorage 保存最近选择 | **Could**（初版可不做） |
| 12 | 新增验收测试 T32 / T33 / T34 | **Must** |
| 13 | 线上 smoke 覆盖 `/#/compare` | **Must** |

---

## 3. 非目标

Phase 8 **明确不做**：

1. 不修改 `dashboard.html`（Frozen Baseline）
2. 不改写原始数据文件（`data/latest/*`）
3. 不新增爬虫脚本
4. 不新增后端服务或 API
5. 不做官方城市排名或城市发展水平评价
6. 不做实时数据监测
7. 不做账户、收藏、分享到社交平台等复杂用户系统
8. 不支持超过 5 个城市的大规模批量比较
9. 不引入 Redux / Zustand 等新状态管理库
10. 不引入新的重型依赖（仅使用 ECharts + React 已有能力）

---

## 4. 数据源设计

### 4.1 数据源（只使用现有静态数据）

| 数据文件 | 用途 | 关键字段 |
|----------|------|----------|
| `data/latest/metro_stats.json` | 运营指标 | `city, city_cn, daily_ridership_wan, operating_mileage_km, operating_stations, operating_lines, ridership_intensity, peak_ridership_wan, peak_ridership_date, yearly_avg_ridership` |
| `data/latest/city_assets_index.json` | 资源状态 | `city, city_cn, has_network_map, has_plan_map, has_stats, has_yearly_trend` |
| `data/latest/quality_report.json` | 完整度 | `city, city_cn, quality_score, quality_level, missing_items, warnings, risk_flags` |

### 4.2 派生数据模型

```typescript
interface ComparableCity {
  // 基础信息
  city: string;                          // 拼音 slug，如 'beijing'
  city_cn: string;                       // 中文名，如 '北京'
  hasStats: boolean;                     // 是否有统计记录

  // 核心运营指标（null = 暂未收录）
  dailyRidershipWan: number | null;      // 日客流（万人次）
  operatingMileageKm: number | null;     // 运营里程（km）
  operatingStations: number | null;      // 运营站点（座）
  operatingLines: number | null;         // 运营线路（条）
  ridershipIntensity: number | null;     // 客流强度
  peakRidershipWan: number | null;       // 历史峰值客流（万人次）

  // 资源收录状态
  hasYearlyTrend: boolean;               // 是否有年度趋势数据
  hasNetworkMap: boolean;                // 是否有线路图
  hasPlanMap: boolean;                   // 是否有规划图
  coverStatus: 'downloaded' | 'fallback' | 'unknown';  // 封面状态

  // 数据完整度
  qualityScore: number | null;           // 完整度评分（0-100）
  qualityLevel: 'high' | 'medium' | 'low' | null;      // 完整度等级
  missingItems: string[];                // 缺失项列表
  warnings: string[];                    // 警告列表

  // 年度趋势（仅当 hasYearlyTrend 时有值）
  yearlyYears: number[];                 // 年份数组
  yearlyValues: number[];                // 日均客流值数组
}
```

### 4.3 派生规则

| 规则 | 说明 |
|------|------|
| `hasStats = false` | city_assets_index 中 `has_stats === false`，运营指标全部为 null |
| `dailyRidershipWan = null` | `daily_ridership_wan <= 0` 或 `hasStats === false` |
| `operatingMileageKm = null` | `operating_mileage_km <= 0` 或 `hasStats === false` |
| `operatingStations = null` | `operating_stations <= 0` 或 `hasStats === false` |
| `operatingLines = null` | `operating_lines <= 0` 或 `hasStats === false` |
| `ridershipIntensity = null` | `ridership_intensity <= 0` 或 `hasStats === false` |
| `peakRidershipWan = null` | `peak_ridership_wan <= 0` 或 `hasStats === false` |
| `qualityScore = null` | quality_report 中无该城市记录 |
| **禁止** | `null` 绝不能被当作 `0` 参与图表计算 |

---

## 5. 页面结构设计

### 5.1 顶部 Hero

```
┌──────────────────────────────────────────────────────┐
│  城市对比                                              │
│  选择 2-5 个城市，横向比较公开资料整理快照中的           │
│  地铁运营指标与数据完整度。                              │
│                                                        │
│  💡 本页面展示的是项目收录数据完整度与公开资料整理       │
│  结果，非实时运营数据，不构成官方排名。                  │
└──────────────────────────────────────────────────────┘
```

### 5.2 城市选择器

**设计要求**：

| 行为 | 说明 |
|------|------|
| 搜索 | 支持中文名和拼音模糊匹配 |
| 选择上限 | 最多 5 个城市，达到后禁用继续添加 |
| 选择下限 | 至少 2 个城市后才展示完整对比区 |
| 默认推荐 | 从数据中自动选取完整度高且有日客流的前 3 个城市（**不硬编码**） |
| 移除 | 已选城市可单个移除 |
| 排序 | 已选城市按添加顺序排列 |

**默认城市选取算法（待实现阶段确认具体值）**：从 `qualityReport.cities` 中筛选 `quality_level === 'high'` 且 `has_daily_ridership === true` 的城市，取前 3 个。

### 5.3 指标概览卡片

每个已选城市一张卡片，横向排列：

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  北京         │  │  上海         │  │  广州         │
│               │  │               │  │               │
│  日客流 1105.5 │  │  日客流 1020.3 │  │  日客流 850.2  │
│  里程 783 km   │  │  里程 831 km   │  │  里程 621 km   │
│  站点 490 座   │  │  站点 508 座   │  │  站点 342 座   │
│  线路 27 条    │  │  线路 20 条    │  │  线路 16 条    │
│               │  │               │  │               │
│  完整度 95分   │  │  完整度 95分   │  │  完整度 95分   │
│  缺失 0 项    │  │  缺失 0 项    │  │  缺失 0 项    │
└─────────────┘  └─────────────┘  └─────────────┘
```

**缺失值展示规则**：

| 场景 | 展示文案 | 颜色 |
|------|----------|------|
| 无统计记录（hasStats = false） | "暂未收录" | `#64748b` slate |
| 有统计但日客流 = 0 | "暂无日客流展示值" | `#64748b` slate |
| 资源缺失（无线路图等） | "资源收集中" | `#64748b` slate |
| 正常有值 | 数值 + 单位 | `#00d4ff` cyan |

**禁止展示**：`0`、`无`、`错误`、`低质量城市`。

### 5.4 对比图表区

#### 5.4.1 条形图（Must）

横向条形图，支持在以下指标间切换：
- 日客流（万人次）
- 运营里程（km）
- 运营站点（座）
- 运营线路（条）

规则：
- `null` 数据的城市不参与该指标图表
- 图表旁显示提示："部分城市缺少该指标，已从图表中排除"
- 颜色使用 `chartUtils.ts` 中 `COLOR_PALETTE` 已有色板
- 排序按数值降序

#### 5.4.2 雷达图（Should）

多维指标归一化对比，维度包括：
- 日客流
- 运营里程
- 运营站点
- 运营线路
- 客流强度

归一化规则：
- 每个维度按当前已选城市中的最大值归一化为 0-1
- 某维度全部为 null 则该维度不展示
- 雷达图不得将 null 映射为 0；若某维度存在缺失值（部分城市为 null），初版应直接从雷达图维度中排除该维度，或仅在所有已选城市均具备有效值时才展示该维度

#### 5.4.3 年度趋势折线图（Should）

条件：已选城市中有 2 个以上城市有 `yearly_avg_ridership` 数据时展示。

规则：
- 年份轴取所有已选城市年份的并集
- 缺失年份不连线
- 每个城市一条线，颜色来自 `COLOR_PALETTE`
- 无趋势数据的城市不参与图表

### 5.5 数据完整度对比区

基于 `quality_report.json`，每个已选城市展示：

| 字段 | 展示方式 |
|------|----------|
| quality_score | 数值 + 进度条 |
| quality_level | 胶囊标签（完整度高/中/低），颜色沿用现有 DataQualityPage 配色 |
| missing_items | 列表展示 |
| warnings | 列表展示 |
| has_network_map | ✔ / – |
| has_plan_map | ✔ / – |
| cover_status | 文字 |

底部提示文案：**"数据完整度评分仅反映本项目当前收录资料的完整程度，不代表城市地铁运营水平。"**

### 5.6 详细对比表

**桌面端**：标准表格，列 = 城市，行 = 指标

| 指标 | 北京 | 上海 | 广州 |
|------|------|------|------|
| 日客流（万人次） | 1105.5 | 1020.3 | 850.2 |
| 运营里程（km） | 783 | 831 | 621 |
| 运营站点（座） | 490 | 508 | 342 |
| 运营线路（条） | 27 | 20 | 16 |
| 客流强度 | 1.41 | 1.23 | 1.37 |
| 峰值客流（万人次） | 1300.5 | 1200.3 | 1050.1 |
| 年度趋势 | ✔ | ✔ | ✔ |
| 线路图 | ✔ | ✔ | ✔ |
| 规划图 | ✔ | ✔ | ✔ |
| 封面状态 | 已收录 | 已收录 | 已收录 |
| 完整度评分 | 95 | 95 | 95 |
| 缺失项 | — | — | — |

**移动端（375px）**：转为纵向卡片，每个城市一张卡片纵向堆叠，禁止横向溢出。不强制保留宽表格布局。

---

## 6. 交互流程

```
用户进入 /#/compare
        │
        ▼
  URL 解析 ?cities=beijing,shanghai,guangzhou
        │
        ├── 有有效参数 → 直接展示对应城市对比
        │
        └── 无参数 → 自动选取默认 3 个推荐城市
                      │
                      ▼
              ┌─ 城市选择器区域 ─┐
              │  搜索框 + 已选标签  │
              │  [北京 ×] [上海 ×] [广州 ×]  │
              │  最多 5 个 | 至少 2 个 │
              └───────────────────┘
                      │
              已选 < 2 个？
              ├── 是 → 显示引导空状态："请至少选择 2 个城市开始对比"
              └── 否 → 展示完整对比区
                      │
              ┌─── 指标概览卡片 ───┐
              │  [北京] [上海] [广州] │
              └─────────────────────┘
                      │
              ┌─── 对比图表区 ──────┐
              │  条形图（指标切换）    │
              │  雷达图（归一化）      │
              │  趋势图（年度对比）    │
              └─────────────────────┘
                      │
              ┌─── 完整度对比 ──────┐
              │  评分 / 等级 / 缺失  │
              └─────────────────────┘
                      │
              ┌─── 详细对比表 ──────┐
              │  桌面: 表格          │
              │  移动: 纵向卡片       │
              └─────────────────────┘
```

**状态持久化**：URL query 参数 `?cities=beijing,shanghai,guangzhou`。城市增减时实时更新 URL。页面刷新后从 URL 恢复选择。localStorage 缓存为 Could 优先级，初版可不做。

---

## 7. 边界条件

| # | 场景 | 处理方式 |
|---|------|----------|
| 1 | `quality_report.json` 加载失败 | 降级为从 `merged` 数据手算完整度评分（复用 DataQualityPage 降级逻辑） |
| 2 | `metro_stats.json` 加载失败 | 全局错误提示 + 返回 Dashboard / Data Quality 入口 |
| 3 | `city_assets_index.json` 加载失败 | 全局错误提示 + 返回 Dashboard / Data Quality 入口 |
| 4 | 只选 1 个城市 | 显示引导空状态："请至少选择 2 个城市开始对比" |
| 5 | 选满 5 个后继续添加 | 禁用搜索结果中未选城市，显示提示"最多选择 5 个城市" |
| 6 | 选中城市无 stats | 指标卡片全部显示"暂未收录"，图表跳过该城市 |
| 7 | 有 stats 但 `daily_ridership_wan = 0` | 日客流显示"暂无日客流展示值" |
| 8 | 某指标全部为 null | 该图表区域显示"当前所选城市均无该指标数据" |
| 9 | 年度趋势年份不一致 | 年份取并集，缺失年份不画点 |
| 10 | 375px 移动端 | 详细表转为纵向卡片，指标卡片改为纵向堆叠，375px 无横向溢出 |
| 11 | URL 参数城市不存在 | 忽略无效 slug，仅使用有效城市；有效城市不足 2 个时补充默认城市 |
| 12 | URL 参数格式错误 | 忽略，使用默认推荐 |

---

## 8. 文案规范

### 8.1 允许文案

| 文案 | 使用场景 |
|------|----------|
| 公开资料整理快照 | Hero 区、免责声明 |
| 非实时运营数据 | Hero 区、免责声明 |
| 当前项目收录数据 | 指标说明 |
| 数据完整度评分 | 完整度对比区 |
| 收录完整度等级 | 完整度对比区 |
| 暂未收录 | 无统计数据城市 |
| 暂无日客流展示值 | 有统计但日客流 = 0 |
| 资源收集中 | 缺少线路图/规划图 |
| 部分指标缺失，已从图表中排除 | 图表旁提示 |
| 请至少选择 2 个城市开始对比 | 空状态引导 |
| 最多选择 5 个城市 | 达到上限提示 |

### 8.2 禁止文案

| 禁止文案 | 原因 |
|----------|------|
| 官方排名 | 非官方数据 |
| 城市质量排名 | 完整度 ≠ 质量 |
| 地铁质量排名 | 完整度 ≠ 运营质量 |
| 城市发展水平 | 数据不反映发展水平 |
| 最强/最差地铁城市 | 无排名语义 |
| 落后城市 | 无优劣语义 |
| 实时监测 | 非实时数据 |
| 绝对准确 | 数据为历史快照 |

---

## 9. 可访问性与响应式要求

| # | 要求 | 优先级 |
|---|------|--------|
| 1 | 375px 移动端无横向滚动 | Must |
| 2 | 城市选择器支持键盘操作（Tab/Enter/Escape） | Must |
| 3 | 图表必须有文本摘要或表格兜底 | Must |
| 4 | 色彩不能作为唯一信息来源 | Must |
| 5 | 缺失值不能只用符号表示，必须有文字说明 | Must |
| 6 | 页面不能因 quality_report 缺失而白屏 | Must |
| 7 | focus 状态可见 | Should |
| 8 | aria-label 标注关键交互元素 | Should |

---

## 10. 技术方案

### 10.1 预计新增文件（OpenSpec 阶段不创建）

| 文件 | 职责 |
|------|------|
| `frontend/src/pages/ComparePage.tsx` | 对比页面主组件 |
| `frontend/src/components/compare/CityCompareSelector.tsx` | 城市选择器（搜索 + 已选标签 + 上限控制） |
| `frontend/src/components/compare/CompareMetricCards.tsx` | 指标概览卡片 |
| `frontend/src/components/compare/CompareCharts.tsx` | 条形图 + 雷达图 + 趋势图 |
| `frontend/src/components/compare/CompareQualitySection.tsx` | 完整度对比区 |
| `frontend/src/components/compare/CompareTable.tsx` | 详细对比表（桌面表格/移动卡片） |
| `frontend/src/components/compare/CompareEmptyState.tsx` | 空状态与引导 |
| `frontend/src/hooks/useCompareCities.ts` | 派生数据计算 + URL 参数同步 |

### 10.2 预计修改文件（OpenSpec 阶段不修改）

| 文件 | 修改内容 |
|------|----------|
| `frontend/src/routes.tsx` | 新增 `<Route path="/compare" element={<ComparePage />} />` |
| `frontend/src/components/layout/Header.tsx` | NAV_ITEMS 增加城市对比导航项 |
| `frontend/src/types/metro.ts` | 新增 `ComparableCity` 类型定义 |
| `frontend/scripts/acceptance-react.cjs` | 新增 T32 / T33 / T34 |
| `frontend/scripts/smoke-pages.cjs` | 新增 `/#/compare` 冒烟验证 |

### 10.3 技术原则

1. **复用 `useMetroData`**：通过 `merged`、`qualityReport`、`manifest` 直接获取数据，不重复请求
2. **复用 `chartUtils.ts` 色板**：`COLOR_PALETTE`、`AXIS_LABEL_STYLE` 等
3. **复用 `useEChart` hook**：ECharts 图表渲染
4. **不引入新状态管理库**：用 React useState + URL 参数管理选择状态
5. **不新增后端或数据文件**
6. **不修改 `dashboard.html`**
7. **复用 `withBaseUrl`**：处理 GitHub Pages 子路径

---

## 11. 派生数据算法

### 11.1 伪代码

```typescript
function buildComparableCities(
  merged: MergedCity[],
  qualityReport: QualityReport | null
): ComparableCity[] {
  // 1. 建立 qualityReport 索引
  const qualityMap = new Map<string, QualityReportCity>();
  if (qualityReport?.cities) {
    for (const qc of qualityReport.cities) {
      qualityMap.set(qc.city, qc);
    }
  }

  // 2. 以 merged (50 城) 为基准
  return merged.map((m) => {
    const qc = qualityMap.get(m.city) || null;
    const hasStats = m.has_stats;

    return {
      city: m.city,
      city_cn: m.city_cn,
      hasStats,

      // 指标：<= 0 或无 stats 则为 null
      dailyRidershipWan: hasStats && m.daily_ridership_wan > 0
        ? m.daily_ridership_wan : null,
      operatingMileageKm: hasStats && m.operating_mileage_km > 0
        ? m.operating_mileage_km : null,
      operatingStations: hasStats && m.operating_stations > 0
        ? m.operating_stations : null,
      operatingLines: hasStats && m.operating_lines > 0
        ? m.operating_lines : null,
      ridershipIntensity: hasStats && m.ridership_intensity > 0
        ? m.ridership_intensity : null,
      peakRidershipWan: hasStats && m.peak_ridership_wan > 0
        ? m.peak_ridership_wan : null,

      // 资源状态
      hasYearlyTrend: m.has_yearly_trend,
      hasNetworkMap: m.has_network_map,
      hasPlanMap: m.has_plan_map,
      coverStatus: m.cover_status,

      // 完整度
      qualityScore: qc?.quality_score ?? null,
      qualityLevel: qc?.quality_level ?? null,
      missingItems: qc?.missing_items ?? [],
      warnings: qc?.warnings ?? [],

      // 年度趋势
      yearlyYears: m.stats?.yearly_avg_ridership?.years ?? [],
      yearlyValues: m.stats?.yearly_avg_ridership?.values ?? [],
    };
  });
}
```

### 11.2 归一化规则（雷达图）

```
对每个指标维度 D:
  max = max(所有已选城市中 D 的非 null 值)
  若 max = 0 或所有城市 D 为 null: 跳过该维度
  否则: 每个城市的归一化值 = D / max
```

---

## 12. 测试计划

### T32：Compare 页面基础加载

| 断言项 | 期望 |
|--------|------|
| 访问 `/#/compare` | 页面可访问，无白屏 |
| 页面包含 "城市对比" | h1 标题 |
| 页面包含 "公开资料整理快照" 或 "非实时运营数据" | 免责声明存在 |
| 默认至少展示 2 个城市 | URL 或卡片 |
| 控制台无 JS exception | 0 critical errors |

### T33：Compare 城市选择与指标展示

| 断言项 | 期望 |
|--------|------|
| 城市选择器存在 | 搜索框或已选标签区域 |
| 可添加或切换城市 | 搜索结果可点击 |
| 达到 5 个城市时有上限提示 | 禁用态或提示文案 |
| 页面展示日客流、运营里程、站点数、完整度评分 | 至少 4 个指标可见 |
| 缺失值显示 "暂未收录" 或 "暂无日客流展示值" | 选择缺数据城市验证 |
| 不出现 "官方排名" / "城市质量排名" | 文案扫描 |

### T34：Compare 移动端无横向溢出

| 断言项 | 期望 |
|--------|------|
| 375px viewport | `/#/compare` |
| 无横向溢出 | `scrollWidth <= innerWidth` |
| 对比表转为卡片或可读布局 | 无宽表格溢出 |
| 控制台无 critical error | 0 critical errors |

---

## 13. 线上 smoke 计划

### 13.1 新增 smoke 测试项

`smoke-pages.cjs` 新增：

```javascript
// City Compare Page
{ name: 'City Compare', path: '#/compare' }
```

断言：
- 页面包含 "城市对比"
- 页面包含 "非实时运营数据" 或 "公开资料整理快照"
- 页面包含 "数据完整度评分"
- 页面至少包含 2 个城市名

### 13.2 必须保留的已有 smoke

- Dashboard（含 DataSnapshotCard 校验）
- Cities List
- About Page
- Foshan Page（含 CityDataCompleteness 校验）
- Taiyuan Page（含 CityDataCompleteness 校验）
- Data Quality Center（含口径校验）
- Non-Hash Redirect
- Xiamen Map Load
- Console Health Validation
- Resource 404 Filter

---

## 14. 实施提交建议

Phase 8 实现阶段建议拆为 **3 个提交**：

| 提交 | 范围 | 说明 |
|------|------|------|
| 提交 1 | 核心功能 | ComparePage + 子组件 + 路由/导航注册 + useCompareCities + 类型定义 |
| 提交 2 | 验收扩展 | acceptance-react.cjs T32/T33/T34 + smoke-pages.cjs compare 路由 |
| 提交 3 | 文档更新 | FRONTEND_ACCEPTANCE.md + REACT_DEPLOYMENT.md + ROADMAP + CHANGELOG |

每个提交推送后必须等待 CI 全绿再进行下一个。

---

## 15. 验收标准

Phase 8 最终完成标准：

| # | 标准 | 验证方式 |
|---|------|----------|
| 1 | `/#/compare` 可访问 | test:ui T32 |
| 2 | 支持 2-5 城市对比 | test:ui T33 |
| 3 | 缺失数据不被当作 0 | test:ui T33 缺失值断言 |
| 4 | 不使用官方排名或城市发展水平评价文案 | test:ui T33 文案扫描 |
| 5 | 图表、卡片、表格均正确展示 | test:ui T33 |
| 6 | 375px 无横向溢出 | test:ui T34 |
| 7 | T32 / T33 / T34 加入并通过 | test:ui 全部 |
| 8 | smoke 覆盖 `/#/compare` | test:pages |
| 9 | `dashboard.html` 未修改 | git diff |
| 10 | `data/latest`、`cities`、`assets` 未修改 | git diff |
| 11 | CI/CD 与 Pages smoke 全绿 | GitHub Actions |
