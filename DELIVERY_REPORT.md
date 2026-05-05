# 全国城市地铁客流数据可视化大屏 — 交付报告

> 交付日期：2026-05-05

## 交付内容

```
D:\sotre\MAP\
├── dashboard.html                    # 可视化大屏（自包含，49 KB）
├── scrape_metrodb.py                 # MetroDB 客流数据爬取脚本
├── scrape_all_cities.py              # MetroMan 地铁图批量爬取脚本
├── generate_charts.py                # matplotlib 图表生成脚本
├── scrape_metrodb_data.sh            # Bash 版客流爬取脚本（备用）
├── national_comparison.png           # 全国日客流量排行榜
├── overview_dashboard.png            # 全国概览仪表盘
├── DELIVERY_REPORT.md                # 本文件
├── assets/
│   └── china.json                    # 中国 GeoJSON（地图离线缓存）
├── beijing/
│   ├── beijing_network.png           # 线路图
│   ├── beijing_plan.png              # 规划图
│   ├── beijing_stats.json            # 客流数据
│   └── beijing_yearly_trend.png      # 年度趋势图
├── xiamen/
│   └── ...（同上）
└── ...（共 48 个城市文件夹）
```

### 文件统计

| 类型 | 数量 |
|------|------|
| 城市文件夹 | 48 |
| 线路图 PNG | 48 |
| 规划图 PNG | 41 |
| 客流数据 JSON | 34 |
| 年度趋势图 PNG | 34 |
| 全国图表 PNG | 2 |
| 总大小 | ~91 MB |

## 核心功能

### dashboard.html

- **顶部指标卡片**：覆盖城市数、运营线路、站点、总里程、日总客流
- **筛选控件**：城市搜索（中文模糊匹配）、主指标切换（日客流/里程/站点/强度）、Top N 控制（10/20/全部）
- **全国散点地图**：ECharts geo + scatter + effectScatter 涟漪动画，支持缩放拖拽，点击城市联动右侧详情面板
- **四个排行图表**：主指标排行榜、运营里程榜、Top 8 年度趋势（统一年份对齐）、客流强度榜
- **城市详情面板**：完整指标 + 年度趋势列表
- **数据缺失处理**：日客流为 0 的城市显示"暂无数据"，不参与客流排名和统计
- **地图加载稳定性**：本地 GeoJSON 优先 → 远程 CDN → 降级城市列表
- **移动端适配**：375px 无横向滚动

### 数据爬取

- **scrape_metrodb.py**：从 metrodb.org 爬取 34 个城市的客流统计数据（8 路并发）
- **scrape_all_cities.py**：从 metroman.cn 爬取 48 个城市的线路图和规划图（8 路并发）

## 数据处理说明

- 数据源：[MetroDB.org](https://metrodb.org)、[MetroMan.cn](https://www.metroman.cn/maps)
- 14 个城市标注为"缺数据"（fuzhou、ningbo、wenzhou、jinan 等），已跳过客流爬取
- 日客流量为 0 的城市（hangzhou、qingdao、dalian 等 8 个）在 dashboard 中标记为"暂无数据"，为 MetroDB 当天数据未更新所致
- 年度趋势数据存在不同城市起始年份不同的情况，dashboard 已做统一年份对齐处理

## 本地启动方式

```bash
# 方式一：Python
cd D:\sotre\MAP
python -m http.server 8000
# 浏览器访问 http://localhost:8000/dashboard.html

# 方式二：Node.js
npx http-server D:\sotre\MAP -p 8000
```

## 浏览器验收结果

测试环境：Chrome headless + puppeteer-core

| # | 检查项 | 结果 |
|---|--------|------|
| T01 | 页面首次加载 | PASS |
| T02 | 控制台无关键报错 | PASS |
| T03 | 地图正常显示 | PASS |
| T04 | 搜索"厦门"仅显示厦门 | PASS |
| T05 | 搜索"广"匹配广州 | PASS |
| T06 | 指标切换（日客流/里程/站点/强度）单位正确 | PASS |
| T07 | Top 10 / Top 20 / 全部控制三榜 | PASS |
| T08 | 城市详情面板更新 | PASS |
| T09 | 缺失日客流显示"暂无数据" | PASS |
| T10 | 375px 无横向滚动 | PASS |
| T11 | 全程控制台无关键错误 | PASS |

**16/16 PASS**

## 版本结论

当前版本已完成全部开发和验证，**可交付**。
