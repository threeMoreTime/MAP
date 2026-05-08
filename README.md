# 全国城市地铁客流数据可视化大屏

基于 ECharts 的中国 50 城市地铁客流数据可视化大屏，支持地图散点、排名图表、趋势折线、搜索筛选等交互功能，可离线运行。

> **当前版本：v1.1.0** | 浏览器验证：16/16 PASS

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

### 方式一：Python（推荐）

```bash
cd /path/to/MAP
python -m http.server 8000
# 浏览器打开 http://localhost:8000/dashboard.html
```

### 方式二：Node.js

```bash
npx http-server . -p 8000 -c-1
# 浏览器打开 http://localhost:8000/dashboard.html
```

## 文件结构

```
MAP/
├── dashboard.html              # 可视化大屏（自包含 ~62KB）
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
│   ├── scrape_metrodb_data.sh      # Bash 版爬取脚本（备用）
│   └── generate_charts.py          # matplotlib 图表生成
│
├── scripts/                    # 构建/校验/验收脚本
│   ├── build_data_index.py         # 数据索引构建
│   ├── validate_data.py            # 数据完整性校验
│   ├── check_dashboard_syntax.py   # JS 语法检查
│   ├── run_acceptance.py           # 一键总验收
│   └── acceptance_dashboard.js     # 浏览器真实验收
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
# 一键运行全部验收（数据构建 + 校验 + 语法检查 + 浏览器测试）
python scripts/run_acceptance.py

# 也可以分步运行
python scripts/validate_data.py           # 数据校验
python scripts/check_dashboard_syntax.py  # JS 语法检查
node scripts/acceptance_dashboard.js      # 浏览器真实验收

# 或使用 npm scripts
npm run test:data          # 数据校验
npm run test:dashboard     # 浏览器验收
npm run test:acceptance    # 全部验收
```

验收依赖：Node.js + puppeteer-core（`npm install`）+ Chrome 浏览器。

## 验收状态


| 检查项     | 结果             |
| ------- | -------------- |
| 浏览器功能验证 | **16/16 PASS** |
| 城市目录覆盖  | 50/50          |
| 客流数据覆盖  | 34 城           |
| 规划图覆盖   | 41 城           |


## 更多文档

- [文档索引](docs/INDEX.md) — 完整文档目录
- [开发路线图](docs/ROADMAP.md) — 后续迭代计划

## 许可证

本项目数据来源于公开网站，仅供学习与研究使用。