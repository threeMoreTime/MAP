# 更新日志

本文件记录项目的所有重要变更。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/)。

---

## [v1.1.0] - 2026-05-08

### 变更

- 项目目录结构全面优化
- 50 个城市目录从根目录收归至 `cities/` 子目录
- 爬虫脚本（`scrape_metrodb.py`、`generate_charts.py`）移至 `scrapers/` 目录
- 生成产物（`national_comparison.png`、`overview_dashboard.png`）输出至 `output/` 目录
- 更新所有脚本中的路径引用（`build_data_index.py`、`scrape_metrodb.py`、`generate_charts.py`）
- 更新 `package.json`，新增 `scrape:*` 和 `generate:*` npm scripts
- 更新全部项目文档中的路径引用（11 篇）
- 更新 `.gitignore`，适配新的日志文件路径

### 影响范围

| 变更项 | 说明 |
|--------|------|
| `cities/` | 50 个城市目录统一存放 |
| `scrapers/` | 数据采集与图表生成脚本 |
| `output/` | 生成产物（截图、对比图） |
| `scripts/` | 构建/校验/验收脚本（不变） |
| `data/` | 统一数据层（不变） |
| `docs/` | 项目文档（不变） |

---

## [v1.0.0] - 2026-05-05

### 已完成

- 完成 48 个城市地铁线网图与规划图的爬取存储（`scrape_all_cities.py`）
- 完成 34 个城市 MetroDB 客流数据的采集（`scrape_metrodb.py`）
- 完成各城市统计 JSON 与年度趋势图表的生成（`generate_charts.py`）
- 完成自包含可视化大屏 `dashboard.html`（~49KB，零外部依赖）
- 集成 ECharts 中国地图散点、城市排名柱状图、年度趋势折线图
- 支持搜索筛选、响应式移动端适配、离线运行

### 提交记录

| 提交哈希 | 说明 |
|----------|------|
| `79d4e71` | feat: 全国48城市地铁客流数据可视化大屏 |
| `df63e19` | chore: 忽略爬取运行日志 |

### 浏览器验证

全部 16 项功能测试通过：

| 序号 | 测试项 | 结果 |
|------|--------|------|
| 1 | 页面加载 | PASS |
| 2 | 中国地图散点渲染 | PASS |
| 3 | 城市散点点击交互 | PASS |
| 4 | 城市排名柱状图 | PASS |
| 5 | 年度趋势折线图 | PASS |
| 6 | 搜索筛选功能 | PASS |
| 7 | 城市数据面板展示 | PASS |
| 8 | 线网图加载 | PASS |
| 9 | 规划图加载 | PASS |
| 10 | 移动端响应式布局 | PASS |
| 11 | 离线运行 | PASS |
| 12 | 图表动画效果 | PASS |
| 13 | 数据统计准确性 | PASS |
| 14 | 多城市切换 | PASS |
| 15 | 页面性能 | PASS |
| 16 | 控制台无报错 | PASS |

**结果：16/16 PASS**
