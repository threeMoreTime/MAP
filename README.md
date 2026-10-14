# MetroViz · 城市地铁客流研究台

面向城市轨道交通研究与资料查询的 React + TypeScript 应用。采用浅色交通研究风，以城市、指标、期间与来源组织信息，提供适度三维空间效果与可减弱的任务动画。

当前业务视觉重构版本以 [PRD 文档体系](docs/prd/00-README.md) 为准。[实施与验收记录](docs/prd/07-implementation-report.md) 说明范围、测试与发布边界。[在线演示](https://threemoretime.github.io/MAP/) 仅在功能分支合入并部署后更新。

## 功能特性

- **全国概览**：年度、日快照、里程与站点上下文；二维 / 三维切换，选城、聚焦、复位与故障降级。
- **城市档案**：可检索列表 / 等高卡片；趋势、原值、来源、运营资料与线网分层。
- **对标分析**：最多五城跨页选择，同指标原值与趋势；未知口径阻止严格排名和同比结论。
- **线网图集**：线路图 / 规划图筛选，缩放和全屏查看，明确版本未知状态。
- **数据说明**：日期语义、指标定义、构建版本与逐城资料收录。
- **可访问性**：窄屏适配、图表等价数据、全屏焦点管理、系统与站内减少动态效果。

## 数据来源

| 来源 | 说明 |
| --- | --- |
| [MetroDB.org](https://metrodb.org/) | 各城市年度客流统计数据 |
| [MetroMan.cn](https://www.metroman.cn/) | 城市地铁网络图与规划图 |

## 快速开始

使用 Node.js 24.x（至少 24.15.0）；已安装 nvm 时可在仓库根目录执行 `nvm install && nvm use`，与 CI 的 `.nvmrc` 保持一致。数据管线需要 Python 3.10+。

```bash
cd frontend
npm ci
npm run dev        # 开发服务器（默认 http://localhost:5173）
```

路由（Hash 模式）：

- `/#/` 或 `/#/dashboard` — 全国概览
- `/#/cities` — 城市档案目录
- `/#/city/:id` — 城市档案（如 `/#/city/xiamen`）
- `/#/compare` — 对标分析
- `/#/data-quality` — 逐城资料收录
- `/#/maps` — 线网图集
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
npm run test:ui       # PRD 浏览器验收（需本机 Chrome）

# 数据层（根目录）
python -m pip install -r requirements-dev.txt # Python 3.10+，安装 Pillow 与 pytest
npm run test:data     # pipeline 校验
npm run test:pipeline # pipeline pytest
```

最新测试结果和限制详见 [实施与验收记录](docs/prd/07-implementation-report.md)。原有 45 天数据新鲜度检查仍然生效，历史数据没有在界面改造时被改写。

### CI/CD 与 Pages 部署

- **CI**（`.github/workflows/ci.yml`）：push/PR 到 master 触发，包含 `data-check`（数据校验 + pipeline pytest）、`react-check`（typecheck + lint + 单测 + 构建 + 静态检查）、`react-ui-test`（Headless Chrome 真浏览器验收）。
- **CD**（`.github/workflows/pages.yml`）：CI 通过后自动部署 GitHub Pages，附带线上 smoke test。
- **自定义 404**（`frontend/public/404.html`）：非 Hash 子路径访问自动重定向回 SPA。

## 视觉与设计契约

视觉规范见 [frontend/DESIGN.md](frontend/DESIGN.md)，完整产品约束见 [docs/prd](docs/prd/00-README.md)。研究台语义样式位于 research.css，tokens.css 为存量组件保留兼容令牌。三维按需加载，无自动旋转或无依据飞线。

## 文件结构

```
MAP/
├── frontend/                   # 主力前端（React 18 + TS + Vite + Tailwind v4）
│   ├── DESIGN.md               # 城市交通研究台视觉契约
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
