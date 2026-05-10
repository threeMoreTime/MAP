# 数据来源说明

本文档记录项目中所有地铁数据的来源站点、提取方式、字段口径及已知限制。

---

## 0. 四种数据来源总览

| 来源类别 | 数据源 | 说明 |
|----------|--------|------|
| 客流统计 | MetroDB.org 公开页面 | 覆盖 34 个城市，日客流量为历史统计值（非实时） |
| 线路图/规划图 | 本地 `cities/` 资源目录 | 路径由 `city_assets_index.json` 记录，覆盖 48 个线路图、41 个规划图 |
| 城市封面图 | Wikimedia Commons / Wikidata | 溯源信息记录于 `city-covers/manifest.json`，许可证为 CC0 / CC BY / CC BY-SA |
| 地图底图 | `assets/china.json` | 中国行政区划 GeoJSON，支持本地 → 远程 CDN → 城市列表三级降级 |

---

## 1. MetroDB.org 字段来源

### 1.1 rollNum() 嵌入统计

MetroDB.org 页面内嵌了 `rollNum()` JavaScript 函数调用，其中直接包含以下运营统计字段：

| 字段 | 说明 |
|------|------|
| `operating_lines` | 运营线路数 |
| `operating_stations` | 运营车站数 |
| `operating_mileage_km` | 运营里程（公里） |
| `daily_ridership_wan` | 日均客运量（万人次） |
| `ridership_intensity` | 客运强度（万人次/公里） |
| `peak_ridership_wan` | 历史最高日客运量（万人次） |
| `peak_ridership_date` | 历史最高日客运量对应日期 |

**提取方式**：通过解析 HTML 页面中 `<script>` 标签内的 `rollNum(...)` 调用，使用正则表达式匹配参数提取各字段值。

### 1.2 yearly_avg_ridership 年度数据

部分城市页面包含年度平均客运量数据，以 JSON 数组形式呈现：

- `years`：年份列表，如 `[2018, 2019, 2020, ...]`
- `values`：对应年份的日均客运量值（万人次）

不同城市的起始年份不同，取决于该城市地铁开通时间以及 MetroDB 收录数据的完整程度。

### 1.3 15 天加密数据（不可提取）

MetroDB.org 页面还包含近 15 天的每日客运量数据，但该数据以加密/混淆方式嵌入，**当前无法有效提取**。页面使用动态加载和加密传输机制，直接抓取无法还原明文数据。

---

## 2. MetroMan.cn 地图资源来源

### 2.1 地图图片 URL 模式

MetroMan.cn 提供地铁线路图和规划图的在线浏览，底层使用 **OpenSeadragon** 深度缩放图片查看器。

可直接访问的静态 PNG 图片遵循以下 URL 模式：

```
https://metroman.cn/assets/img/metro/{map|plan}/routemap_{code}_cn.png
```

其中：

- `{map|plan}`：`map` 为现状运营线路图，`plan` 为规划线路图
- `{code}`：城市拼音代码，如 `xiamen`、`shanghai`、`beijing` 等

### 2.2 OpenSeadragon 深度缩放

网页端通过 OpenSeadragon 加载高分辨率 DZI（Deep Zoom Image）格式的线路图，支持无级缩放和平移。如需获取高清大图，需要通过 OpenSeadragon 的 tile 服务拼接完整图像。

---

## 3. 缺数据城市列表

以下城市在 MetroDB.org 上**无运营统计数据**（页面不包含 `rollNum()` 调用或数据为空）：

| 序号 | 城市 | 拼音代码 |
|------|------|----------|
| 1 | 福州 | fuzhou |
| 2 | 宁波 | ningbo |
| 3 | 温州 | wenzhou |
| 4 | 济南 | jinan |
| 5 | 洛阳 | luoyang |
| 6 | 徐州 | xuzhou |
| 7 | 乌鲁木齐 | urumqi |
| 8 | 香港 | hongkong |
| 9 | 澳门 | macau |
| 10 | 高雄 | kaohsiung |
| 11 | 台中 | taichung |
| 12 | 台北 | taipei |
| 13 | 金华 | jinhua |
| 14 | 台州 | taizhou |
| 15 | 佛山 | foshan |
| 16 | 绍兴 | shaoxing |

> 共计 **16 个城市**缺数据，上述城市目录下无 `{city}_stats.json` 文件。其中佛山、绍兴为空目录（MetroMan 亦无对应资源）。

---

## 4. daily_ridership_wan 为 0 的处理规则

部分城市在 MetroDB.org 上可抓取到运营统计字段，但 `daily_ridership_wan` 值为 `0`。这些城市包括：

| 序号 | 城市 | 拼音代码 |
|------|------|----------|
| 1 | 杭州 | hangzhou |
| 2 | 青岛 | qingdao |
| 3 | 大连 | dalian |
| 4 | 呼和浩特 | hohhot |
| 5 | 太原 | taiyuan |
| 6 | 芜湖 | wuhu |
| 7 | 无锡 | wuxi |
| 8 | 南通 | nantong |

**处理规则**：`daily_ridership_wan` 值为 `0` 时，**不视为实际零客运量**，而是表示该数据项**未更新或缺失**。在数据展示和计算时应将其等同于 `null` 处理：

- 客运量相关指标（日均客运量、客运强度等）应跳过该城市，不纳入统计汇总
- 仪表盘中应展示为"暂无数据"或类似提示，而非显示 `0`
- 相关衍生计算（如全国平均客运强度）应排除这些城市

---

## 5. 数据引用与版权风险提示

### 5.1 数据公开性

MetroDB.org 和 MetroMan.cn 均为公开可访问的网站，所提供的地铁运营数据和线路图为公开发布信息。本项目通过自动化方式采集这些公开数据，仅供个人学习和研究使用。

### 5.2 抓取频率与服务器压力

- 自动化抓取应设置合理的请求间隔（建议不低于 3-5 秒/次），避免对源站服务器造成过大压力
- 不应在短时间内发起大量并发请求
- 建议缓存已抓取的数据，避免重复请求相同页面

### 5.3 版权与使用限制

- **本项目数据仅供个人学习、研究使用，严禁用于任何商业用途**
- MetroDB.org 和 MetroMan.cn 对其网站内容拥有相应权利，引用数据应在合理使用范围内
- 线路图图片版权归原网站及地图制作方所有，不可擅自转载或用于商业发布
- 运营统计数据可能存在滞后或误差，不应作为正式决策依据
- 如需将数据用于公开发布或分析报告，应注明数据来源

### 5.4 数据时效性

- 数据抓取日期记录在每个 JSON 文件的 `scrape_date` 字段中
- 运营数据（线路数、里程等）会随新线开通而变化，建议定期更新
- 日均客运量等统计指标通常按年度更新，存在一定滞后

---

## 6. 字段口径说明

### 6.1 MetroCity 核心字段

| 字段名 | 说明 | 单位 |
|--------|------|------|
| `daily_ridership_wan` | 统计日期当日全线网进站客流总量 | 万人次 |
| `operating_mileage_km` | 已开通运营线路的总里程 | km |
| `operating_stations` | 已开通运营的车站数量 | 座 |
| `operating_lines` | 已开通运营线路条数 | 条 |
| `ridership_intensity` | 日客流量 / 运营里程 | 万/km |
| `peak_ridership_wan` | 历史单日客流量最高纪录 | 万人次 |
| `peak_ridership_date` | 历史最高客流量对应日期 | — |
| `yearly_avg_ridership` | 年度日均客运量（含 `years` / `values` 数组） | 万人次 |

### 6.2 CityAsset 资源字段

| 字段名 | 说明 |
|--------|------|
| `network_map_path` | 运营线路图本地路径（如 `cities/beijing/beijing_network.png`） |
| `plan_map_path` | 规划线路图本地路径（如 `cities/beijing/beijing_plan.png`） |

---

## 7. 免责声明

- 数据来自公开页面与本地整理，本项目**不是实时系统**
- 不同城市的统计口径可能存在差异（如是否含市域铁路、有轨电车等）
- 部分城市缺少客流数据或规划图资源
- 数据仅供学习、研究和可视化演示使用
- **不构成官方数据发布或决策依据**
- 使用本平台数据所产生的一切后果由使用者自行承担

---

## 8. 城市封面图版权与署名

- 所有封面图的 `source_url`、`license`、`author`、`attribution` 字段记录于 `city-covers/manifest.json`
- CC BY / CC BY-SA 授权图片需保留署名信息
- CC BY-SA 图片的再分发需遵守相同协议条款
- 线路图/规划图版权归原始资源提供方所有，按原始资源说明使用
- 不得删除 manifest 中的来源与协议字段
