# 项目路线图

> 项目：全国城市地铁客流数据可视化大屏
> 版本：v1.2.0-dev
> 日期：2026-05-09
> 仓库：threeMoreTime/MAP

---

## 当前状态

- 版本：v1.1.0
- 当前阶段：Phase 3.5 - Dashboard 视觉重设计与结构重构（已完成）+ 目录结构优化（已完成）
- 浏览器验收：16/16 PASS
- 数据覆盖：全国主要城市地铁客流数据

---

## Phase 1：文档基线建设（已完成）

**目标**：建立完整的项目文档体系，为后续迭代提供基线。

**产物**：
- [x] `docs/TESTING_ACCEPTANCE.md` - 验收测试文档
- [x] `docs/RELEASE_PROCESS.md` - 发布流程文档
- [x] `docs/ROADMAP.md` - 项目路线图
- [x] `docs/KNOWN_ISSUES.md` - 已知问题清单
- [x] `.github/PULL_REQUEST_TEMPLATE.md` - PR 模板

---

## Phase 2：数据结构标准化（已完成）

**目标**：统一数据格式，建立数据校验机制。

**产物**：
- [x] `data/latest/metro_stats.json` — 汇总 34 城市客流数据
- [x] `data/latest/city_assets_index.json` — 索引 50 城市资源文件
- [x] `data/latest/manifest.json` — 数据层整体统计
- [x] `data/schema/metro_stats.schema.json` — JSON Schema 定义
- [x] `scripts/build_data_index.py` — 数据索引构建脚本
- [x] `scripts/validate_data.py` — 数据校验脚本

---

## Phase 3：自动化验收脚本（已完成）

**目标**：将浏览器测试正式化，集成到开发流程。

**产物**：
- [x] `scripts/acceptance_dashboard.js` — puppeteer-core 浏览器验收（16 项）
- [x] `scripts/check_dashboard_syntax.py` — Dashboard JS 语法检查
- [x] `scripts/run_acceptance.py` — 总验收入口（4 步串行）
- [x] `package.json` — npm scripts 集成（test:data / test:dashboard / test:acceptance）

---

## Phase 3.5：Dashboard 视觉重设计与结构重构（已完成）

**目标**：参考 Readdy UI 设计，全面重构 Dashboard 的视觉风格和页面结构。

**产物**：
- [x] 全新 CSS 配色方案（#060e1a 深蓝背景 + #00d4ff 青色主色调）
- [x] Sticky 导航栏、Hero 平台介绍区、玻璃拟态指标卡片
- [x] 城市资源网格区、数据说明区、增强页脚
- [x] 新增 `updateCityResourceGrid()` JS 函数，搜索联动
- [x] 保留全部 DOM ID 和业务逻辑，验收测试 16/16 PASS

---

## 目录结构优化（已完成）

**目标**：优化项目目录结构，将城市目录和脚本分类归整。

**产物**：
- [x] 50 个城市目录收归至 `cities/`
- [x] 爬虫脚本整理至 `scrapers/`
- [x] 生成产物输出至 `output/`
- [x] 更新所有脚本和文档中的路径引用

---

## 目录结构优化（已完成）

**目标**：优化项目目录结构，将城市目录和脚本分类归整。

**产物**：
- [x] 50 个城市目录收归至 `cities/`
- [x] 爬虫脚本整理至 `scrapers/`
- [x] 生成产物输出至 `output/`
- [x] 更新所有脚本和文档中的路径引用

---

## Phase 4：React 前端迁移（进行中）

**目标**：将单文件 dashboard.html 迁移为 React + TypeScript + Vite 前端项目。

**Phase 4.1：脚手架与 UI 骨架（已完成）**
- [x] 创建 `frontend/` React 项目（Vite + React + TypeScript）
- [x] 实现 HashRouter 三页路由（/dashboard, /cities, /about）
- [x] 数据同步脚本 `scripts/sync-data.cjs`
- [x] 数据加载层（useMetroData, useDashboardFilters）
- [x] DashboardPage 骨架（统计卡片 + 筛选 + 图表占位）
- [x] CitiesPage 城市总览（50 城卡片网格 + 筛选标签）
- [x] AboutPage 数据说明页
- [x] 全局深蓝主题样式
- [x] `npm run typecheck` 和 `npm run build` 通过

**Phase 4.2：ECharts 图表迁移（已完成）**
- [x] MetroMapChart 地图散点迁移（GeoJSON 本地优先 + 远程 fallback + 降级列表）
- [x] RankChart 排行榜迁移（支持四项指标切换、topN 筛选）
- [x] TrendChart 趋势图迁移（统一年份轴 + null 对齐）
- [x] IntensityChart 客流强度迁移
- [x] MileageChart 里程排行迁移（不排除无客流城市）
- [x] 城市详情面板 CityDetailPanel
- [x] useEChart Hook（原生 echarts，ResizeObserver，StrictMode 兼容）
- [x] withBaseUrl 提取到 utils/path.ts
- [x] MergedCity 补充 lines_under_construction, peak_ridership_wan, peak_ridership_date 字段
- [x] 响应式布局（chart-map-row, chart-grid-2col, 移动端单列）
- [x] chartUtils.ts 共享颜色、样式常量
- [x] `npm run typecheck` 通过
- [x] `npm run build` 通过
- [x] `python scripts/run_acceptance.py` 16/16 PASS

**Phase 4.3：浏览器验收 + 构建优化 + 交互稳定性（已完成）**
- [x] 创建 `frontend/scripts/acceptance-react.cjs` 浏览器验收脚本（T01-T15）
- [x] 新增 `npm run test:ui` 命令
- [x] ECharts manualChunks 构建优化（echarts + vendor 分包）
- [x] 创建 `docs/FRONTEND_ACCEPTANCE.md` 验收文档
- [x] 更新 `docs/REACT_MIGRATION_PLAN.md` Phase 4.3 状态
- [x] `npm run typecheck` 通过
- [x] `npm run build` 通过
- [x] `npm run test:ui` 通过
- [x] `python scripts/run_acceptance.py` 16/16 PASS

**Phase 4.3.1：验收脚本依赖与端口处理修复（已完成）**
- [x] `puppeteer-core` 加入 `frontend/devDependencies`，验收脚本自洽
- [x] Preview 服务器改用 `--strictPort`，端口递增 4173-4177
- [x] T10 地图点击详情从自动 PASS 改为 MANUAL 状态
- [x] 验收结果区分 PASS / FAIL / MANUAL / SKIP 四种状态
- [x] 更新验收文档和迁移计划
- [x] `npm run typecheck` 通过
- [x] `npm run build` 通过
- [x] `npm run test:ui` 通过（T10 为 MANUAL）
- [x] `python scripts/run_acceptance.py` 16/16 PASS

**验收标准**：
- `dashboard.html` 不受影响，保留为稳定基线
- `npm run typecheck` 通过
- `npm run build` 通过
- 三页路由可正常访问
- 旧版 `python scripts/run_acceptance.py` 继续通过

**Phase 4.4：React 前端 UI 细节打磨与响应式优化（已完成）**
- [x] 全局样式统一（CSS 变量、card-glass 基类、focus 状态）
- [x] Dashboard Hero 区轻量状态标签、StatCard grid 布局
- [x] FilterToolbar 统一 filter-input 样式和 aria-label
- [x] CitiesPage 城市卡片增加线路图/规划图标签、空状态
- [x] AboutPage 统一卡片样式
- [x] Footer 4 列布局移动端折叠
- [x] 响应式断点统一（1200 / 900 / 600px）
- [x] 375px 移动端无横向溢出
- [x] `npm run typecheck` 通过
- [x] `npm run build` 通过
- [x] `npm run test:ui` 通过（14 PASS / 0 FAIL / 1 MANUAL）
- [x] `python scripts/run_acceptance.py` 16/16 PASS

**Phase 4.5：城市资源页 Masonry 瀑布流与卡片精细还原（已完成）**
- [x] CSS columns Masonry 瀑布流布局（1/2/3/4 列响应式）
- [x] 城市卡片封面区 CSS 渐变 + radial-gradient、tall 交错高度
- [x] 封面底部渐变遮罩、城市名/线路信息浮层、数据可用性徽章
- [x] 三列核心指标（运营里程/日客流/客流强度）
- [x] 三个资源状态标签（线路图/规划图/客流数据）
- [x] Hover 动效：卡片上浮 + 边框高亮 + 封面缩放 + 箭头浮现
- [x] 毛玻璃搜索筛选栏（搜索图标、清空按钮、胶囊标签组、图例）
- [x] 空状态 glass-card（图标 + 标题 + 提示）
- [x] theme.css 补充语义颜色变量（navy/cyan/emerald/amber/slate）
- [x] `npm run typecheck` 通过
- [x] `npm run build` 通过
- [x] `npm run test:ui` 通过（14 PASS / 0 FAIL / 1 MANUAL）
- [x] `python scripts/run_acceptance.py` 16/16 PASS

**Phase 4.6：城市详情页 /city/:id（已完成）**
- [x] 新增 /city/:id 路由（CityDetailPage）
- [x] CitiesPage 城市卡片点击导航（useNavigate + aria-label + 键盘支持）
- [x] 面包屑导航（返回按钮 + 城市名）
- [x] 6 统计卡片网格（运营线路/站点/里程/日客流/客流强度/峰值客流）
- [x] 年度客流趋势面积图（ECharts + cyan 渐变填充）
- [x] 资源预览 Tab（线路图/规划图 placeholder）
- [x] 数据说明手风琴（可折叠 + 无数据警告）
- [x] 城市不存在 404 状态
- [x] EmptyState 通用空状态组件
- [x] `npm run typecheck` 通过
- [x] `npm run build` 通过
- [x] `npm run test:ui` 通过（18 PASS / 0 FAIL / 1 MANUAL）
- [x] `python scripts/run_acceptance.py` 16/16 PASS

**Phase 4.7：城市卡片封面图片本地化（已完成）**
- [x] 创建 `scrapers/scrape_city_covers.py`（Wikimedia Commons/Wikidata 采集脚本）
- [x] 支持 --limit / --city / --force 参数
- [x] 仅接受 CC0/CC BY/CC BY-SA 许可证图片
- [x] 转换为 webp（800px 宽，quality 80）
- [x] `assets/city-covers/manifest.json` 记录完整溯源（source_url, license, author, attribution）
- [x] `frontend/scripts/sync-data.cjs` 增加 city-covers 同步
- [x] CitiesPage 使用 CSS backgroundImage 叠加（图片 + 渐变回退）
- [x] `check-static-build.cjs` 增加 T08 可选检查
- [x] `.gitignore` 排除 `frontend/public/assets/city-covers/`
- [x] `docs/CITY_COVER_IMAGES.md` 文档
- [x] 46/50 城市有封面图片（4 个 fallback 城市：成都、重庆、高雄、台北）
- [x] 总计约 2.5MB（远低于 15MB 限制）
- [x] `npm run typecheck` 通过
- [x] `npm run build` 通过
- [x] `npm run test:ui` 通过
- [x] `python scripts/run_acceptance.py` 16/16 PASS

**Phase 4.7.1：八城补全与候选审核（已完成）**
- [x] 增加精确搜索关键词（每个城市定制）
- [x] 增加错误地名过滤（福州排除 Taipei、昆明排除 Kunming Lake、徐州排除 Zhengzhou）
- [x] 增加宽高比过滤（`width/height >= 1.2`）
- [x] 增加候选重试机制（最佳候选下载失败时自动尝试下一个）
- [x] 支持 `--dry-run` 模式便于人工审核
- [x] 7/8 城市成功补全（成都、重庆、高雄、台北、福州、昆明、徐州）
- [x] 呼和浩特仍为 fallback（无合适横向 CC 图片）
- [x] 最终 49/50 城市有封面图片

---

## Phase 5：Dashboard 数据外置

**目标**：将嵌入在 HTML 中的 DATA 对象分离为独立 JSON 文件。

**产物**：
- [ ] 独立的城市数据 JSON 文件（`data/metro_data.json`）
- [ ] 修改 dashboard.html 通过 fetch 加载外部数据
- [ ] 数据加载失败的降级处理（友好提示）
- [ ] 加载性能优化（缓存、压缩）

**验收标准**：
- dashboard.html 中不再包含硬编码 DATA 对象
- 页面可正常加载外部 JSON 数据
- 网络异常时显示友好的错误提示
- 页面加载性能不低于当前水平

---

## Phase 5：GitHub Pages 发布

**目标**：通过 GitHub Pages 提供在线访问。

**产物**：
- [ ] GitHub Pages 配置（从 main 分支的根目录发布）
- [ ] 自定义 404 页面
- [ ] 在线 Demo 地址可正常访问
- [ ] README 中添加在线访问链接

**验收标准**：
- `https://threemoretime.github.io/MAP/dashboard.html` 可正常访问
- 地图、图表、搜索等所有功能正常
- 移动端访问布局正常
- 页面加载时间 < 5 秒

---

## Phase 6：增量更新与定期采集

**目标**：实现数据自动采集和定期更新。

**产物**：
- [ ] GitHub Actions 定时任务（Cron）
- [ ] 自动数据采集 + 提交工作流
- [ ] 数据变更检测（仅在有变化时提交）
- [ ] 更新失败的通知机制

**验收标准**：
- GitHub Actions 按计划自动执行数据采集
- 新数据自动提交到仓库并打 Tag
- 无数据变化时不产生空提交
- 采集失败时可通过 GitHub Notification 获知

---

## Phase 7：城市详情页增强

**目标**：为每个城市生成独立的详情页面。

**产物**：
- [ ] 城市详情页模板（单城市 HTML）
- [ ] 详情页生成脚本 `generate_city_pages.py`
- [ ] 详情页包含：客流趋势图、线路信息、历史对比
- [ ] Dashboard 中城市气泡点击跳转到详情页

**验收标准**：
- 每个有数据的城市均有独立的详情页
- 详情页数据与 Dashboard 一致
- 详情页在移动端可正常浏览
- 详情页之间可通过导航切换

---

## 时间线（预估）

| 阶段 | 内容 | 预估工期 | 依赖 |
|------|------|----------|------|
| Phase 1 | 文档基线建设 | 已完成 | 无 |
| Phase 2 | 数据结构标准化 | 已完成 | Phase 1 |
| Phase 3 | 自动化验收脚本 | 已完成 | Phase 1 |
| 目录优化 | 项目结构重组 | 已完成 | Phase 2, 3 |
| Phase 4 | 数据外置 | 3 天 | Phase 2 |
| Phase 5 | GitHub Pages 发布 | 1 天 | Phase 4 |
| Phase 6 | 增量更新与定期采集 | 1 周 | Phase 3, 5 |
| Phase 7 | 城市详情页增强 | 2 周 | Phase 4, 5 |

---

## 备注

本路线图为规划性文档，实际执行顺序和工期可能根据项目需求调整。每个阶段开始前应在 Issue 中详细讨论具体实施方案。
