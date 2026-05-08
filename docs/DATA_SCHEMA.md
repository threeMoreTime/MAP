# 数据结构说明

本文档描述项目中 `{city}_stats.json` 文件的完整数据结构、字段语义及相关处理规则。

---

## 1. {city}_stats.json 完整字段表

| 字段名 | 类型 | 单位 | 可为空 | 说明 |
|--------|------|------|--------|------|
| `city` | string | — | 否 | 城市拼音代码，如 `xiamen`，用作文件名和唯一标识 |
| `city_cn` | string | — | 否 | 城市中文名称，如 `厦门` |
| `scrape_date` | string | — | 否 | 数据抓取日期，格式 `YYYY-MM-DD`，如 `2026-05-05` |
| `operating_lines` | number | 条 | 是 | 当前运营线路数量 |
| `lines_under_construction` | number | 条 | 是 | 在建线路数量（部分城市可能无此数据） |
| `operating_stations` | number | 座 | 是 | 当前运营车站总数 |
| `operating_mileage_km` | number | 公里 | 是 | 运营总里程，支持一位小数，如 `98.4` |
| `daily_ridership_wan` | number | 万人次 | 是 | 日均客运量（万人次），支持两位小数，如 `88.87` |
| `ridership_intensity` | number | 万人次/公里 | 是 | 客运强度 = 日均客运量 / 运营里程，如 `0.903` |
| `peak_ridership_wan` | number | 万人次 | 是 | 历史最高单日客运量（万人次），如 `112.14` |
| `peak_ridership_date` | string | — | 是 | 历史最高日客运量对应日期，格式 `YYYY-MM-DD`，如 `2025-12-31` |
| `yearly_avg_ridership` | object | — | 是 | 年度平均客运量数据，结构见下文 |

### yearly_avg_ridership 对象结构

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `years` | number[] | 年份数组，如 `[2018, 2019, 2020, ...]` |
| `values` | number[] | 对应年份的日均客运量（万人次），与 `years` 等长 |

---

## 2. daily_ridership_wan <= 0 的语义

当 `daily_ridership_wan` 的值为 `0`（或负值）时，其语义为**数据未更新或缺失**，而非实际零客运量。

### 原因

- MetroDB.org 部分城市页面在 `rollNum()` 中将未更新的客运量字段填充为 `0`
- 这些城市实际拥有运营中的地铁系统，客运量不可能为零

### 处理方式

在数据消费端应按以下规则处理：

```
if daily_ridership_wan is null OR daily_ridership_wan <= 0:
    视为 "暂无数据"
    不纳入客运量相关的统计汇总
    不参与客运强度等衍生指标的计算
```

### 受影响城市

杭州、青岛、大连、呼和浩特、太原、芜湖、无锡、南通共 8 个城市的 `daily_ridership_wan` 值为 `0`，详见 [DATA_SOURCES.md](./DATA_SOURCES.md) 第 4 节。

---

## 3. yearly_avg_ridership 年份对齐规则

### 3.1 不同城市不同起始年份

各城市地铁开通时间不同，MetroDB 收录的数据起始年份也各不相同。例如：

- 北京：可能从 2014 年开始有数据
- 厦门：从 2018 年（开通年）开始有数据
- 新开通城市：可能仅有近 1-2 年数据

因此 `yearly_avg_ridership.years` 数组的长度和范围因城市而异。

### 3.2 Dashboard 合并展示规则

当仪表盘需要展示多城市年度趋势对比时，采用以下对齐策略：

1. **年份取并集**：遍历所有城市的 `years` 数组，取全部年份的并集作为统一横轴
2. **空值填充**：对于某个城市在特定年份不存在数据的情况，使用 `null` 填充对应的 `values` 位置
3. **不进行插值**：缺失的年份不做线性插值或前后值填充，保持 `null` 以反映真实数据覆盖情况
4. **图表展示**：折线图中 `null` 值处断开连线，不绘制数据点

### 3.3 示例

假设城市 A 有 `[2020, 2021, 2022, 2023]` 的数据，城市 B 有 `[2022, 2023, 2024]` 的数据：

```
统一横轴: [2020, 2021, 2022, 2023, 2024]

城市 A: [10.5, 12.3, 15.0, 16.2, null]
城市 B: [null, null,  8.1,  9.5, 11.0]
```

---

## 4. 厦门完整示例 JSON

以下是厦门市 `xiamen_stats.json` 的完整数据结构示例：

```json
{
  "city": "xiamen",
  "city_cn": "厦门",
  "scrape_date": "2026-05-05",
  "operating_lines": 3,
  "lines_under_construction": 2,
  "operating_stations": 74,
  "operating_mileage_km": 98.4,
  "daily_ridership_wan": 88.87,
  "ridership_intensity": 0.90315040650407,
  "peak_ridership_wan": 112.14,
  "peak_ridership_date": "2025-12-31",
  "yearly_avg_ridership": {
    "years": [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    "values": [11.42, 15.94, 31.22, 46.56, 53.98, 67.51, 72.91, 75.68, 75.16]
  }
}
```

### 字段解读

- 厦门地铁当前运营 **3 条线路**，在建 **2 条线路**
- 运营车站 **74 座**，运营里程 **98.4 公里**
- 日均客运量 **88.87 万人次**，客运强度 **0.903 万人次/公里**
- 历史最高日客运量 **112.14 万人次**，出现在 **2025-12-31**
- 年度数据从 **2018 年**（地铁首条线路开通年份）起，至 **2026 年**共 9 个年份
- 2020 年数据受疫情影响有明显跃升（统计口径变化或新线开通），后续年份持续增长

---

## 5. data/latest/metro_stats.json

汇总所有城市客流统计数据的集合文件，由 `scripts/build_data_index.py` 自动生成。

### 顶层字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `generated_at` | string | ISO 8601 生成时间 |
| `source` | string | 数据来源（`metrodb.org`） |
| `city_count` | number | 包含数据的城市数量 |
| `no_daily_data_cities` | string[] | 日客流为 0 或缺失的城市列表 |
| `items` | object[] | 城市数据数组，每项结构同第 1 节的 `{city}_stats.json` |

### 说明

- `items` 中每项的字段结构与第 1 节完全一致
- 不改变原始 `{city}_stats.json` 的任何值
- 可通过 `scripts/validate_data.py` 校验完整性

---

## 6. data/latest/city_assets_index.json

索引所有城市目录中的资源文件（PNG、JSON），由 `scripts/build_data_index.py` 自动生成。

### 顶层字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `generated_at` | string | ISO 8601 生成时间 |
| `city_count` | number | 索引城市总数 |
| `items` | object[] | 城市资源数组 |

### items 中每项字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `city` | string | 城市拼音代码 |
| `city_cn` | string | 城市中文名 |
| `dir` | string | 城市目录名 |
| `has_network_map` | boolean | 是否有线路图 |
| `network_map_path` | string\|null | 线路图相对路径（如 `cities/beijing/beijing_network.png`） |
| `has_plan_map` | boolean | 是否有规划图 |
| `plan_map_path` | string\|null | 规划图相对路径 |
| `has_stats` | boolean | 是否有客流数据 |
| `stats_path` | string\|null | 客流数据相对路径 |
| `has_yearly_trend` | boolean | 是否有年度趋势图 |
| `yearly_trend_path` | string\|null | 年度趋势图相对路径 |

---

## 7. data/latest/manifest.json

记录当前数据层整体统计信息，由 `scripts/build_data_index.py` 自动生成。

### 字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `generated_at` | string | ISO 8601 生成时间 |
| `version` | string | 数据版本号 |
| `stats_city_count` | number | 有客流数据的城市数量 |
| `asset_city_count` | number | 有资源索引的城市数量 |
| `network_map_count` | number | 线路图总数 |
| `plan_map_count` | number | 规划图总数 |
| `yearly_trend_count` | number | 年度趋势图总数 |
| `no_daily_data_count` | number | 缺失日客流城市数量 |
| `no_daily_data_cities` | string[] | 缺失日客流城市列表 |
| `dashboard_file` | string | 大屏文件名 |
| `data_files` | string[] | 数据文件相对路径列表 |

---

## 8. data/schema/metro_stats.schema.json

`metro_stats.json` 的 JSON Schema（draft-07），定义了完整的字段类型、约束和描述。可用于自动化校验。
