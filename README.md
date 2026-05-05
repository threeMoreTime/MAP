# 全国城市地铁客流数据可视化大屏

基于 ECharts 的中国 48 城市地铁客流数据可视化大屏，支持地图散点、排名图表、趋势折线、搜索筛选等交互功能，可离线运行。

> **当前版本：v1.0.0** | 浏览器验证：16/16 PASS

---

## 功能特性

- **地图散点** — 全国地铁城市地理分布与客流热力展示
- **排名图表** — 各城市客流量横向对比柱状图
- **趋势折线** — 单城市历史客流年度趋势变化
- **搜索筛选** — 支持按城市名称快速检索与定位
- **移动端适配** — 响应式布局，兼容手机与平板访问
- **离线可用** — 内嵌全部数据与依赖，零网络依赖即可运行

## 数据来源

| 来源 | 说明 |
|------|------|
| [MetroDB.org](https://metrounion.org/) | 城市地铁网络图与规划图 |
| [MetroMan.cn](http://metroman.cn/) | 各城市年度客流统计数据 |

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
├── dashboard.html              # 可视化大屏（自包含 ~49KB）
├── scrape_all_cities.py        # 全城市规划图爬取脚本
├── scrape_metrodb.py           # MetroDB 客流数据爬取脚本
├── generate_charts.py          # 图表与统计数据生成脚本
├── scrape_metrodb_data.sh      # 爬取辅助 Shell 脚本
├── overview_dashboard.png      # 大屏预览截图
├── national_comparison.png     # 全国对比图截图
├── assets/
│   └── china.json              # 中国地图 GeoJSON 数据
├── beijing/                    # 示例城市目录
│   ├── beijing_network.png     # 线网图
│   ├── beijing_plan.png        # 规划图
│   ├── beijing_stats.json      # 客流统计数据
│   └── beijing_yearly_trend.png # 年度趋势图
├── shanghai/                   # 同上结构
│   └── ...
└── ...（共 48 个城市目录）
```

## 数据复现流程

按以下顺序执行脚本即可从零复现全部数据：

```bash
# 1. 爬取全部 48 城市的线网图与规划图
python scrape_all_cities.py

# 2. 爬取 MetroDB 客流数据（34 城市有数据）
python scrape_metrodb.py

# 3. 生成各城市统计 JSON 与趋势图表
python generate_charts.py

# 4. 打开大屏查看结果
python -m http.server 8000
```

## 验收状态

| 检查项 | 结果 |
|--------|------|
| 浏览器功能验证 | **16/16 PASS** |
| 城市目录覆盖 | 48/48 |
| 客流数据覆盖 | 34 城 |
| 规划图覆盖 | 41 城 |

## 更多文档

- [文档索引](docs/INDEX.md) — 完整文档目录
- [开发路线图](docs/ROADMAP.md) — 后续迭代计划

## 许可证

本项目数据来源于公开网站，仅供学习与研究使用。
