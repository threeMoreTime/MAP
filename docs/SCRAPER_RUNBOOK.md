# 爬虫运行手册

## 环境要求

| 依赖 | 说明 |
|------|------|
| Python 3 | 所有脚本的运行环境 |
| curl | bash 版本脚本所需（可选） |
| matplotlib | `generate_charts.py` 依赖，需单独安装 |

安装 matplotlib：

```bash
pip install matplotlib
```

---

## 运行 scrape_all_cities.py

**功能**：从 metroman.cn 抓取全国 48 个城市的地铁线路图和规划图。

**命令**：

```bash
python scrape_all_cities.py
```

**预期输出**：

- 每个城市创建独立目录 `{city}/`
- 每个目录下生成 `{city}_network.png`（运营线路图）和 `{city}_plan.png`（规划线路图）
- 自动过滤小于 2KB 的占位图文件
- 运行耗时约 1 分钟（8 并发线程）

**目录结构示例**：

```
北京/
  北京_network.png
  北京_plan.png
上海/
  上海_network.png
  上海_plan.png
...
```

---

## 运行 scrape_metrodb.py

**功能**：从 metrodb.org 抓取各城市地铁客流量统计数据。

**命令**：

```bash
python scrape_metrodb.py
```

**预期输出**：

- 每个城市目录下生成 `{city}_stats.json`
- JSON 中包含从页面提取的 `rollNum()` 值和 `yearly_avg_ridership` 数组
- 自动跳过 `NO_DATA_CITIES` 列表中的无数据城市
- 8 并发线程加速抓取

**JSON 结构示例**：

```json
{
  "city": "北京",
  "yearly_avg_ridership": [
    {"year": 2020, "value": 750.3},
    {"year": 2021, "value": 820.1}
  ]
}
```

---

## 运行 generate_charts.py

**功能**：读取所有 `*_stats.json` 文件，使用 matplotlib 生成年度趋势图表。

**命令**：

```bash
pip install matplotlib
python generate_charts.py
```

**预期输出**：

- 每个城市的年度客流趋势 PNG 图表
- 全国对比图 `national_comparison.png`
- 总览仪表盘图 `overview_dashboard.png`
- 自动检测系统中的中文字体，图表标题和标签支持中文显示

**注意事项**：

- 必须先运行 `scrape_metrodb.py` 生成 `*_stats.json` 文件
- matplotlib 未安装时脚本会报错，请提前安装

---

## 输出文件说明

| 文件路径 | 来源脚本 | 说明 |
|----------|----------|------|
| `{city}/{city}_network.png` | scrape_all_cities.py | 城市运营线路图 |
| `{city}/{city}_plan.png` | scrape_all_cities.py | 城市规划线路图 |
| `{city}/{city}_stats.json` | scrape_metrodb.py | 城市客流量统计数据 |
| `{city}/{city}_yearly_trend.png` | generate_charts.py | 城市年度客流趋势图 |
| `national_comparison.png` | generate_charts.py | 全国城市客流对比图 |
| `overview_dashboard.png` | generate_charts.py | 总览仪表盘图 |

---

## 日志说明

| 日志文件 | 来源脚本 | 内容 |
|----------|----------|------|
| `scrape_log.txt` | scrape_all_cities.py | 记录城市线路图抓取的详细日志，包含成功/失败状态 |
| `scrape_metrodb_log.txt` | scrape_metrodb.py | 记录客流数据抓取的详细日志，包含跳过城市和解析错误 |

日志位于项目根目录，每次运行会追加记录。

---

## 常见失败原因

### 网络超时

- metroman.cn 或 metrodb.org 服务器响应慢，导致请求超时
- 建议检查网络连接后重新运行脚本
- 脚本使用 8 并发线程，部分城市失败不影响其他城市

### MetroDB 页面结构变更

- metrodb.org 的页面 HTML 或 JavaScript 结构发生变化
- `rollNum()` 提取逻辑可能失效，需要检查正则表达式是否匹配
- `yearly_avg_ridership` 数组格式变化也会导致解析失败

### matplotlib 中文字体

- 图表中文显示为方框或乱码
- 脚本会自动检测系统可用中文字体（如 SimHei、Microsoft YaHei 等）
- 若自动检测失败，需手动安装中文字体或修改脚本中的字体配置

---

## 重跑建议

- **直接重跑**：脚本会覆盖已有文件，无需手动删除
- **清理后重跑**：如需确保数据干净，建议先删除旧文件：

```bash
# 删除所有城市目录下的旧数据
find . -name "*_stats.json" -delete
find . -name "*_network.png" -delete
find . -name "*_plan.png" -delete
find . -name "*_yearly_trend.png" -delete
```

- **完整重跑顺序**：

```bash
python scrape_all_cities.py
python scrape_metrodb.py
python generate_charts.py
```

三个脚本按顺序执行，后者依赖前者的输出文件。
