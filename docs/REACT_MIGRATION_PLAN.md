# React 前端迁移计划

> 版本：v1.1.0 | 日期：2026-05-09

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

## 6. 验收命令

```bash
cd frontend
npm install
npm run typecheck     # TypeScript 类型检查
npm run build         # 生产构建
npm run test:ui       # React 前端浏览器验收（T01-T19）

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
- **文件大小**：46/50 城市有封面图片，总计约 2.5MB
- **4 个 fallback 城市**（成都、重庆、高雄、台北）使用 CSS 渐变回退

## 7. 回滚方案

- React 前端完全独立于 `frontend/` 目录
- 删除 `frontend/` 目录即可完全回退
- `dashboard.html` 始终可用作独立 fallback
- 根目录的 `.gitignore` 已添加 `frontend/node_modules/` 和 `frontend/dist/`
