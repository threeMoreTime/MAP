# React 前端静态部署草案

## 1. 当前状态
- React 前端位于 frontend/
- 旧版 dashboard.html 仍保留为稳定基线
- React 版使用 HashRouter
- 当前入口包括：
  - /#/dashboard
  - /#/cities
  - /#/city/:id
  - /#/about

/#/city/:id 已在 Phase 4.6 完成，用于展示城市详情页。

## 2. 本地构建命令

```bash
cd frontend
npm ci
npm run typecheck
npm run build
npm run check:static
npm run test:ui
```

## 3. 数据同步机制
- prebuild 会执行 scripts/sync-data.cjs
- data/latest/*.json 会复制到 frontend/public/data/latest/
- assets/china.json 会复制到 frontend/public/assets/china.json
- assets/city-covers/ 会复制到 frontend/public/assets/city-covers/（webp + manifest.json）
- cities/ 线路图/规划图会根据 city_assets_index.json 复制到 frontend/public/cities/（仅 network_map + plan_map，不包含 stats json 和 yearly_trend png）
- frontend/public/data/ 和 frontend/public/assets/ 和 frontend/public/cities/ 是同步产物，不提交仓库
- build 后进入 frontend/dist/

## 4. 静态路由策略
- 使用 HashRouter
- 不依赖服务端 rewrite
- GitHub Pages 子路径下应通过 /MAP/#/dashboard 等形式访问

## 5. check:static 检查内容

| 编号 | 检查项 | 说明 |
|------|--------|------|
| T01 | dist/index.html 存在 | 确认构建输出根入口文件 |
| T02 | dist/assets/ 目录存在 | 确认静态资源目录 |
| T03 | data/latest 三个 JSON 存在 | metro_stats.json、city_assets_index.json、manifest.json |
| T04 | china.json 存在 | dist/assets/china.json 中国地图 GeoJSON |
| T05 | index.html 不使用根路径资源 | 不含 `src="/assets/"`、`href="/assets/"`、`src="/data/"`、`href="/data/"` |
| T06 | 构建 JS/HTML 不含硬编码绝对数据路径 | 不含 `"/data/latest/"`、`"/assets/china.json"` 等绝对路径；允许相对路径 |
| T07 | dist 含 JS 和 CSS 资源 | assets/ 目录下至少各有一个 .js 和 .css 文件 |
| T08 | city covers 可选检查 | 如果 dist/assets/city-covers/ 存在则检查 manifest.json + 至少一个 webp；不存在则 SKIP |
| T09 | metro map assets 检查 | 读取 dist/data/latest/city_assets_index.json，验证 dist/cities/ 中所有声明的线路图和规划图文件存在；缺失时 FAIL |

## 6. 与旧版 dashboard.html 的关系
- React 静态部署不删除 dashboard.html
- dashboard.html 仍可通过旧验收脚本验证
- React Pages 发布失败时，可回退到旧版 dashboard.html

## 7. 当前构建资源清单

构建后 `frontend/dist/` 包含以下静态资源：

| 类别 | 文件 | 来源 |
|------|------|------|
| 入口 | `index.html` | Vite 构建产物 |
| JS/CSS | `assets/*.js`, `assets/*.css` | 应用代码 + 依赖 |
| 地图数据 | `assets/china.json` | 同步自 `assets/china.json` |
| 城市封面 | `assets/city-covers/*.webp` + `manifest.json` | 同步自 `assets/city-covers/` |
| JSON 数据 | `data/latest/metro_stats.json` 等 3 文件 | 同步自 `data/latest/` |
| 线路图/规划图 | `cities/*/` PNG 文件 | 同步自 `cities/`（按 city_assets_index.json） |

## 8. 后续待办

- Phase 5.0：将本文档从 DRAFT 转正为正式部署文档
- 新增 GitHub Actions CI workflow（PR 触发 typecheck + build + check:static）
- 新增 `workflow_dispatch` 手动部署 Pages
- 暂不自动部署到 GitHub Pages
- 部署上线后在 `/#/city/:id` 路由上做端到端在线验收
