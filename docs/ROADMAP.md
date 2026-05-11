# 项目路线图

> 项目：全国城市地铁客流数据可视化大屏
> 版本：v1.2.0-dev
> 日期：2026-05-10
> 仓库：threeMoreTime/MAP

---

## 当前状态

- 版本：v1.2.0-dev
- 当前阶段：Phase 5.4 已完成，准备进入 Phase 5.1 CI 与 Pages 手动部署
- 当前前端形态：
  - 旧版：`dashboard.html` 单文件稳定基线（frozen baseline / legacy fallback）
  - 新版：`frontend/` React + Vite + TypeScript
- React 路由表：
  - `/#/dashboard` — 数据总览大屏
  - `/#/cities` — 城市资源总览
  - `/#/city/:id` — 城市详情页
  - `/#/about` — 数据说明
- 当前验收矩阵：

| 验收体系 | 范围 | 结果 |
|----------|------|------|
| React `test:ui` | T01-T24 | **23 PASS / 0 FAIL / 1 MANUAL** |
| `check:static` | T01-T09 | **全部通过** |
| Legacy `run_acceptance.py` | 16 项浏览器测试 | **16/16 PASS** |

- 数据覆盖：50 城市索引、34 城市客流数据、49/50 封面图（hohhot fallback）、48 线路图、41 规划图
- 资源同步：`scripts/sync-data.cjs` 自动将 `data/latest/`、`assets/china.json`、`assets/city-covers/`、`cities/` 图片同步到 `frontend/public/`

---

## 已完成阶段

### Phase 1：文档基线建设（已完成）

**目标**：建立完整的项目文档体系，为后续迭代提供基线。

**产物**：
- [x] `docs/TESTING_ACCEPTANCE.md` - 验收测试文档
- [x] `docs/RELEASE_PROCESS.md` - 发布流程文档
- [x] `docs/ROADMAP.md` - 项目路线图
- [x] `docs/KNOWN_ISSUES.md` - 已知问题清单
- [x] `.github/PULL_REQUEST_TEMPLATE.md` - PR 模板

---

### Phase 2：数据结构标准化（已完成）

**目标**：统一数据格式，建立数据校验机制。

**产物**：
- [x] `data/latest/metro_stats.json` — 汇总 34 城市客流数据
- [x] `data/latest/city_assets_index.json` — 索引 50 城市资源文件
- [x] `data/latest/manifest.json` — 数据层整体统计
- [x] `data/schema/metro_stats.schema.json` — JSON Schema 定义
- [x] `scripts/build_data_index.py` — 数据索引构建脚本
- [x] `scripts/validate_data.py` — 数据校验脚本

---

### Phase 3：自动化验收脚本（已完成）

**目标**：将浏览器测试正式化，集成到开发流程。

**产物**：
- [x] `scripts/acceptance_dashboard.js` — puppeteer-core 浏览器验收（16 项）
- [x] `scripts/check_dashboard_syntax.py` — Dashboard JS 语法检查
- [x] `scripts/run_acceptance.py` — 总验收入口（4 步串行）
- [x] `package.json` — npm scripts 集成（test:data / test:dashboard / test:acceptance）

---

### Phase 3.5：Dashboard 视觉重设计与结构重构（已完成）

**目标**：参考 Readdy UI 设计，全面重构 Dashboard 的视觉风格和页面结构。

**产物**：
- [x] 全新 CSS 配色方案（#060e1a 深蓝背景 + #00d4ff 青色主色调）
- [x] Sticky 导航栏、Hero 平台介绍区、玻璃拟态指标卡片
- [x] 城市资源网格区、数据说明区、增强页脚
- [x] 新增 `updateCityResourceGrid()` JS 函数，搜索联动
- [x] 保留全部 DOM ID 和业务逻辑，验收测试 16/16 PASS

---

### 目录结构优化（已完成）

**目标**：优化项目目录结构，将城市目录和脚本分类归整。

**产物**：
- [x] 50 个城市目录收归至 `cities/`
- [x] 爬虫脚本整理至 `scrapers/`
- [x] 生成产物输出至 `output/`
- [x] 更新所有脚本和文档中的路径引用

---

## Phase 4：React 前端迁移（已完成）

**目标**：将单文件 dashboard.html 迁移为 React + TypeScript + Vite 前端项目。

### Phase 4.1：脚手架与 UI 骨架（已完成）
- [x] 创建 `frontend/` React 项目（Vite + React + TypeScript）
- [x] 实现 HashRouter 三页路由（/dashboard, /cities, /about）
- [x] 数据同步脚本 `scripts/sync-data.cjs`
- [x] 数据加载层（useMetroData, useDashboardFilters）
- [x] DashboardPage 骨架（统计卡片 + 筛选 + 图表占位）
- [x] CitiesPage 城市总览（50 城卡片网格 + 筛选标签）
- [x] AboutPage 数据说明页
- [x] 全局深蓝主题样式
- [x] `npm run typecheck` 和 `npm run build` 通过

### Phase 4.2：ECharts 图表迁移（已完成）
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

### Phase 4.3：浏览器验收 + 构建优化 + 交互稳定性（已完成）
- [x] 创建 `frontend/scripts/acceptance-react.cjs` 浏览器验收脚本（T01-T15）
- [x] 新增 `npm run test:ui` 命令
- [x] ECharts manualChunks 构建优化（echarts + vendor 分包）
- [x] 创建 `docs/FRONTEND_ACCEPTANCE.md` 验收文档
- [x] 更新 `docs/REACT_MIGRATION_PLAN.md` Phase 4.3 状态

### Phase 4.3.1：验收脚本依赖与端口处理修复（已完成）
- [x] `puppeteer-core` 加入 `frontend/devDependencies`，验收脚本自洽
- [x] Preview 服务器改用 `--strictPort`，端口递增 4173-4177
- [x] T10 地图点击详情从自动 PASS 改为 MANUAL 状态
- [x] 验收结果区分 PASS / FAIL / MANUAL / SKIP 四种状态

### Phase 4.4：React 前端 UI 细节打磨与响应式优化（已完成）
- [x] 全局样式统一（CSS 变量、card-glass 基类、focus 状态）
- [x] Dashboard Hero 区轻量状态标签、StatCard grid 布局
- [x] FilterToolbar 统一 filter-input 样式和 aria-label
- [x] CitiesPage 城市卡片增加线路图/规划图标签、空状态
- [x] AboutPage 统一卡片样式
- [x] Footer 4 列布局移动端折叠
- [x] 响应式断点统一（1200 / 900 / 600px）
- [x] 375px 移动端无横向溢出

### Phase 4.5：城市资源页 Masonry 瀑布流与卡片精细还原（已完成）
- [x] CSS columns Masonry 瀑布流布局（1/2/3/4 列响应式）
- [x] 城市卡片封面区 CSS 渐变 + radial-gradient、tall 交错高度
- [x] 封面底部渐变遮罩、城市名/线路信息浮层、数据可用性徽章
- [x] 三列核心指标（运营里程/日客流/客流强度）
- [x] 三个资源状态标签（线路图/规划图/客流数据）
- [x] Hover 动效：卡片上浮 + 边框高亮 + 封面缩放 + 箭头浮现
- [x] 毛玻璃搜索筛选栏（搜索图标、清空按钮、胶囊标签组、图例）
- [x] 空状态 glass-card（图标 + 标题 + 提示）

### Phase 4.6：城市详情页 /city/:id（已完成）
- [x] 新增 /city/:id 路由（CityDetailPage）
- [x] CitiesPage 城市卡片点击导航（useNavigate + aria-label + 键盘支持）
- [x] 面包屑导航（返回按钮 + 城市名）
- [x] 6 统计卡片网格（运营线路/站点/里程/日客流/客流强度/峰值客流）
- [x] 年度客流趋势面积图（ECharts + cyan 渐变填充）
- [x] 资源预览 Tab（线路图/规划图 placeholder）
- [x] 数据说明手风琴（可折叠 + 无数据警告）
- [x] 城市不存在 404 状态
- [x] EmptyState 通用空状态组件

### Phase 4.7：城市卡片封面图片本地化（已完成）
- [x] 创建 `scrapers/scrape_city_covers.py`（Wikimedia Commons/Wikidata 采集脚本）
- [x] 仅接受 CC0/CC BY/CC BY-SA 许可证图片
- [x] 转换为 webp（800px 宽，quality 80）
- [x] `assets/city-covers/manifest.json` 记录完整溯源（source_url, license, author, attribution）
- [x] `frontend/scripts/sync-data.cjs` 增加 city-covers 同步
- [x] CitiesPage 使用 CSS backgroundImage 叠加（图片 + 渐变回退）

### Phase 4.7.1：八城补全与候选审核（已完成）
- [x] 增加精确搜索关键词（每个城市定制）
- [x] 增加错误地名过滤和宽高比过滤
- [x] 增加候选重试机制
- [x] 支持 `--dry-run` 模式便于人工审核
- [x] 7/8 城市成功补全，呼和浩特仍为 fallback
- [x] 最终 49/50 城市有封面图片

### Phase 4.7.2：封面图渲染验证与 fallback 修正（已完成）
- [x] CitiesPage 改为 manifest-aware 逻辑（仅 downloaded 城市生成封面 URL）
- [x] 封面层增加 data-city / data-has-cover 属性
- [x] 新增 T20 验收测试（manifest-aware：49/50 real covers + 1 fallback）

### Phase 4.8：城市详情页真实线路图/规划图渲染（已完成）
- [x] `sync-data.cjs` 新增 cities 目录线路图/规划图同步
- [x] 新建 CityAssetPreview 独立组件（CSS Module 样式）
- [x] 图片使用 `<img>` 标签真实渲染，`withBaseUrl()` 处理路径
- [x] `check-static-build.cjs` 新增 T09 必须检查项
- [x] `acceptance-react.cjs` 新增 T21 验收测试（xiamen 线路图+规划图）
- [x] `.gitignore` 新增 `frontend/public/cities/`

### Phase 4 成果总览

| 维度 | 内容 |
|------|------|
| 页面 | Dashboard、Cities、City Detail（/city/:id）、About |
| 图表 | 地图散点、排行榜、趋势图、客流强度、里程排行（共 5 类） |
| 城市卡片 | 50 城卡片、Masonry 瀑布流、49/50 封面图、数据标签 |
| 城市详情 | 6 统计卡片、趋势面积图、真实线路图/规划图、数据说明手风琴 |
| 资源同步 | JSON 数据 + GeoJSON + 封面图 + 线路图/规划图（4 类） |
| 静态路径 | HashRouter + withBaseUrl，兼容 GitHub Pages 子路径 |
| 构建优化 | ECharts + vendor 分包，check:static T01-T09 |
| 验收 | test:ui T01-T21（20 PASS / 1 MANUAL） |

---

## 后续路线图

### Phase 5.0：城市详情页线路图/规划图预览体验增强（已完成）

**目标**：增强城市详情页线路图/规划图的预览交互。

**产物**：
- [x] 缩放控制（放大/缩小/重置，scale 0.5-3x，显示百分比）
- [x] 拖拽平移（scale > 1 时鼠标拖拽，cursor grab/grabbing）
- [x] 适应容器/原始比例切换
- [x] 全屏预览弹层（overlay、ESC/遮罩/关闭按钮、城市名+类型+原图链接）
- [x] 加载状态（切换 Tab 显示"图片加载中..."）
- [x] Tab 切换自动重置视图并关闭全屏
- [x] 无图/加载失败时不显示缩放/全屏按钮
- [x] T22 验收测试（缩放/重置/全屏/ESC/Tab 切换/375px）
- [x] 工具栏深色玻璃风格，响应式无溢出

**验收标准**：
- `test:ui`：T01-T22，Total 22，PASS 21，FAIL 0，MANUAL 1
- `npm run typecheck` 和 `npm run build` 通过

---

### Phase 5.2：城市详情页数据来源与图片署名展示（已完成）

**目标**：在城市详情页增加"数据来源与署名"信息展示，包含客流统计来源、线路图/规划图资源状态、城市封面图署名和使用限制。

**产物**：
- [x] CitySourceInfo 组件（CSS Module 样式、深蓝科技风 glass-card）
- [x] 客流统计来源区块（MetroDB.org 公开页面）
- [x] 线路图/规划图资源状态区块（已收录/暂无）
- [x] 城市封面图署名区块（来源、作者、许可、署名、来源链接）
- [x] 封面 fallback 城市显示说明（如 hohhot）
- [x] 使用限制区块（免责声明）
- [x] 响应式布局（桌面 3 列、移动端单列）
- [x] T23 验收测试（xiamen 完整署名、hohhot fallback、375px 无溢出）

**验收标准**：
- `test:ui`：T01-T23，Total 23，PASS 22，FAIL 0，MANUAL 1
- `npm run typecheck` 和 `npm run build` 通过

---

### Phase 5.3：地铁线路图/规划图查看器交互重构（已完成）

**目标**：重构 CityAssetPreview 的 PC 端线路图/规划图查看器交互，使其接近 MetroMan 地铁图查看器体验。

**产物**：
- [x] 滚轮缩放（视图中心缩放、preventDefault、minScale=0.4、maxScale=5）
- [x] 左键拖拽（不要求 scale > 1、dragThreshold=4px、cursor grab/grabbing）
- [x] 左键单击放大（拖拽阈值区分、点击位置缩放中心、到 maxScale 不重置）
- [x] 双击不绑定重置
- [x] 工具栏固定在图片容器左上角（position absolute、不参与 transform）
- [x] 工具栏样式：小圆形按钮、浅灰半透明背景、轻微阴影
- [x] 图片查看区域背景浅灰 #f3f4f6
- [x] 全屏模式与普通模式共用交互逻辑
- [x] 全屏工具栏固定在左上角
- [x] 全屏背景浅灰 #e5e7eb
- [x] Tab 切换关闭全屏并重置视图
- [x] EmptyState 不显示查看器工具栏
- [x] T22 验收测试增强（滚轮缩放、拖拽、单击放大、全屏内交互）
- [x] 375px 无横向滚动

**验收标准**：
- `test:ui`：T01-T23，Total 23，PASS 22，FAIL 0，MANUAL 1
- `npm run typecheck` 和 `npm run build` 通过

---

### Phase 5.3.2：线路图查看器滚轮缩放中心调整（已完成）

**目标**：将滚轮缩放从鼠标位置中心改为查看器容器中心。

**产物**：
- [x] 滚轮缩放使用容器中心点（centerX = width/2, centerY = height/2）
- [x] 左键单击放大仍以点击位置为缩放中心（不变）
- [x] 全屏模式滚轮缩放也使用全屏视图中心
- [x] viewport 容器添加 `data-wheel-zoom-origin="center"` 属性
- [x] T22 增加 center 模式属性检查
- [x] 375px 无横向滚动

---

### Phase 5.1：GitHub Actions CI 与 Pages 手动部署配置

**目标**：建立 CI 流水线，配置 Pages 手动部署。

**产物**：
- [ ] GitHub Actions workflow：PR 触发 typecheck + build + check:static
- [ ] `workflow_dispatch` 手动触发 Pages 部署
- [ ] README 更新在线访问链接（部署后）
- [ ] 自定义 404 页面

**验收标准**：
- PR 提交自动触发 CI 检查
- 手动触发可成功部署到 GitHub Pages
- `https://threemoretime.github.io/MAP/` 可正常访问

---

### Phase 5.3：React Pages 发布后验收

**目标**：在 GitHub Pages 上线后进行端到端验证。

**产物**：
- [ ] 在线环境四页路由验证
- [ ] 静态资源加载验证（JSON 数据、GeoJSON、封面图、线路图/规划图）
- [ ] 移动端在线验证
- [ ] 旧版 `dashboard.html` 在线验证

**验收标准**：
- 四页路由均可正常访问
- 所有静态资源 200 OK
- 移动端布局正常

---

### Phase 5.4：城市详情页视觉重构与信息架构优化（已完成）

**目标**：对城市详情页进行全面视觉重构，采用深蓝科技风格，优化信息层级与页面布局。

**产物**：
- [x] Hero 区（纯 CSS 渐变背景、城市中英文名、描述文字、状态 pills）
- [x] 6 指标卡片横向排列（glass-card 风格、彩色图标、缺失数据显示 "--"）
- [x] 2 列主内容区（左侧线路图查看器 70%、右侧信息面板 30%）
- [x] 右侧信息面板（资源状态、使用提示、当前资源信息 3 个卡片）
- [x] 下方双列（年度客流趋势 + 数据来源与署名）
- [x] CityAssetPreview 视觉微调（圆形工具栏按钮、浅色画布、Tab active 增强）
- [x] CitySourceInfo 紧凑化（嵌入右侧面板单列布局）
- [x] CSS Module（CityDetailPage.module.css）
- [x] 动画效果（Hero fade-in、指标卡片 staggered、hover 上浮、prefers-reduced-motion）
- [x] 50 城市描述文案与英文名映射
- [x] T24 验收测试
- [x] 375px 无横向滚动

**验收标准**：
- `test:ui`：T01-T24，Total 24，PASS 23，FAIL 0，MANUAL 1
- `npm run typecheck` 和 `npm run build` 通过

---

### Phase 5.5：数据与资源来源说明增强

**目标**：在 About 页面和城市详情页增加更完善的数据来源信息。

**产物**：
- [ ] About 页面补充资源来源说明（线路图/规划图来源 MetroMan.cn）
- [ ] 城市详情页显示数据更新日期
- [ ] 封面图来源与署名信息展示

---

### Phase 5.6：旧版 dashboard.html 维护策略

**目标**：明确 dashboard.html 的长期定位与维护策略。

**产物**：
- [ ] 明确 dashboard.html 为 frozen baseline，仅做数据更新
- [ ] 评估是否保留 dashboard.html 或在 React 版稳定后归档
- [ ] 更新 RELEASE_PROCESS.md 反映双前端发布流程

---

### Phase 6：增量更新与定期采集

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

### Phase 7：数据质量与覆盖率提升

**目标**：提升数据质量和城市资源覆盖率。

**产物**：
- [ ] 补全缺失城市的线路图/规划图
- [ ] 封面图覆盖率提升（目标 50/50）
- [ ] 数据交叉验证与异常值标注
- [ ] 客流数据年度更新机制

---

## 备注

本路线图为规划性文档，实际执行顺序和工期可能根据项目需求调整。每个阶段开始前应在 Issue 中详细讨论具体实施方案。
