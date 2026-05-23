# OpenSpec: Phase 6 数据增量更新与定期采集

## 1. 背景与问题

目前，MAP (全国城市地铁客流数据可视化大屏) 项目的数据资产（包括 50 个城市的地铁运营数据、年度日客流趋势、线路图/规划图及封面图等）均来源于某次特定历史时间的批量静态抓取快照。

为了保持项目数据资产的长效生命力，维持其数据的“最新可见度”，系统必须具备自动、长期的增量更新能力。然而，直接引入简易爬虫并简单挂载于定时任务会带来以下一系列严重的工程与架构缺陷：
1. **网络频繁骚扰与反爬升级风险**：高频（如每天/每周）的自动化爬虫不仅给 `metrodb.org` 和 `metroman.cn` 源站带去不道德的流量负担，极易引发源站部署 CAPTCHA 验证或高频封锁，甚至引发合规法律风险。
2. **时间戳变更噪声 (Diff Pollution)**：即使没有实质性数据变动，普通的爬虫也会在每次运行时无差别改写各城市的 `scrape_date` 以及构建产物中的 `generated_at` 时间戳。这将在 Git 提交记录中产生大量极其臃肿且无语义的 diff，污染提交树并让真正的数据演进脉络变得不可追踪。
3. **数据格式/类型损坏污染主干**：如果外部数据源格式由于未知原因发生微调、返回空值或白屏，在没有严格的容错与熔断机制下，爬虫会将这些“受污染的数据”直接写回磁盘，并在未经审计的情况下污染 master 分支，进而通过自动部署破坏线上生产环境。
4. **人工审核缺位**：直接 push master 会导致不具备“可审计性”、“可撤回性”与“零妥协拦截性”，严重违背了本项目 Phase 5.7 中确立的双前端质量合规红线。

---

## 2. 当前数据链路复核

### 2.1 整体数据抓取与生产路径
* **客流及运营指标数据**：源站 `MetroDB.org` $\longrightarrow$ `scrapers/scrape_metrodb.py` 抓取并提取 `rollNum` 和 `yearly_avg_ridership` $\longrightarrow$ 写入各城市目录 `cities/{city}/{city}_stats.json`。
* **物理数据汇总索引**：调用 `scripts/build_data_index.py` 扫描整个 `cities/` 目录，生成四个位于 `data/latest/` 及 `data/schema/` 下的构建产物。
* **前端资源增量同步**：开发或编译前触发 `node frontend/scripts/sync-data.cjs`，将数据及图片从根目录一键复制到 `frontend/public/` 下。
* **真浏览器渲染引擎**：主力 React 前端通过 `useMetroData.ts` 异步拉取上述 JSON 数据流并执行多端大屏渲染。

### 2.2 数据校验拦截机制
* **格式完整性校验**：通过运行 `npm run test:data`（底层为 `scripts/validate_data.py`），对生成的汇总数据执行必填字段、Schema 规则、物理资源路径存在性以及年度趋势数组等长对齐性校验。

### 2.3 `generated_at` 时间戳噪音源
* 在 `scripts/build_data_index.py` 中，运行 `build_metro_stats()`、`build_city_assets_index()` 和 `build_manifest()` 时，会自动获取当前的 UTC 时间并写入 `generated_at`。
* 虽然其内置了 `write_json_if_changed` 并在比对时使用 `strip_generated_at` 剔除了时间差异，但**一旦有任何城市的真实数据有哪怕一个字节的变化**，都会重新写回磁盘并更新 `generated_at`，这仍然会波及到全部汇总文件。

---

## 3. 目标与非目标

### 3.1 目标 (Objectives)
* **极低请求频率**：确立以“月度”为基准的极低频更新频率，提供手动一键式调试手段，规避被反爬。
* **零时间噪声污染**：在无实质内容变更的情况下，杜绝任何 `scrape_date` 或 `generated_at` 产生的 Git 空噪提交。
* **数据安全审计 PR**：严禁直接 push master。所有实质变更必须自动发起以 `data-update/update-YYYY-MM` 命名的 Pull Request，供人工差分审核。
* **数据异常零妥协熔断**：当抓取遭遇格式损坏、数据暴跌、关键字段降至 0 或 schema 校验失败时，自动断开流水线并输出严重报警报告，绝不产生 PR。
* **全绿 CI 回归联动**：生成的 PR 能够与现有的 CI (`legacy-check`, `react-check`, `react-ui-test`) 无缝结合，在人工 Merge 后平滑启动自动部署和 Smoke 冒烟。

### 3.2 非目标 (Non-Objectives)
* 本阶段**不**支持近 15 天加密高频客流数据的破解与实时展现（维持静态快照定位）。
* 本阶段**不**涉及对 `cities/` 下城市高清大图（图片资产）和 `city-covers` 的自动化月度高频爬取，本阶段更新核心仅限运营客流与 stats 数据。
* 本阶段**不**对旧版稳定基线 `dashboard.html` 进行任何视觉上的新需求开发。

---

## 4. 数据文件分层

为了更好地厘清职责，在 Phase 6 中，数据和配置被严格划分为以下三层：

```
+-----------------------------------------------------------------------------------+
| 1. 源数据层 (Source Data Layer)                                                    |
|    - 原始物理客流：cities/{city}/{city}_stats.json                                |
|    - 实景封面图源：assets/city-covers/manifest.json                                |
|    - 线路图规划图：cities/{city}/{city}_network.png, {city}_plan.png               |
+-----------------------------------------------------------------------------------+
                                         |
                                         v (自动化构建 / scripts/build_data_index.py)
+-----------------------------------------------------------------------------------+
| 2. 汇总构建层 (Consolidated Build Layer)                                            |
|    - 全量客流汇总：data/latest/metro_stats.json                                    |
|    - 资源物理索引：data/latest/city_assets_index.json                              |
|    - 数据大纲统计：data/latest/manifest.json                                       |
|    - 校验大纲 Schema：data/schema/metro_stats.schema.json                          |
+-----------------------------------------------------------------------------------+
                                         |
                                         v (前端同步 / frontend/scripts/sync-data.cjs)
+-----------------------------------------------------------------------------------+
| 3. 前端消费层 (Frontend Consumption Layer)                                         |
|    - frontend/public/data/latest/ -> SPA 数据 API 终点                             |
|    - frontend/public/cities/      -> 图片资源静态托管                              |
+-----------------------------------------------------------------------------------+
```

---

## 5. 实质变更判定规则

当爬虫运行后，我们将两份最新抓取的数据（当前 master 已有数据 VS 新采集出的临时数据）进行字段级深差分判定。只有满足以下任一条件时，才被判定为“**实质变更 (Substantive Change)**”，需要生成 PR：

1. **城市名额演进**：新增城市或删除城市文件夹。
2. **客流真实更新**：任意城市的最新 `daily_ridership_wan` 数值发生绝对值变动。
3. **运营数据扩展**：任意城市的 `operating_lines`、`operating_stations`、`operating_mileage_km` 或 `lines_under_construction` 指标发生数值增减。
4. **历史年度追加**：年度趋势 `yearly_avg_ridership` 的 `years` 数组追加入新年度，或者某年的 `values` 日客流量被订正/填补。
5. **历史峰值突破**：`peak_ridership_wan` 或 `peak_ridership_date` 被改写（表明城市打破历史最高客流记录）。
6. **图片资源变更**：`city_assets_index.json` 中 `has_network_map` / `has_plan_map` 从 `false` 变为 `true` (或反之)，或者 `network_map_path` 路径值发生重置。
7. **封面状态跃迁**：`city-covers/manifest.json` 中某个城市的状态发生改变（如从 `fallback` 升级为 `downloaded`，或者版权信息被订正）。

**💡 绝对不属于实质变更的噪声指标**：
* 仅仅只有各个城市 stats 中的 `scrape_date` 日期改变；
* 仅仅只有汇总文件 `metro_stats.json`、`city_assets_index.json`、`manifest.json` 中的 `generated_at` 时间戳改变；
* 没有任何字符改变的 JSON 缩进、空白行或字符格式化变动；
* 各城市在数组或 JSON 文件中的重新排序差异，但包含的核心数据元素完全一致。

---

## 6. `generated_at` 与 `scrape_date` 噪声处理策略

为了阻止时间噪声污染 Git History，我们将引入以下防噪拦截技术：

### 6.1 源站抓取防噪 (Scraper Guard)
在未来的实现中，改写 `scrapers/scrape_metrodb.py` 写入单个城市 JSON 的机制：
* 爬虫抓取新数据后，首先从磁盘读取原有的 `{city}_stats.json`。
* 剥离两者中的 `scrape_date` 字段，执行全字段的 Deep Equivalence 校验。
* **如果除 `scrape_date` 外的数据完全无变动，脚本将拒绝重写该 JSON 文件**，从而使 Git 检测不到该城市源文件的变化，也避免修改时间被刷新。

### 6.2 差分报告生成 (Diff Engine)
引入全新的命令行工具 `scripts/diff_data_snapshot.py`（详见下文第 11 节说明）。
* 该脚本会自动遍历比对变更前后的数据目录，内部显式过滤掉 `generated_at` 与 `scrape_date` 噪声字段，精准返回是否存在实质性内容差分，并向 CI 输出机器/人工双重报告。

---

## 7. 自动采集 Workflow 设计

我们将不会直接修改原 CI.yml，而是设计并新建专用的数据自动更新工作流 `.github/workflows/data-update.yml`。

### 7.1 工作流触发策略
```yaml
name: Scheduled Data Increment Update

on:
  schedule:
    # 默认建议：每月 1 号的 00:00 UTC（北京时间早上 08:00），以维持最低频、低骚扰的采集标准
    - cron: '0 0 1 * *'
  workflow_dispatch:
    # 允许项目维护者随时通过 Web UI 手动一键触发数据抓取与补全校验
    inputs:
      dry_run:
        description: '是否运行为 Dry Run 模式 (不触发 PR)'
        required: true
        default: 'false'
        type: boolean
```

### 7.2 Workflow 步骤与任务编排设计 (Draft)
```yaml
jobs:
  scheduled-update:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout Master Branch
        uses: actions/checkout@v4
        with:
          ref: master
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Python Environment
        uses: actions/setup-python@v5
        with:
          python-version: '3.10'
          cache: 'pip'

      - name: Set up Node.js Runtime
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Python & Node Dependencies
        run: |
          pip install -r scrapers/requirements.txt || pip install beautifulsoup4 lxml
          npm ci

      - name: Run Data Update Scraper (Staging / Dry-Run Mode)
        # 此处采用 dry-run 模式将新爬取的数据写入临时分发区，隔离真实数据区
        run: |
          python scripts/run_data_update.py --dry-run
          
      - name: Perform Data Integrity Validation
        # 对刚刚抓取的临时数据结构，强制执行 Schema、必填字段 and 资产完整性强校验
        run: |
          python scripts/validate_data.py --dir output/data-update-staging/
          
      - name: Compile and Run Consolidate Diff
        id: data-diff
        # 比对 data/latest 目录与 output/data-update-staging/
        # 该脚本将忽略 generated_at 等时间戳差异
        # 出口 Code: 0 代表无实质变化；10 代表有实质变化并输出报告；其余代表异常报错
        run: |
          python scripts/diff_data_snapshot.py --original data/latest/ --new output/data-update-staging/
        continue-on-error: false

      - name: Apply Staging Data (Write Mode)
        # 仅当 diff 判定有实质性数据更新（exit_code=10）时，将临时数据区写入真正的物理区
        if: steps.data-diff.outputs.has_substantive_changes == 'true'
        run: |
          python scripts/run_data_update.py --write
          # 重新编译最新的构建汇总产物
          python scripts/build_data_index.py

      - name: Generate Automated Pull Request
        # 采用 peter-evans/create-pull-request，将修改自动提交并拉起新 PR
        if: steps.data-diff.outputs.has_substantive_changes == 'true'
        uses: peter-evans/create-pull-request@v6
        with:
          token: ${{ secrets.DATA_UPDATE_BOT_TOKEN || secrets.GITHUB_TOKEN }}
          branch: data-update/update-${{ steps.data-diff.outputs.current_month }}
          commit-message: "data: update metro snapshot ${{ steps.data-diff.outputs.current_month }}"
          title: "data: update metro snapshot ${{ steps.data-diff.outputs.current_month }}"
          body: ${{ steps.data-diff.outputs.markdown_report }}
          labels: |
            data-pipeline
            automated-pr
          draft: false
```

---

## 8. 自动 PR 设计

### 8.1 严禁直接推送 Master
为了保障发布安全与双前端大屏数据一致性，数据采集流**严禁直接 commit push 到 master 分支**。一切实质性变更必须走 Pull Request (PR) 审批链路。

### 8.2 自动生成的 PR 结构规范
自动创建的 PR 必须提供高可读性的 MD 变更差分报告，报告内容模板格式如下：

```markdown
## 📊 自动数据采集月度差分报告 (data-update/update-2026-05)

本 PR 由 GitHub Actions 数据自动更新管道根据定期计划自动创建。数据格式及 Schema 健全性已通过 100% 校验。

### 1. 实质变更汇总 (Substantive Changes)
* **有实质数据变化的城市**：`2` 个城市发生数据演进
* **新增/移除城市**：无
* **线路图/规划图变化**：无
* **封面图状态变化**：无

---

### 2. 城市指标差文明细 (City-Level Diff Metrics)

| 城市拼音 | 城市中文 | 变更指标 | 采集前数据 (Before) | 新采集数据 (After) | 变更说明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **xiamen** | 厦门 | daily_ridership_wan | 88.87 万 | 92.15 万 | 📈 增量增长 (+3.28万) |
| **xiamen** | 厦门 | operating_stations | 74 座 | 76 座 | 站数开通 (+2座) |
| **beijing** | 北京 | yearly_avg_ridership | 2025 年缺值 | 追加 2025: 1102.4万 | 📅 年度趋势追加 |

---

### 3. 数据安全性校验检测结果
* [x] **JSON Schema 合规检测**：PASS
* [x] **物理文件路径链接检查**：PASS
* [x] **双端一致性本地回归 check**：PASS (16/16 E2E)
* [x] **generated_at-only 排除校验**：已过滤排除 48 个无噪城市
```

---

## 9. 数据校验与失败策略

为了捍卫“无瑕疵发布”底线，管道实施“**遇错即熔断**”的防御性数据校验体系：

```
                              [开始自动采集 update]
                                        |
                                        v
                            [爬取外部 HTML 运营数据]
                                        |
                                        v
                         [写入 output/data-update-staging/]
                                        |
                                        +-------------------------------+
                                        |                               |
                                        v                               v
                             [进行 JSON Schema 校验]         [进行异常数据熔断阈值检测]
                                        |                               |
                                        +---------------+---------------+
                                                        |
                                                        v
                                             [是否完全无 Error？]
                                                        |
                                     +------------------+------------------+
                                     | 是                                  | 否
                                     v                                     v
                       [scripts/diff_data_snapshot.py]           [❌ 触发熔断中止 (FAIL)]
                                     |                                     |
                         +-----------+-----------+                         v
                         |                       |            [输出错误原因报告至 Action Logs]
                  (有实质变更)               (无实质变更)                   |
                         |                       |                         v
                         v                       v                   [ ❌ 不创建 PR ]
                  [ 重新编译 build ]       [ 退出并提示 UNCHANGED ]
                         |                       |
                         v                       v
                  [ 自动创建 PR ]           [ 0-Exit 正常挂起 ]
```

### 9.1 数据突变阈值熔断 (Anomalous Spikes Guard)
脚本校验时引入边界限制，一旦超过以下安全阈值判定，校验强行报错失败，阻止 PR：
1. **城市名额缩水**：Stats 城市总数低于 `34`，或者 Assets 城市总数低于 `50`。
2. **客流暴跌**：有具体客流量的城市（23 城）中，任意城市的 `daily_ridership_wan` 相比原值出现大于 **50%** 的非预期断崖式暴跌（防范爬取到部分空值）。
3. **客流暴涨/异常极值**：任意城市的日客流骤增超过原值的 **2.5倍**，或者绝对客流数值超过 **2500 万/日**（防范数据源出现格式单位错位，如将万人次写为人次）。
4. **里程为零**：除已知无统计城市的 stats 外，原本大于 0 的 `operating_mileage_km` 突变为 0 或负数。
5. **年度历史年份断裂**：原有的 `yearly_avg_ridership.years` 数组发生了历史年份的删减，或是历史年份的数值发生了非向下兼容的改变。
6. **网络超时与空包率**：抓取失败（Timeout / CAPTCHA 封锁）的城市数量超过 5 个。

---

## 10. 安全与频率限制

为做道德的开源网络公民并保障自身资产安全，我们必须遵守以下规则：
1. **极低采集频率**：默认只在每月 1 号执行一次定时采集，严禁任何形式的每日甚至每小时轮询。
2. **渐进式请求间隔 (Polite Interval)**：爬虫爬取时，线程池数量最大限制为 2 或 3，且单次 HTTP 请求后强制引入 `time.sleep(3.0)` 至 `time.sleep(5.0)` 的休眠间隔，严密防范对 `metrodb.org` 造成高并发流量拥堵。
3. **明示 User-Agent**：网络请求必须在 Header 中清晰标注 User-Agent，明示为开源 MAP 数据抓取小助手（如 `User-Agent: MAP-MetroDataScraper-Bot/1.2 (+https://github.com/threeMoreTime/MAP)`）。
4. **快速失败 (Fail-Fast) 机制**：单次爬取超时上限限制为 `10s`。重试最多 2 次，3 次均失败则立刻跳过或视为异常报错。
5. **敏感凭据绝不泄露**：管道所用的 PR 创建 Token (GITHUB_TOKEN) 仅限对仓库自身分支的读写权限，绝不在脚本中硬编码任何外部服务器账号密码，且不对外部提供任何 API 终点。
6. **不保存外部 HTML**：爬虫仅提取 `rollNum` 核心数值及年份数组，绝对禁止将外部页面的 HTML 全文或多余第三方文件 commit 并推送到 master，维持仓库体量整洁。

---

## 11. 本地 dry-run 设计

为方便维护人员在本地进行无风险的调试与开发，新规划的数据更新驱动入口脚本 `scripts/run_data_update.py` 必须严格包含两种执行模式：

### 11.1 `--dry-run` 模式（无副作用演练）
* **命令**：`python scripts/run_data_update.py --dry-run`
* **行为限制**：
  1. 绝对**不允许**改动 `cities/` 下的任何原有 `{city}_stats.json` 源数据；
  2. 绝对**不允许**改动 `data/latest/` 下的三个汇总构建产物；
  3. 新爬取的城市数据一律沙盒式地写入临时缓存目录 `output/data-update-staging/` 下的对应城市目录中；
  4. 自动调用 `scripts/diff_data_snapshot.py` 产出本地的差分对照日志，并完成 Schema 自检；
  5. 可以在不需要任何 Git 或 Actions 凭证的情况下安全执行。

### 11.2 `--write` 模式（真实写入）
* **命令**：`python scripts/run_data_update.py --write`
* **行为限制**：
  1. 将临时缓存区 `output/data-update-staging/` 中的最新 JSON 文件物理拷贝覆盖至 `cities/{city}/{city}_stats.json`；
  2. 物理清除临时缓存沙盒；
  3. 最终通过调用 `build_data_index.py` 重新生成汇总层物理文件以备提交。

---

## 12. 日志与报告输出

在自动更新生命周期中，将同时产出两份关键报告，统一存储于 `output/` 目录下（该目录在 `.gitignore` 中配置，但通过 CI Artifact 功能可以提取审计）：

1. **`output/data_diff_report.json`**：机器可读的 JSON 差分格式报告。
   ```json
   {
     "summary": {
       "total_cities_scraped": 50,
       "substantive_changes_detected": true,
       "changed_city_count": 1,
       "warnings_count": 0,
       "errors_count": 0
     },
     "changes": [
       {
         "city": "xiamen",
         "field": "daily_ridership_wan",
         "before": 88.87,
         "after": 92.15,
         "type": "increase"
       }
     ]
   }
   ```
2. **`output/data_diff_report.md`**：高可读性的 Human-Readable Markdown 摘要，其内容将作为 peter-evans/create-pull-request 的 body 参数，直接渲染到 PR 主页上。

---

## 13. 回滚与人工审查流程

即便自动化管道全绿且拉起了自动 PR，核心团队仍需遵守以下严密的人工生命周期控制：

```
             [ 自动 PR data-update/update-YYYY-MM 被拉起 ]
                                   |
                                   v
             [ 自动触发 PR CI 检查: legacy & react 等 3 项 Job ]
                                   |
                       +-----------+-----------+
                       |                       |
                    (CI 失败)               (CI 成功)
                       |                       |
                       v                       v
               [ ❌ 直接关闭 PR ]     [ 研读 PR 中的 Markdown 差分报告 ]
                       |                       |
                       v                       +---------------+
               [ 维护人员排查 ]                                 |
                                                               v
                                                [ 人工审查真实客流数据合理度 ]
                                                               |
                                            +------------------+------------------+
                                            | 异常                                | 正常
                                            v                                     v
                                    [ ❌ 关闭 PR / 撤销 ]                  [ 🟢 Approve & Merge ]
                                                                                  |
                                                                                  v
                                                                     [ master 自动触发 CD 部署 ]
                                                                                  |
                                                                                  v
                                                                     [ 线上 Smoke Test 自动回归 ]
```

### 13.1 数据异常后的紧急回滚方案 (Rollback Manual)
1. **PR 级异常**：如果在 PR 阶段发现第三方源站数据发生了大面积篡改或被插入了恶意字符，维护人员**一键拒绝并关闭该 PR**，对 master 分支无任何影响。
2. **数据已合并到 Master 后的回滚**：
   * 若数据已 Merge 入 master，但上线后发现某项历史指标被不合理改写，维护人员需在控制台一键执行 revert commit 撤销该数据更新提交：
     ```bash
     git checkout master
     git pull origin master
     git revert [DATA_UPDATE_COMMIT_HASH]
     git push origin master
     ```
   * master 的 reversion 提交会自动再次激活 CI 与 Pages CD，将线上页面在毫秒级内回归到正常状态。
3. **部署层面的最简灾备**：
   * 旧大屏 `dashboard.html` 与测试文件绝对不受本次数据采集影响，且 CI 中 `legacy-check` 将在合并前校验向下兼容，保留最稳健的 Frozen Baseline 作为最终的兜底参考。

---

## 14. 影响范围

本方案为 **纯粹的数据更新管道与定时编排设计**，对现有系统的影响极低且高度可控：

### 14.1 拟新增文件
* `.github/workflows/data-update.yml`：定时与手动数据采集部署流水线。
* `scripts/run_data_update.py`：支持 dry-run 与 write 的数据更新编排总控。
* `scripts/diff_data_snapshot.py`：支持剥离 generated_at 噪声的客流深差分检测引擎。
* `docs/DATA_UPDATE_RUNBOOK.md`：详细的数据修复与人工 PR 审计指南手册。
* `output/data-update-staging/.gitkeep`（可选）：占位文件夹，用于沙盒测试。

### 14.2 拟修改文件
* `scrapers/scrape_metrodb.py`：强化其增量写入和防噪逻辑。
* `package.json`：挂载 `update:data` 快捷命令。
* `docs/ROADMAP.md` & `docs/NEXT_ROADMAP_PLAN.md`：更新 Phase 6 进度状态为已完成配置与验证。
* `docs/INDEX.md`：加入 `DATA_UPDATE_RUNBOOK.md` 引用。

### 14.3 绝对不应且禁止修改的文件
* `dashboard.html`：双前端冷冻基线绝不容许改动。
* `frontend/src/**`：React 主力前端的视图和核心业务组件不受数据采集影响。
* `cities/**`：除了 stats.json 允许增量更新外，**严禁修改或物理删除其中的任何线路/规划 PNG 图片资产**。
* `assets/**`：地图 GeoJSON 等静态基础资源完全保持冻结。

---

## 15. 分阶段实施计划

为了保障系统的绝对平稳，Phase 6 将分为以下三个迭代子步骤逐步实施：

```
+-------------------------------------------------------------------------------+
| 【第一阶段：数据本地增量及差分脚本编写】                                         |
|  - 开发 scripts/diff_data_snapshot.py 差分工具；                              |
|  - 重构 scrapers/scrape_metrodb.py 增加 Deep Equivalence 判定；               |
|  - 编写 scripts/run_data_update.py，在本地运行 --dry-run 和 --write 完美闭环。  |
+-------------------------------------------------------------------------------+
                                       |
                                       v
+-------------------------------------------------------------------------------+
| 【第二阶段：GitHub Actions 流水线与自动 PR 编排】                                |
|  - 新建 .github/workflows/data-update.yml 配置；                             |
|  - 配置 peter-evans/create-pull-request，在临时测试分支上测试自动拉 PR。         |
+-------------------------------------------------------------------------------+
                                       |
                                       v
+-------------------------------------------------------------------------------+
| 【第三阶段：全链路沙盒演练、合并与文档归档】                                     |
|  - 模拟一次真实的数据变更，让 Scheduled 管道触发，成功向 master 提出自动 PR；  |
|  - 审核 PR 并 merge，确认 PR CI 全绿且线上自动部署与冒烟 100% 通过；            |
|  - 编写 docs/DATA_UPDATE_RUNBOOK.md 并完成 ROADMAP 的文档收口标记。             |
+-------------------------------------------------------------------------------+
```

---

## 16. 验收标准

### 16.1 本 OpenSpec 设计文档的自身验收
* [x] `docs/openspec/data_update.md` 已被正确创建且无语法或格式错误；
* [x] 设计方案明确定义“只自动拉 PR，绝不直接 push master”的发布底线；
* [x] 设计方案定义了实质性变更的多维差分判别式，并明确将 generated_at 等排除为噪声；
* [x] 设计方案规划了 `--dry-run` 模式以隔绝副作用，保障开发安全；
* [x] 规划了针对客流暴跌、暴涨、格式异常的“突变熔断拦截”逻辑，确保不向 master 发起损坏的 PR；
* [x] 详细给出了 data-update workflow 步骤的草案与 PR 回滚手段；
* [x] **绝对没有修改任何业务 React 代码、底层物理数据、图片或原有 Actions Workflow，本地改动全部为纯文档资产**。

### 16.2 未来实现阶段的交付验收标准
* 运行 `npm run update:data -- --dry-run` 不会改动任何 `cities/` 及 `data/latest/` 目录，且无副作用产出 `output/data_diff_report.json`。
* 制造假数据变动后，运行写回模式会重新调用 `build_data_index.py` 并产出正确的 Git Diff，在无数据变动时仅打印“已对齐，跳过写入”。
* 在 Actions 模拟测试中，若遇到 Schema 损坏，流水线成功返回 exit code 1 并中止，不触发 peter-evans PR 发起。
* 自动创建的 PR 在 merge 进入 master 后，远端 `CI` 及 `Deploy` 全链路跑通，线上 Smoke 冒烟校验全绿。

---

## 17. 风险清单

| 风险描述 | 潜在影响度 | 架构缓解防御策略 |
| :--- | :---: | :--- |
| **源站 Web 反爬级别升级**（如封锁 GitHub Action 共有 IP 或开启验证码） | 高 | 1. 爬虫强制配置 Polite Delay (休眠 3~5 秒)；<br>2. 默认超低频的月度采集频率，平时本地开发 100% 优先读取沙盒缓存，拒绝无端请求；<br>3. 抓取失败触发超时直接 fail-fast 熔断，绝不带病生成损坏的 PR。 |
| **自动 PR 挂起过多造成垃圾分支堆积** | 中 | 1. `create-pull-request` 配置为重用已有分支模式，新的月度运行仅在 `data-update/update-YYYY-MM` 下做增量 force-push，永远不会出现分支泛滥；<br>2. 增加 PR 存活周期策略，合并后分支自动删除。 |
| **`generated_at` 过滤不彻底导致空噪变更** | 低 | 1. 强制在 `diff_data_snapshot.py` 的递归对比中，用 hardcode filter 剥离 `generated_at` 与 `scrape_date`；<br>2. 新增本地 E2E 测试用例专门校验 diff 逻辑的纯净性。 |
| **源站发生物理年份断裂/数据清空** | 高 | 1. 数据更新总控内置了“日客流大面积暴跌 >50%”一票否决熔断；<br>2. 每一个城市的数据均受 JSON schema 约束，防止字符串类型入侵。 |

---

## 18. 待确认问题

> [!NOTE]
> 在进入下一阶段开发前，请项目评审委员会对以下两点细节给予最终的审阅确认：
> 1. **关于 Node 依赖更新**：考虑到 `sync-data.cjs` 需要在 Actions 容器中顺利调用，是否需要在 Phase 6 的 PR 中直接将 CI 依赖的 checkout 和 setup-node 升级到 v4 以提前解决弃用警告？还是严格在 Phase 10 中集中统一打扫？
> 2. **关于未开通/无统计城市 (16 城) 的手动补全路径**：对于完全没有 MetroDB 数据的 16 个城市，后续若有人工整理的静态 JSON 补充，该管道是否应支持豁免更新机制，还是在此对其进行完全屏蔽？

---
*(OpenSpec 设计结束。本设计完全由资深数据管道架构师依据三层分层及安全红线高标准起草。)*
