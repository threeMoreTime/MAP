# React 前端迁移计划

> 版本：v1.0.0 | 日期：2026-05-09

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
│   └── sync-data.cjs             # 数据同步脚本（predev/prebuild 自动执行）
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
| 4.2 | ECharts 图表迁移（地图、排行榜、趋势图、强度图、详情面板） | 已完成 |
| 4.3 | 浏览器验收 + 构建优化 + 交互稳定性 | 已完成 |
| 4.4 | 视觉打磨 + 响应式优化 | 待开始 |

## 6. 验收命令

```bash
cd frontend
npm install
npm run typecheck     # TypeScript 类型检查
npm run build         # 生产构建
npm run test:ui       # React 前端浏览器验收（T01-T15）

# 回到根目录验证旧版不受影响
python scripts/run_acceptance.py
```

React 前端验收详情见 [docs/FRONTEND_ACCEPTANCE.md](./FRONTEND_ACCEPTANCE.md)。

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

## 7. 回滚方案

- React 前端完全独立于 `frontend/` 目录
- 删除 `frontend/` 目录即可完全回退
- `dashboard.html` 始终可用作独立 fallback
- 根目录的 `.gitignore` 已添加 `frontend/node_modules/` 和 `frontend/dist/`
