# 更新日志

本文件记录项目的所有重要变更。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/)。

## [v2.0.0-dev] - 2026-08-14

### 全仓重构（P0-P5）

#### 退役与清理
- **Legacy dashboard.html 正式退役删除**（owner 授权推翻冻结政策）：连同 legacy 验收脚本、CI legacy-check job、LEGACY_DASHBOARD_POLICY.md 一并移除；CI 改造为 data-check（保留数据层校验防线）。
- 清理被放弃的 pipeline/__pycache__ 残骸；manifest 移除 dashboard_file 字段。

#### 工程质量
- **ESLint 10 flat config 接入**，修复 14 处违规，含 3 处真实的条件式 Hook 调用缺陷（CompareCharts×2、CityDetailPanel）与 1 处悬停触发的 tooltip 数组参数崩溃。
- **Vitest + Testing Library 接入**，13 个 hooks/工具单测；CI react-check 增加 lint + 单测步骤。
- CSS Modules 全部废除（~1250 行 + globals.css 990→60 行），统一 Tailwind v4。

#### 性能
- **ECharts 按需引入**（src/lib/echarts.ts 中央注册）：echarts chunk 1035KB → 567KB（-45%，gzip 343→189KB）。
- **路由懒加载**（React.lazy + Suspense）：首屏 index chunk 108KB → 6.5KB，六页各自分包。

#### 视觉（纸墨 · 朱印）
- 浅色纸墨编辑部风全量换装：米白纸底、墨色排印、朱砂红唯一强调、宋体衬线标题（子集化 Noto Serif SC 299KB woff2，OFL）。
- ECharts 墨阶调色板 + 朱砂高亮（榜首/Top10/当前系列），纸面 tooltip。
- 设计契约落地于 frontend/DESIGN.md + tokens.css。

#### 数据管线
- **pipeline/ Python 包重建**（processors/validators/CLI），与旧脚本 parity 对照逐字节一致后删除旧脚本；18 个 pytest 单测；CI data-check 增加 pytest。
- **PNG → WebP 优化**（q85 仅在更小时替换）：46 张转换 10.5→8.3MB；sync 镜像清理。
- run_data_update.py 去除 CITIES_DIR monkey-patch，修复 write 分支 NameError。

#### 验证基线
- 浏览器验收 T01-T34：33 PASS / 0 FAIL / 1 MANUAL；前端单测、pipeline pytest、数据校验、typecheck、lint 全绿。

---

## [v1.2.2-dev] - 2026-05-29

### 已完成 (Phase 8 城市对比功能)

#### 新功能
- **新增 /#/compare 城市对比页面**：支持 2-5 城市横向对比，URL 参数 `?cities=...` 保存选择状态。
- **城市选择器**：支持中文名/拼音搜索，键盘操作，默认自动选取完整度高且有日客流的前 3 个城市。
- **指标概览卡片**：每个城市展示日客流、运营里程、站点数、线路数、完整度评分，缺失值中性展示。
- **对比图表**：条形图（6 指标切换）、雷达图（多维归一化）、年度趋势折线图，null 数据不参与计算。
- **数据完整度对比区**：评分进度条、等级标签、资源状态、缺失项展示。
- **详细对比表**：桌面端表格 / 移动端纵向卡片自适应。
- **新增验收测试 T32/T33/T34**：基础加载、城市选择与指标、375px 移动端无溢出。
- **线上 smoke 覆盖 /#/compare**。

---

## [v1.2.2-dev] - 2026-05-28

### 已完成 (Phase 7.1 工作区清理与视觉变更收口)

#### 视觉优化
- **统一图表色板**：移除 rose/pink 色系，精简为 16 色色板，轴标签色统一为 slate-400。
- **线路图查看器视觉打磨**：容器溢出裁剪、圆角、轻微压暗白底 PNG 以适配深色主题。
- **数据质量页面语义色修正**：缺失项从红叉（✘ rose）改为中性横杠（– slate），消除"缺失=错误"的视觉误导。

#### 文档治理
- **Phase 6 状态纠偏**：修正 ROADMAP.md 与 NEXT_ROADMAP_PLAN.md 中 Phase 6 状态为"已完成远端 dry-run 验证"。
- **output/ 目录加入 .gitignore**：防止临时产物被提交。

---

## [v1.2.2-dev] - 2026-05-22

### 已完成 (Phase 5.7 旧版 dashboard.html 维护策略落纸)

#### 文档治理
- **明确冻结基线定位**：新增 [LEGACY_DASHBOARD_POLICY.md](docs/LEGACY_DASHBOARD_POLICY.md)，正式将 `dashboard.html` 冷冻为 **Frozen Baseline / Legacy Fallback**，规定其不再承接任何新功能开发。
- **发布与回归校验规范化**：修改 `RELEASE_PROCESS.md` 与 `README.md`，规范了双前端发布流程，固化了 `npm run test:data` 和 `npm run test:acceptance` 自动回归防线的“零妥协”阻断原则。
- **文档导航更新**：在 `docs/INDEX.md` 中补充导航索引，并在 `ROADMAP.md` 及 `NEXT_ROADMAP_PLAN.md` 中合规将 Phase 5.7 状态合拢归档。

---

## [v1.2.1-dev] - 2026-05-22

### 已完成 (Phase 5.6.1 数据覆盖口径文案统一)

- **数据覆盖口径统一**：在 Dashboard 的 `DataSnapshotCard` 和 `AboutPage` 页面中，将数据覆盖统计口径统一为 50 城索引、34 城有统计记录、23 城有日客流展示值、27 城暂无日客流展示值（含 16 城完全无统计 + 11 城有统计无客流）、48 城线路图覆盖、41 城规划图覆盖、49/50 封面图覆盖。
- **清除时序与实时性误导文案**：全面清除“实时数据”、“官方认证”等误导性表述，统一为“公开数据快照”、“非实时运营数据”、“基于当前快照动态计算”。
- **测试断言增强**：增强 `acceptance-react.cjs` 中的 `T26` 与 `T28`，增加对 9 大标准口径的硬校验和免责声明关键词校验；升级 `smoke-pages.cjs` 线上冒烟测试，增加对新口径的轻量级检查。

---

## [v1.2.0-dev] - 2026-05-21

### 已完成 (Phase 5.6 线上体验与数据可信度优化)

- **新增 Dashboard 城市数据快照 (DataSnapshotCard)**：大屏顶部新增动态统计卡片，实时渲染已索引城市、客流有无、图表完整性及实景封面图的覆盖统计。
- **新增城市详情页缺失状态人性化解释面板 (CityDataCompleteness)**：在城市详情页新增大段真诚、严谨的缺失原因解释，对无客流、图表缺失、封面回退等边界状态提供体验更好的文字解说，同时精细保留版权、作者等溯源信息。
- **About 页面动态覆盖率统计**：将数据覆盖率、封面图、线路/规划图覆盖率指标全部转化为基于 `useMetroData` 的 `manifest` 动态实时统计，极大增强了 About 页面的数据自恰与大屏可信度。
- **新增 Cities 页资源精细筛选**：在城市资源总览页新增 "resourceComplete"（资源完整：有客流、线路图、规划图且日客流 > 0）和 "resourceMissing"（资源缺失）两个大类科技风胶囊筛选。
- **封面清单请求鲁棒性优化**：对 covers manifest 数据拉取实现优雅 `catch` 降级，防阻塞主数据加载。
- **本地与线上冒烟测试闭环**：`test:pages` 支持平滑切换 local preview 和 pages 线上环境校验，测试全面通过。
- **双 Commit 拆分提交规程**：严格限制代码与文档的隔离，实现自动部署与验证闭环。

---

## [v1.1.0] - 2026-05-08

### 变更

- 项目目录结构全面优化
- 50 个城市目录从根目录收归至 `cities/` 子目录
- 爬虫脚本（`scrape_metrodb.py`、`generate_charts.py`）移至 `scrapers/` 目录
- 生成产物（`national_comparison.png`、`overview_dashboard.png`）输出至 `output/` 目录
- 更新所有脚本中的路径引用（`build_data_index.py`、`scrape_metrodb.py`、`generate_charts.py`）
- 更新 `package.json`，新增 `scrape:*` 和 `generate:*` npm scripts
- 更新全部项目文档中的路径引用（11 篇）
- 更新 `.gitignore`，适配新的日志文件路径

### 影响范围

| 变更项 | 说明 |
|--------|------|
| `cities/` | 50 个城市目录统一存放 |
| `scrapers/` | 数据采集与图表生成脚本 |
| `output/` | 生成产物（截图、对比图） |
| `scripts/` | 构建/校验/验收脚本（不变） |
| `data/` | 统一数据层（不变） |
| `docs/` | 项目文档（不变） |

---

## [v1.0.0] - 2026-05-05

### 已完成

- 完成 48 个城市地铁线网图与规划图的爬取存储（`scrape_all_cities.py`）
- 完成 34 个城市 MetroDB 客流数据的采集（`scrape_metrodb.py`）
- 完成各城市统计 JSON 与年度趋势图表的生成（`generate_charts.py`）
- 完成自包含可视化大屏 `dashboard.html`（~49KB，零外部依赖）
- 集成 ECharts 中国地图散点、城市排名柱状图、年度趋势折线图
- 支持搜索筛选、响应式移动端适配、离线运行

### 提交记录

| 提交哈希 | 说明 |
|----------|------|
| `79d4e71` | feat: 全国48城市地铁客流数据可视化大屏 |
| `df63e19` | chore: 忽略爬取运行日志 |

### 浏览器验证

全部 16 项功能测试通过：

| 序号 | 测试项 | 结果 |
|------|--------|------|
| 1 | 页面加载 | PASS |
| 2 | 中国地图散点渲染 | PASS |
| 3 | 城市散点点击交互 | PASS |
| 4 | 城市排名柱状图 | PASS |
| 5 | 年度趋势折线图 | PASS |
| 6 | 搜索筛选功能 | PASS |
| 7 | 城市数据面板展示 | PASS |
| 8 | 线网图加载 | PASS |
| 9 | 规划图加载 | PASS |
| 10 | 移动端响应式布局 | PASS |
| 11 | 离线运行 | PASS |
| 12 | 图表动画效果 | PASS |
| 13 | 数据统计准确性 | PASS |
| 14 | 多城市切换 | PASS |
| 15 | 页面性能 | PASS |
| 16 | 控制台无报错 | PASS |

**结果：16/16 PASS**
