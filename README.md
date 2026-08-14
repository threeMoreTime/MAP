# 全国城市地铁客流数据可视化平台 · MetroViz

基于 React + TypeScript + ECharts 的中国 50 城市地铁客流数据可视化平台。**纸墨 · 朱印**视觉方向：米白宣纸底、墨色排印、朱砂红唯一强调，宋体衬线标题，离线可用。

> 当前版本：v2.0.0-dev（全仓重构：legacy 退役、ECharts 按需加载、Tailwind v4 纸墨换装、pipeline 包重建）| [在线演示 🌐](https://threemoretime.github.io/MAP/)

---

## 功能特性

- **数据大屏** — 全国地铁城市地理散点（墨阶气泡 + 朱砂 Top10 涟漪）、指标排行、年度趋势、客流强度
- **城市总览** — 50 城封面卡片目录，多口径筛选（客流/线路图/规划图/资源完整度）
- **城市详情** — 线路图/规划图查看器（滚轮/拖拽/单击缩放、全屏）、资源完整度说明、来源署名
- **城市对比** — 2-5 城横向对比（柱状/雷达/趋势）、完整度评分、明细大表
- **数据质量中心** — 50 城收录完整度大纲、缺失组索引、可检索大表
- **移动端适配** — 响应式布局，375px 无横向溢出

## 数据来源

| 来源 | 说明 |
| --- | --- |
| [MetroDB.org](https://metrodb.org/) | 各城市年度客流统计数据 |
| [MetroMan.cn](https://www.metroman.cn/) | 城市地铁网络图与规划图 |

## 快速开始

```bash
cd frontend
npm ci
npm run dev        # 开发服务器（默认 http://localhost:5173）
```

路由（Hash 模式）：

- `/#/` 或 `/#/dashboard` — 数据大屏
- `/#/cities` — 城市总览
- `/#/city/:id` — 城市详情（如 `/#/city/xiamen`）
- `/#/compare` — 城市对比
- `/#/data-quality` — 数据质量中心
- `/#/about` — 数据说明

## 数据管线（pipeline/）

数据层由 `pipeline/` Python 包统一管理，CLI 入口：

```bash
python -m pipeline.cli build-index      # 扫描 cities/ 重建 data/latest 索引 + schema + 质量报告
python -m pipeline.cli validate         # 校验数据层（CI 防线，支持 --data-dir）
python -m pipeline.cli quality-report   # 单独生成质量报告
python -m pipeline.cli optimize-images  # cities/ PNG → WebP（q85，仅在更小时替换）
python -m pipeline.cli all              # build-index + validate
```

或使用 npm scripts：

```bash
npm run build:data        # python -m pipeline.cli build-index
npm run test:data         # python -m pipeline.cli validate
npm run test:pipeline     # pytest pipeline/tests
npm run optimize:images   # PNG → WebP
npm run scrape:metrodb    # MetroDB 客流爬取
npm run scrape:cities     # 城市线路图爬取
npm run generate:charts   # matplotlib 趋势图生成
```

### 数据复现流程

```bash
python scrapers/scrape_metrodb.py        # 1. 爬取客流数据到 cities/
python -m pipeline.cli build-index       # 2. 重建数据层索引
python -m pipeline.cli validate          # 3. 校验
cd frontend && npm run dev               # 4. 查看
```

## 自动化验收

```bash
# 前端（frontend/ 目录）
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm run test:unit     # Vitest + Testing Library 单元测试
npm run check:static  # 静态构建检查（T01-T09）
npm run test:ui       # 浏览器验收（T01-T34，需本机 Chrome）

# 数据层（根目录）
npm run test:data     # pipeline 校验
npm run test:pipeline # pipeline pytest
```

| 检查项 | 结果 |
| --- | --- |
| React UI 验收（T01-T34） | 33 PASS / 0 FAIL / 1 MANUAL |
| 前端单元测试（Vitest） | 全部通过 |
| pipeline pytest | 18/18 |
| 数据层校验 | PASS |
| 城市目录覆盖 | 50/50 |

### CI/CD 与 Pages 部署

- **CI**（`.github/workflows/ci.yml`）：push/PR 到 master 触发，三个 Job — `data-check`（数据校验 + pipeline pytest）、`react-check`（typecheck + lint + 单测 + 构建 + 静态检查）、`react-ui-test`（Headless Chrome 真浏览器验收）。
- **CD**（`.github/workflows/pages.yml`）：CI 通过后自动部署 GitHub Pages，附带线上 smoke test。
- **自定义 404**（`frontend/public/404.html`）：非 Hash 子路径访问自动重定向回 SPA。

## 视觉与设计契约

视觉方向为**纸墨 · 朱印**（浅色纸墨编辑部风）。设计令牌唯一来源：`frontend/src/styles/tokens.css`（Tailwind v4 `@theme`）；完整视觉契约见 [frontend/DESIGN.md](frontend/DESIGN.md)。

标题字体为子集化 Noto Serif SC（可变字重，299KB woff2，OFL 许可），再生成脚本：`python scripts/subset_font.py`。

## 文件结构

```
MAP/
├── frontend/                   # 主力前端（React 18 + TS + Vite + Tailwind v4）
│   ├── DESIGN.md               # 视觉契约（纸墨·朱印）
│   └── src/                    # pages / components / hooks / lib / styles
├── pipeline/                   # 数据管线 Python 包（CLI + pytest）
│   ├── processors/             # index_builder / quality_auditor / image_optimizer
│   ├── validators/             # schema_validator
│   └── tests/                  # pytest
├── scrapers/                   # 爬虫（MetroDB / 城市图 / 趋势图）
├── scripts/                    # run_data_update / diff_data_snapshot / subset_font
├── cities/                     # 50 城市数据目录（stats JSON + webp/png 图）
├── assets/                     # china.json GeoJSON + 城市封面 webp
├── data/latest/                # 统一数据层（pipeline 生成）
└── docs/                       # 项目文档（见 docs/INDEX.md）
```

## 更多文档

- [文档索引](docs/INDEX.md) — 完整文档目录
- [开发路线图](docs/ROADMAP.md) — 后续迭代计划

## 许可证

本项目数据来源于公开网站，仅供学习与研究使用。
