# 全国城市地铁客流数据可视化大屏

基于 ECharts 的中国 50 城市地铁客流数据可视化大屏，支持地图散点、排名图表、趋势折线、搜索筛选等交互功能，可离线运行。

> **当前版本：v1.2.1-dev** | Phase 5.6 & Phase 5.6.1 数据覆盖口径与文案统一已完成，并通过远端 CI/CD 与线上冒烟验证 | [在线演示 🌐](https://threemoretime.github.io/MAP/)

---

## 功能特性

- **地图散点** — 全国地铁城市地理分布与客流热力展示
- **排名图表** — 各城市客流量横向对比柱状图
- **趋势折线** — 单城市历史客流年度趋势变化
- **搜索筛选** — 支持按城市名称快速检索与定位
- **移动端适配** — 响应式布局，兼容手机与平板访问
- **离线可用** — 内嵌全部数据与依赖，零网络依赖即可运行

## 数据来源


| 来源                                      | 说明          |
| --------------------------------------- | ----------- |
| [MetroDB.org](https://metrodb.org/)     | 各城市年度客流统计数据 |
| [MetroMan.cn](https://www.metroman.cn/) | 城市地铁网络图与规划图 |


## 快速开始

主力前端为 `frontend/`（React + TypeScript + Vite）：

```bash
cd frontend
npm ci
npm run dev
# 浏览器打开开发服务器地址（默认 http://localhost:5173）
```

## 文件结构

```
MAP/
├── frontend/                   # 主力前端（React + TS + Vite）
├── scrape_subway_route_map.py  # 线路图爬取脚本
├── 爬取图片资源.md              # 线路图爬取文档
├── README.md
├── CHANGELOG.md
├── DELIVERY_REPORT.md
├── package.json
├── .gitignore
│
├── cities/                     # 50 个城市数据目录
│   ├── beijing/
│   │   ├── beijing_network.png     # 线网图
│   │   ├── beijing_plan.png        # 规划图
│   │   ├── beijing_stats.json      # 客流统计数据
│   │   └── beijing_yearly_trend.png # 年度趋势图
│   ├── shanghai/
│   └── ...（共 50 个城市）
│
├── assets/                     # 静态资源
│   └── china.json              # 中国地图 GeoJSON 数据
│
├── data/                       # 统一数据层
│   ├── latest/
│   │   ├── metro_stats.json        # 34 城市客流汇总
│   │   ├── city_assets_index.json  # 50 城市资源索引
│   │   └── manifest.json           # 数据层统计信息
│   └── schema/
│       └── metro_stats.schema.json # JSON Schema 定义
│
├── scrapers/                   # 数据采集脚本
│   ├── scrape_metrodb.py           # MetroDB 客流数据爬取
│   ├── scrape_all_cities.py        # 全城市规划图爬取
│   └── generate_charts.py          # matplotlib 图表生成
│
├── scripts/                    # 构建/校验脚本
│   ├── build_data_index.py         # 数据索引构建
│   ├── validate_data.py            # 数据完整性校验
│   └── diff_data_snapshot.py       # 数据快照对比
│
├── output/                     # 生成产物
│   ├── national_comparison.png     # 全国对比图
│   └── overview_dashboard.png      # 总览仪表盘图
│
├── docs/                       # 项目文档
│   ├── INDEX.md
│   ├── PROJECT_OVERVIEW.md
│   └── ...
│
└── .github/
    └── PULL_REQUEST_TEMPLATE.md
```

## 数据复现流程

按以下顺序执行脚本即可从零复现全部数据：

```bash
# 1. 爬取全部 50 城市的线网图与规划图
python scrape_subway_route_map.py

# 2. 爬取 MetroDB 客流数据（34 城市有数据）
python scrapers/scrape_metrodb.py

# 3. 生成各城市统计 JSON 与趋势图表
python scrapers/generate_charts.py

# 4. 打开大屏查看结果
python -m http.server 8000
```

或使用 npm scripts：

```bash
npm run scrape:cities       # 爬取城市线路图（或 python scrape_subway_route_map.py）
npm run scrape:metrodb      # 爬取客流数据
npm run generate:charts     # 生成图表
```

## 自动化验收

```bash
# 数据层校验（根目录）
npm run test:data

# React 前端（frontend/ 目录）
npm run typecheck       # 类型检查
npm run check:static    # 静态构建检查（T01-T09）
npm run test:ui         # React 前端浏览器验收（T01-T34）
```

验收依赖：Node.js + puppeteer-core（`npm ci`）+ Chrome 浏览器。

## 验收状态


| 检查项     | 结果             |
| ------- | -------------- |
| React UI 验收 | T01-T34 通过 |
| 城市目录覆盖  | 50/50          |
| 客流数据覆盖  | 34 城 (有统计记录) / 23 城 (有日客流展示) |
| 规划图覆盖   | 41 城           |


基于 React + TypeScript + Vite 的新版前端为**当前主力前端**，提供四页路由、城市详情、封面图、真实线路图/规划图、手势及滚轮平移缩放、版权署名展示等增强功能：

```bash
cd frontend
npm ci             # 安装依赖（自动同步数据）
npm run dev        # 启动开发服务器
npm run build      # 生产构建
npm run preview    # 预览构建结果
npm run check:static  # 静态构建检查（T01-T09）
npm run test:ui    # React 前端浏览器验收（T01-T25）
```

### CI/CD 与 Pages 部署 (Phase 5.1/5.6/5.6.1 已完成：自动 CI/CD 部署、线上 Smoke Test、数据可信度与数据口径文案统一均通过验证)

项目已集成完善的 GitHub Actions 持续集成与持续部署（CI/CD）安全闭环：
- **CI 流水线** (`.github/workflows/ci.yml`)：在向 `master` 分支推送（push）或提交拉取请求（PR）时自动触发运行。包含旧版基线验收 (`legacy-check`)、React 编译静态校验 (`react-check`)，以及独立的 React 真浏览器 UI 验收 (`react-ui-test`) 三个独立 Job。
- **自动 Pages CD 部署** (`.github/workflows/pages.yml`)：当向 `master` 分支 push 触发的 `CI` 成功跑通后，该部署工作流会**自动触发**（同时保留手动 `workflow_dispatch` 触发作为兜底和人工发布重新部署入口）。部署时精细拉取刚刚通过 CI 的 `head_sha` 对应的提交，排除带病代码上线。
- **线上 Smoke Test 冒烟测试**：Pages 部署成功后，Actions 会自动运行 `npm run test:pages` 脚本，拉起 Headless Chrome 对线上环境进行真浏览器冒烟验证，确保各功能路由可用、无阻断 404 控制台报错、以及图片资源加载符合预期。
- **自定义 404 错误页** (`frontend/public/404.html`)：极简静态科技风页面，用于在 GitHub Pages 环境下，对外部或第三方直接发起非 Hash 格式的子路径访问（例如直接打开/刷新 `/MAP/cities`）进行自动识别与修复，将其安全地重定向回 SPA 的 Hash 路由格式（如 `/MAP/#/cities`），避免 404 错误。

四页路由：
- `/#/` 或 `/#/dashboard` — 数据大屏
- `/#/cities` — 城市总览
- `/#/city/:id` — 城市详情（如 `/#/city/xiamen`）
- `/#/about` — 数据说明

## 更多文档

- [文档索引](docs/INDEX.md) — 完整文档目录
- [开发路线图](docs/ROADMAP.md) — 后续迭代计划

## 许可证

本项目数据来源于公开网站，仅供学习与研究使用。