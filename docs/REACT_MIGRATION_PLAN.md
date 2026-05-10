# React 前端迁移计划

> 版本：v1.2.0-dev | 日期：2026-05-10

## 1. 为什么要迁移到 React

`dashboard.html` 作为单文件方案已经很好地完成了初始使命，但随着功能增长面临以下限制：

- **单文件膨胀**：2095 行 HTML/CSS/JS 集中在一个文件中，维护困难
- **无路由**：三个页面区域（总览、城市资源、数据说明）只能通过锚点滚动切换
- **无组件复用**：卡片、图表等 UI 元素无法独立开发和测试
- **无类型检查**：纯 JS 无法进行编译时类型校验
- **构建优化缺失**：无法进行代码分割、Tree-shaking 等优化

React + TypeScript + Vite 方案提供模块化开发、路由、类型安全和现代构建工具链。

## 2. 为什么保留 dashboard.html

- **稳定基线**：dashboard.html 已通过 16/16 浏览器验收，是可靠的 fallback
- **零依赖运行**：双击 HTML 即可打开，适合离线和快速分享场景
- **向后兼容**：旧版 Python 验收脚本（`run_acceptance.py`）依赖 dashboard.html
- **渐进迁移**：React 版逐步替代，不会因新框架引入回归风险

## 3. React 项目目录结构

```
frontend/
├── index.html                    # Vite 入口 HTML
├── package.json                  # 独立依赖配置
├── tsconfig.json                 # TypeScript 配置
├── vite.config.ts                # Vite 构建配置
├── scripts/
│   ├── sync-data.cjs             # 数据同步脚本（predev/prebuild 自动执行）
│   └── acceptance-react.cjs      # React 浏览器验收脚本
├── public/
│   ├── data/latest/              # 从根项目同步的 JSON 数据
│   └── assets/china.json         # 从根项目同步的 GeoJSON
└── src/
    ├── main.tsx                  # ReactDOM 入口
    ├── App.tsx                   # HashRouter 包装
    ├── routes.tsx                # 路由定义
    ├── styles/
    │   ├── theme.css             # CSS 变量（深蓝主题）
    │   └── globals.css           # 全局重置与网格背景
    ├── types/
    │   └── metro.ts              # TypeScript 类型定义
    ├── data/
    │   └── cityCoords.ts         # 城市坐标数据
    ├── hooks/
    │   ├── useMetroData.ts       # 数据加载 Hook
    │   └── useDashboardFilters.ts # 筛选状态 Hook
    ├── components/
    │   ├── layout/
    │   │   ├── Header.tsx
    │   │   ├── Footer.tsx
    │   │   └── AppLayout.tsx
    │   ├── common/
    │   │   ├── StatCard.tsx
    │   │   ├── SectionTitle.tsx
    │   │   ├── FilterToolbar.tsx
    │   │   ├── ChartCard.tsx
    │   │   └── StatusBadge.tsx
    │   ├── city/                 # Phase 4.2+
    │   ├── charts/               # Phase 4.2+
    │   └── about/
    └── pages/
        ├── DashboardPage.tsx
        ├── CitiesPage.tsx
        └── AboutPage.tsx
```

## 4. 数据同步策略

React 前端**不直接访问父级目录**。通过 `scripts/sync-data.cjs` 脚本在 `npm run dev` 和 `npm run build` 前自动执行：

- 复制 `data/latest/*.json` 到 `frontend/public/data/latest/`
- 复制 `assets/china.json` 到 `frontend/public/assets/`
- 不复制 `node_modules`、`cities/` 图片等大文件

运行时通过 `import.meta.env.BASE_URL` 拼接数据路径（`withBaseUrl` 工具函数），确保 GitHub Pages 子路径部署时不会因绝对路径 `/data` 导致 404。

`frontend/public/data/` 为同步产物，不提交仓库。

## 5. 分阶段迁移计划

| Phase | 内容 | 状态 |
|-------|------|------|
| 4.1 | React 脚手架 + 三页 UI 骨架 + 数据加载层 | 已完成 |
| 4.1.1 | React 静态部署数据路径兼容 | 已完成 |
| 4.2 | ECharts 图表迁移（地图、排行榜、趋势图、强度图、详情面板） | 已完成 |
| 4.3 | 浏览器验收 + 构建优化 + 交互稳定性 | 已完成 |
| 4.3.1 | 验收脚本依赖与端口处理修复 | 已完成 |
| 4.4 | UI 细节打磨 + 响应式优化 | 已完成 |
| 4.5 | 城市资源页 Masonry 瀑布流与卡片精细还原 | 已完成 |
| 4.6 | 城市详情页 /city/:id（点击导航、统计卡片、趋势图、资源预览、数据说明） | 已完成 |
| 4.7 | 城市卡片封面图片本地化（Wikimedia Commons、webp、manifest 溯源） | 已完成 |
| 4.8 | 城市详情页真实线路图/规划图渲染（CityAssetPreview 组件、图片同步、构建检查、验收） | 已完成 |
| 5.0 | 城市详情页线路图/规划图预览体验增强（缩放、拖拽、全屏、加载状态） | 已完成 |
| 5.2 | 城市详情页数据来源与图片署名展示（CitySourceInfo 组件） | 已完成 |

## 6. 验收命令

```bash
cd frontend
npm install
npm run typecheck     # TypeScript 类型检查
npm run build         # 生产构建
npm run test:ui       # React 前端浏览器验收（T01-T23）

# 回到根目录验证旧版不受影响
python scripts/run_acceptance.py
```

React 前端验收详情见 [docs/FRONTEND_ACCEPTANCE.md](./FRONTEND_ACCEPTANCE.md)。

### 6.1 验收依赖说明

- `puppeteer-core` 已声明为 `frontend/devDependencies`，验收脚本完全自洽于 frontend 子项目
- Preview 服务器使用 `--strictPort` 模式，按 4173-4177 顺序尝试端口
- T10 地图点击详情保留为 MANUAL（人工验证项），不计入自动 PASS
- 验收结果区分 PASS / FAIL / MANUAL / SKIP 四种状态

### 6.2 Phase 4.4 UI 优化说明

Phase 4.4 完成 React 前端视觉细节打磨与响应式优化：

- **全局样式**：统一 CSS 变量体系，新增 `--border-accent`、`--shadow-card`、`--transition-*` 等；网格背景透明度降低
- **Dashboard**：Hero 区新增轻量状态标签（React 前端 / 数据快照 / 城市资源 / 客流统计）；StatCard 改用 grid 布局自适应；FilterToolbar 使用统一样式
- **Cities**：城市卡片增加"有线路图""有规划图"标签；筛选按钮添加 aria-label；空状态展示"暂无匹配城市"
- **About**：说明卡片使用统一样式
- **Header / Footer**：Footer 4 列布局移动端折叠为 2 列
- **响应式**：统一断点（1200 / 900 / 600px），375px 无横向溢出
- **无障碍**：input / select / button 添加 focus-visible 和 aria-label

### 6.3 Phase 4.5 城市资源页精细还原

Phase 4.5 完成 CitiesPage 的 Masonry 瀑布流与城市卡片精细还原：

- **Masonry 布局**：纯 CSS `columns` 实现，断点 640/1024/1280px 分别对应 2/3/4 列
- **城市卡片**：封面区使用 CSS 渐变 + radial-gradient 模拟图片质感，tall 变体交错高度
- **封面浮层**：底部渐变遮罩、城市名/线路信息、右上角数据可用性徽章、右下角箭头按钮
- **三列指标**：运营里程（cyan）、日客流（amber）、客流强度（emerald）
- **资源标签**：线路图/规划图/客流数据各带激活/未激活样式
- **Hover 动效**：卡片上浮 4px + 边框高亮 + 青色阴影；封面 scale(1.10)；箭头按钮淡入
- **搜索栏**：毛玻璃容器、搜索图标、清空按钮、胶囊筛选标签组、结果统计 + 图例
- **空状态**：居中 glass-card，图标 + 标题 + 提示文案
- **未新增**：城市详情路由、外部图片、大型 UI 库
- **验收兼容**：隐藏 div 保留"线路/站点""日客流"文本，验收脚本无需修改

### 6.4 Phase 4.6 城市详情页

Phase 4.6 完成 CityDetailPage 城市详情页的完整实现：

- **路由**：新增 `/city/:id` 路由，支持通过城市 slug 直接访问
- **点击导航**：CitiesPage 城市卡片添加点击导航（useNavigate），支持键盘 Enter/Space 触发
- **无障碍**：卡片添加 `role="button"`, `tabIndex={0}`, `aria-label` 属性
- **面包屑导航**：返回按钮（capsule 样式）+ 分隔符 + 城市名
- **6 统计卡片网格**：运营线路/站点/里程/日客流/客流强度/峰值客流，响应式 2/3/6 列
- **年度趋势图**：ECharts 面积图（cyan 渐变填充），无数据时显示空状态
- **资源预览 Tab**：线路图/规划图切换，显示 placeholder 状态
- **数据说明手风琴**：可折叠，含客流口径说明和无数据警告
- **404 状态**：城市不存在时显示"未找到城市"
- **EmptyState 通用组件**：可复用的空状态展示组件
- **验收**：新增 T16-T19 四项验收测试
- **未新增**：Recharts 或其他 UI 依赖

## 6.5 构建优化

ECharts 通过 Vite `manualChunks` 拆分为独立 chunk，避免单一 ~1.2MB 大包：

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        echarts: ['echarts'],
        vendor: ['react', 'react-dom', 'react-router-dom']
      }
    }
  }
}
```

### 6.6 Phase 4.7 城市卡片封面图片

Phase 4.7 完成城市卡片封面图片本地化与前端集成：

- **图片采集**：`scrapers/scrape_city_covers.py` 从 Wikimedia Commons / Wikidata 采集 CC 协议城市天际线图片
- **图片处理**：转换为 webp（800px 宽，quality 80），保存至 `assets/city-covers/`
- **溯源 manifest**：`manifest.json` 记录每张图片的 source_url、license、author、attribution
- **前端集成**：CitiesPage 使用 CSS `backgroundImage: url(...) + gradient` 叠加策略，图片 404 时静默回退到渐变色
- **数据同步**：`sync-data.cjs` 增加 city-covers 目录同步
- **构建检查**：`check-static-build.cjs` 增加 T08 可选检查
- **文件大小**：49/50 城市有封面图片，总计约 2.5MB
- **1 个 fallback 城市**（呼和浩特）使用 CSS 渐变回退

### 6.7 Phase 4.7.1 八城补全

Phase 4.7.1 对 8 个 fallback/error 城市做了更谨慎的候选筛选：

- 增加精确搜索关键词和错误地名过滤（福州排除含 "Taipei" 的候选，昆明排除含 "Kunming Lake" 的候选，徐州排除含 "Zhengzhou" 的候选）
- 增加宽高比过滤（`width/height >= 1.2`）
- 增加候选重试机制（最佳候选下载失败时自动尝试下一个）
- 支持 `--dry-run` 模式便于人工审核
- 补全结果：7/8 城市成功补全，呼和浩特仍为 fallback

### 6.8 Phase 4.7.2 封面图渲染验证与 fallback 修正

Phase 4.7.2 验证并确认城市卡片封面图在前端的实际渲染效果，并修正验收误判问题：

- 确认 CSS 层级结构正确：图片层 → radial 装饰层 → overlay 遮罩 → 信息浮层
- 确认 radial 层透明度极低（rgba 0.06），不影响图片可见性
- 确认 overlay 为底部渐变遮罩，不会完全遮住图片
- 新增 T20 验收测试：检查 city-covers 资源加载和 backgroundImage 引用
- **修正验收误判**：CitiesPage 改为 manifest-aware 逻辑，仅 `status=downloaded` 城市生成封面 URL
- 封面层增加 `data-city` 和 `data-has-cover` data 属性，便于验收脚本精确判断
- T20 修正为检查 49/50 real covers + 1 fallback (hohhot)，并验证 content-type 为 image/*
- 验收结果：Total 20, PASS 19, MANUAL 1
- 手动浏览器检查确认各城市封面图正常显示

### 6.9 Phase 4.8 城市详情页真实线路图/规划图渲染

Phase 4.8 将城市详情页中的线路图/规划图从占位状态升级为真实图片渲染：

- **数据同步**：`sync-data.cjs` 新增 cities 目录同步，读取 `city_assets_index.json` 遍历复制线路图/规划图 PNG 文件到 `frontend/public/cities/`
- **CityAssetPreview 组件**：新建独立组件，使用 CSS Module 样式，支持线路图/规划图 Tab 切换
- **图片渲染**：使用 `<img>` 标签加载真实 PNG 图片，路径通过 `withBaseUrl()` 处理
- **查看原图**：`<a href target="_blank">` 链接，在新窗口打开原始图片
- **错误处理**：`onError` 回调设置 imageError 状态，图片加载失败时显示 EmptyState
- **Tab 切换重置**：切换 Tab 时重置 imageError 状态
- **无图状态**：`has_network_map=false` 或 `has_plan_map=false` 时显示 EmptyState
- **构建检查**：`check-static-build.cjs` 新增 T09 必须检查项，验证 dist/cities/ 中所有声明的图片存在
- **验收测试**：`acceptance-react.cjs` 新增 T21，使用 xiamen 测试城市验证线路图/规划图真实加载
- **样式**：glass-card 外层、深色胶囊 Tab、cyan 高亮 active、深色图片区域、响应式最大高度
- **.gitignore**：新增 `frontend/public/cities/` 排除同步产物
- 验收结果：Total 21, PASS 20, MANUAL 1

### 6.10 Phase 5.0 城市详情页线路图/规划图预览体验增强

Phase 5.0 增强城市详情页中线路图/规划图的预览交互体验：

- **缩放控制**：放大/缩小/重置按钮，minScale=0.5, maxScale=3, step=0.25；显示百分比缩放值
- **拖拽平移**：scale > 1 时允许鼠标拖拽，cursor: grab/grabbing，防止文字选中
- **适应容器/原始比例切换**：contain 模式（width:100%, object-fit:contain）和 natural 模式（max-width:none）
- **全屏预览弹层**：overlay 背景 rgba(0,0,0,0.86)，居中图片，ESC/遮罩/关闭按钮关闭，显示城市名+类型+查看原图链接
- **加载状态**：Tab 切换时 imageLoading=true，显示"图片加载中..."；onLoad 后隐藏；加载失败显示 EmptyState
- **Tab 切换重置**：切换 Tab 时自动重置 scale/translate/close fullscreen
- **无图/加载失败**：不显示缩放控制工具栏和全屏按钮
- **body 滚动锁定**：全屏时禁止 body 滚动，关闭后恢复
- **工具栏样式**：深色玻璃风格，胶囊按钮，cyan active，disabled 灰化
- **响应式**：375px 无横向滚动，工具栏允许换行
- **验收测试**：`acceptance-react.cjs` 新增 T22，使用 xiamen 测试缩放/重置/全屏/ESC/Tab 切换
- 验收结果：Total 22, PASS 21, MANUAL 1

### 6.11 Phase 5.2 城市详情页数据来源与图片署名展示

Phase 5.2 在城市详情页新增"数据来源与署名"信息区块：

- **CitySourceInfo 组件**：新建独立组件，使用 CSS Module 样式
- **封面 manifest 读取**：useState + useEffect 读取 `assets/city-covers/manifest.json`，失败时显示 fallback 文案
- **4 个信息区块**：客流统计来源（MetroDB.org）、线路图/规划图资源状态、城市封面图署名（来源/作者/许可/署名/来源链接）、使用限制
- **状态标签**：已收录/有数据=emerald、暂无/fallback=amber、来源/license=cyan
- **响应式布局**：桌面 3 列、平板 2 列、移动端单列，375px 无横向滚动
- **封面 fallback 城市**（如 hohhot）：显示"暂无合规封面图"和 CSS 渐变说明
- **验收测试**：`acceptance-react.cjs` 新增 T23，使用 xiamen 和 hohhot 验证
- 验收结果：Total 23, PASS 22, MANUAL 1

## 7. Phase 4 + Phase 5.0 + Phase 5.2 收口状态

Phase 4（React 前端迁移）全部子阶段已完成：

- **Phase 4.1**：脚手架与三页 UI 骨架 + 数据加载层 ✓
- **Phase 4.2**：ECharts 五类图表迁移 + 城市详情面板 ✓
- **Phase 4.3**：浏览器验收脚本 + 构建优化 + 交互稳定性 ✓
- **Phase 4.3.1**：验收脚本依赖与端口处理修复 ✓
- **Phase 4.4**：UI 细节打磨 + 响应式优化 ✓
- **Phase 4.5**：城市资源页 Masonry 瀑布流与卡片精细还原 ✓
- **Phase 4.6**：城市详情页 /city/:id ✓
- **Phase 4.7**：城市卡片封面图片本地化 ✓
- **Phase 4.7.1**：八城补全与候选审核 ✓
- **Phase 4.7.2**：封面图渲染验证与 fallback 修正 ✓
- **Phase 4.8**：城市详情页真实线路图/规划图渲染 ✓
- **Phase 5.0**：城市详情页线路图/规划图预览体验增强 ✓
- **Phase 5.2**：城市详情页数据来源与图片署名展示 ✓

**收口验收结果**：
- `test:ui`：T01-T23，Total 23，PASS 22，FAIL 0，MANUAL 1
- `check:static`：T01-T09，全部通过
- `run_acceptance.py`：legacy 16/16 PASS
- `npm run typecheck`：通过
- `npm run build`：通过

**下一步**：Phase 5.1 — GitHub Actions CI 与 Pages 手动部署配置。详见 [docs/ROADMAP.md](./ROADMAP.md)。

## 8. 回滚方案

- React 前端完全独立于 `frontend/` 目录
- 删除 `frontend/` 目录即可完全回退
- `dashboard.html` 始终可用作独立 fallback
- 根目录的 `.gitignore` 已添加 `frontend/node_modules/` 和 `frontend/dist/`
