# MAP 数据收录完整度说明与指标规范

本文件定义了 MAP (全国城市地铁客流数据可视化大屏) 项目中各城市地铁数据收录的**完整度评分规则、收录完整度等级**以及质量大纲 JSON 规范。

> [!IMPORTANT]
> **收录定义与法律免责声明**：
> 1. **数据非官方运营评价**：本评分纯粹用于评价**本开源可视化项目对该城市地铁指标收录和图片资源收集的完整程度**，绝对不代表该城市的实际地铁运营水平或城市建设/经济发展水平。
> 2. **数据快照非实时数据**：本项目收录的数据均为历史公开资料的静态整理快照，不属于实时地铁客流监测，亦不构成任何正式的商业或学术决策依据。
> 3. **缺失项非硬件缺失**：如果某城市被标为“收录完整度低”或“缺失客流数据”，仅代表项目组暂未收集到该城市的有效历史客流数据，绝不代表该城市没有地铁或未开通客流。

---

## 1. 数据收录完整度评分规则 (Score 0-100)

为了量化评价每个城市地铁数据收录的齐备程度，建立以 100 分为基准的加权算法：

| 细分维度 | 完整度判断条件 | 权重分值 | 释义与标准 |
| :--- | :--- | :---: | :--- |
| **基础统计** | `has_stats` 存在 | **20** | 城市拥有客流与运营 stats 基础物理记录 |
| **日客流量** | `daily_ridership_wan > 0` | **20** | 拥有日均客流量公开展示数据（非 0 占位符） |
| **年度趋势** | `yearly_avg_ridership` 完整 | **15** | 拥有历史多年均值客流趋势的年份与值数组对齐 |
| **线路图资源** | `has_network_map` 为 True | **15** | 收录了该城市高清地铁运营路线图图片 |
| **规划图资源** | `has_plan_map` 为 True | **15** | 收录了该城市高清地铁中长期建设规划图图片 |
| **高清封面** | `cover_status` 为 `downloaded` | **10** | 收录了该城市版权合规的真实高清实景封面大图 |
| **物理指标** | `operating_complete` 完整 | **5** | 运营线路数、运营站点数、运营里程数均非空且大于 0 |
| **总分** | — | **100** | — |

---

## 2. 收录完整度等级划分 (Quality Levels)

依据综合得分，将城市的收录状态归口划分为以下三个收录完整度等级：

- **完整度高 (high)**：评分 $\ge 85$
  - 数据与图片均非常完备，用户体验极佳。
- **完整度中 (medium)**：评分 $60 - 84$
  - 拥有核心指标，但可能缺失年度趋势、封面图、或中长期规划图中的某几项。
- **完整度低 (low)**：评分 $< 60$
  - 仅有部分基础记录，或完全未收集到任何客流或图片资源（通常为 16 个已知暂无统计记录的城市）。

---

## 3. `quality_report.json` 数据规格

自动化脚本 `scripts/build_quality_report.py` 会在每次构建时重新产出汇总的 `quality_report.json` 并存放于 `data/latest/` 目录下。

### 3.1 字段字典定义

- `schema_version` (string): 架构版本号，目前为 `quality-report.v1`。
- `generated_at` (string): 生成的 UTC 时间戳（ISO 8601 格式）。
- `summary` (object): 全量大纲统计，包含：
  - `city_count` (int): 城市总索引数 (50)。
  - `stats_city_count` (int): 有统计记录城市数 (34)。
  - `daily_ridership_display_count` (int): 有客流展示值城市数 (23)。
  - `no_daily_display_count` (int): 暂无客流展示值城市数 (27)。
  - `stats_without_daily_count` (int): 有统计但暂无客流城市数 (11)。
  - `no_stats_count` (int): 完全无统计城市数 (16)。
  - `network_map_count` (int): 线路图覆盖城市数 (48)。
  - `plan_map_count` (int): 规划图覆盖城市数 (41)。
  - `cover_downloaded_count` (int): 高清封面已收录城市数 (49)。
  - `cover_fallback_count` (int): 封面降级城市数 (1)。
  - `high_quality_count` (int): 完整度高城市数。
  - `medium_quality_count` (int): 完整度中城市数。
  - `low_quality_count` (int): 完整度低城市数。
- `cities` (array): 50 个城市的完整度对象数组（按得分从高到低排序），每个元素包含：
  - `city` (string): 城市拼音 key。
  - `city_cn` (string): 城市中文名。
  - `quality_score` (int): 数据收录完整度得分 (0-100)。
  - `quality_level` (string): 收录完整度等级 (`high` / `medium` / `low`)。
  - `has_stats` (bool): 是否有统计记录。
  - `has_daily_ridership` (bool): 是否有客流展示值。
  - `has_yearly_trend` (bool): 是否有年度客流趋势。
  - `has_network_map` (bool): 是否有运营路线图。
  - `has_plan_map` (bool): 是否有中长期规划图。
  - `cover_status` (string): 封面收录状态。
  - `missing_items` (array): 具体缺失的物理项目文案。
  - `warnings` (array): 温和业务警告（如暂未收集到客流，处于采集中）。
  - `risk_flags` (array): 数据物理异常标记（如里程为零或站点缺失）。
- `missing_groups` (object): 数据缺失大类聚合，便于前台进行网格快速索引呈现。

---

## 4. 后台构建与消费链路

1. **自动生成**：数据索引构建器 `scripts/build_data_index.py` 在运行末尾会自动加载 `scripts/build_quality_report.py` 对最新的数据沙盒执行计算，并输出数据质量报告。如果生成过程报错抛出异常，整个构建任务将立刻宣告失败，确保 CI 安全。
2. **防噪写入机制**：质量报告文件写入磁盘前会过滤 `generated_at` 时间戳并执行深字典比对。如果内容无任何实质变化，则跳过文件物理覆写，以零噪声污染（No generated_at-only changes）的形式保持 Git 主干纯净。
3. **前端消费**：前端 React 核心数据层 `useMetroData.ts` 会异步拉取 `quality_report.json` 数据并注入到 `MetroDataState` 中。即使拉取遭遇 404 或网络故障，系统也会启动 `catch` 机制优雅降级，防止主干页面白屏崩溃。
