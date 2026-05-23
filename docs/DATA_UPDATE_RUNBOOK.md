# MAP 数据增量更新 Runbook

本手册定义了 MAP (全国城市地铁客流数据可视化大屏) 项目的数据增量更新工作流、运维规范、自动化 Pull Request 审查指南以及紧急故障回滚与防灾拦截机制。

---

## 1. 目标

- 确保数据资产长效生命力，维持公开数据快照的最新可见度。
- 实施极低骚扰度的网络采集（月度低频），严格杜绝高并发网络请求给数据源站带来不道德负担。
- 实施零噪声 Git 历史审计，除实质性属性更新外，100% 过滤并拦截仅时间戳（`scrape_date`, `generated_at`）变化引起的 Git 提交。
- 捍卫“无瑕疵发布”红线，以数据校验及深差分熔断系统彻底屏蔽损坏、畸变或脏数据进入主干。

---

## 2. 工作流入口

更新管道基于 GitHub Actions 自动化工作流：
- **配置文件**：[.github/workflows/data-update.yml](file:///c:/Users/Administrator/Desktop/FL/MAP/.github/workflows/data-update.yml)
- **总控脚本**：[scripts/run_data_update.py](file:///c:/Users/Administrator/Desktop/FL/MAP/scripts/run_data_update.py)
- **校验拦截器**：[scripts/validate_data.py](file:///c:/Users/Administrator/Desktop/FL/MAP/scripts/validate_data.py)
- **数据差分引擎**：[scripts/diff_data_snapshot.py](file:///c:/Users/Administrator/Desktop/FL/MAP/scripts/diff_data_snapshot.py)
- **客流采集爬虫**：[scrapers/scrape_metrodb.py](file:///c:/Users/Administrator/Desktop/FL/MAP/scrapers/scrape_metrodb.py)

---

## 3. 手动触发步骤

除了每月 1 号的自动运行，维护人员可随时在 GitHub Actions Web 控制台手动触发更新管道：
1. 登录 GitHub 仓库，导航至 **Actions** 标签页。
2. 在左侧工作流列表中选择 **Scheduled Data Increment Update**。
3. 点击右侧的 **Run workflow** 下拉菜单。
4. 选择运行分支（通常为 `master`）并配置 **运行模式**：
   - `dry-run`：**（默认推荐）** 安全无副作用演练模式。数据写入沙盒，只做 Integrity 校验并上传差分报告 artifact，绝对不修改任何真实数据、不创建 PR。
   - `write`：真实写入模式。新数据在通过校验且确认有实质变化后，会自动创建自动 PR 分支并使用 Bot 凭证向主干拉起 PR。

---

## 4. DATA_UPDATE_BOT_TOKEN 配置要求

由于 GitHub 默认的 `GITHUB_TOKEN` 在自动创建 PR 后出于防循环递归保护，不会激活 PR 上的 CI 检测流水线，导致 PR 的三项合规 Job 无法运行。因此，管道**必须配置并使用个人访问令牌 (PAT) `DATA_UPDATE_BOT_TOKEN`**：
1. 创建最小权限 PAT，范围仅需勾选：
   - `repo` 作用域下的 `public_repo` (或完整 `repo` 写入权限，具体为 `contents:write` 与 `pull-requests:write`)。
2. 将生成的 Token 添加为当前仓库的 Action Secret：
   - 命名为：`DATA_UPDATE_BOT_TOKEN`。
3. 如果 Secret 缺失且数据确有实质性变更，在 `write` 模式下工作流将主动抛出 `::error::` 并强行失败挂起，绝不创建无 CI 覆盖的损坏 PR。

---

## 5. 自动 PR 审查清单

即使自动 PR 已经顺利由 Bot 创建，核心维护团队也**严禁直接盲目 Merge**。每次合并前必须根据以下清单进行严格的人工合规审查：
- [ ] **CI 状态核验**：确保该 PR 上自动挂载的 `CI / Legacy Dashboard Baseline Check`、`CI / React Frontend Build Check` 和 `CI / React Frontend UI Test` 三项 Job 均呈现 **全绿通过**。
- [ ] **差分合理度评估**：仔细研读 PR 主页中自动呈献的 Markdown 格式差分表，对照源站人工复核各项运营数字（运营线路、站点、客流量等）是否处于合理演进范围，排除大面积被篡改或爬取字段错位风险。
- [ ] **向下兼容性检查**：检查双前端大屏数据一致性，确认旧版 `dashboard.html` 冷冻基线在 `legacy-check` 中 16/16 完美通过，未引入任何破坏性代码。
- [ ] **只允许数据改动**：确认 File Changed 标签页中只涉及 `cities/{city}/{city}_stats.json` 以及 `data/latest/` 汇总 JSON 文件。**严禁包含任何前端业务 JS/TS/CSS 组件、图片资产或 Workflow 配置的意外改动**。

---

## 6. Diff 报告阅读方法

自动 PR 的 Body 或 Action Artifact 包含 Markdown 格式的差分报告：
- **状态 (Status)**：
  - `⚪ 无实质变更`：内容完全对齐，本轮无需任何物理操作。
  - `🟢 发现实质变更`：已识别出最新的客流或运营数据变动。
  - `❌ 异常/校验失败`：数据管道校验报错或突变触发安全拦截熔断。
- **城市级变更明细**：
  在表格中，每一行数据改动都会呈现清晰的 Before 与 After。例如：
  - ` daily_ridership_wan ` 字段由 `88.87` 变为 `92.15`。
  - ` change_type ` 为 `✏️ 修改` 或 `🆕 新增`。
  维护人员可以通过该表秒级审阅全国 50 个城市的最新更迭情况。

---

## 7. 无实质变更时如何处理

- 管道在判定无实质变更时，将自动输出 `Result: unchanged` 并向 Actions 返回 `exit 0`。
- 工作流会接收到该正常信号，自动输出 `has_changes=false` 并正常挂起退出。
- 此时**无需任何人工干预**，这是管道的正常降噪静默行为。

---

## 8. 校验失败时如何处理

- 当遇到源站格式重构或白屏数据时， Staging 校验器会抛出 `[ERROR]`，工作流会遭遇退出码 `20` 并在 Action Logs 中呈现标红错误。
- 管道会立刻启动**熔断拦截**，不物理修改任何文件、不创建 PR。
- **排查路径**：
  1. 打开 GitHub Actions 报错的 Job 运行历史，研读 `Staging 目录格式与边界强校验` Step 的错误日志，定位具体的字段缺失或类型损坏。
  2. 若为爬虫抓取正则失效，维护人员在本地拉取 master 并在 `scrapers/scrape_metrodb.py` 中订正匹配公式。
  3. 严禁通过人工直接强行合并未经校验通过的本地数据分支。

---

## 9. 数据异常熔断说明

为防御坏数据污染生产环境，管道内置了以下“数据突变安全阈值拦截规则”：
1. **城市名额缩水**：新生成的 stats 城市数低于 `34` 个，或 assets 资源数低于 `50` 个。
2. **客流断崖式暴跌**：原本大于 0 的日客流在更新后突降超过原值的 **50%**（防范爬取到空值或占位符）。
3. **客流暴涨/单位错位**：日客流骤增超过原值的 **2.5倍**，或单城绝对值日客流超过 **2500 万/日**（防范万人次与人次单位错装）。
4. **运营指标归零**：原本大于 0 的运营里程、站点数发生归零或负数。
5. **历史断裂**：年均日客流趋势 `yearly_avg_ridership.years` 发生了已存年份的物理删减或历史值的非向下兼容订正。

凡有一项被触发，数据差分与校验器即刻阻断并以 20 退出，宣告本轮更新失败。

---

## 10. 回滚策略

一旦发生坏数据流意外合并或线上故障，维护团队应立刻启动回滚：
1. **PR 阶段拦截**：若在 PR 阶段人工发现异常，**一键拒绝并 Close 该自动 PR**，master 分支 100% 保持纯净无害。
2. **Master 合并后紧急回退**：
   如果 PR 已经被 Merge 入 master 且引发了线上部署警告，维护人员在本地终端执行一键 Revert Commit：
   ```bash
   git checkout master
   git pull origin master
   git revert -m 1 [DATA_UPDATE_COMMIT_HASH]  # 撤销该次自动更新对应的 Merge Commit
   git push origin master
   ```
   master 分支上的 Reversion 提交会立刻激活主 CI 并在 React Pages 自动 CD 管道中重建，线上可视化大屏会在数十秒内恢复到完好的历史数据层状态。

---

## 11. 禁止事项

> [!CAUTION]
> 1. **严禁直接 push master**：数据更新管道及其所有子脚本在任何情况下均绝对不允许直接向 master 进行 commit 推送，必须通过 PR 并经人工差分研判审核后合并。
> 2. **严禁跳过/绕过 CI 校验**：严禁在 GitHub Actions 阻断时强行绕过合规性测试检查。
> 3. **严禁忽略 legacy-check**：旧版稳定基线 `dashboard.html` 的可用性是项目兜底容灾防线，其 16 项浏览器测试必须始终保持全绿。
> 4. **时间噪声 (generated_at-only) 绝不算有效更新**：禁止为仅仅时间戳变化的空噪更新创建 PR。
> 5. **严禁提交外部源 HTML 原文**：仅提取 rollNum 数据写入 JSON，严禁将外部页面的物理 HTML 原文 commit 进代码库，以保持仓库体积整洁。
> 6. **严禁硬编码任何密钥或私有 Token**：`DATA_UPDATE_BOT_TOKEN` 必须妥善配置在 Repository Secrets 中，绝不能以明文形式出现在脚本和文档内。
> 7. **严禁将自动 PR 直接视为可信数据**：自动 PR 仅代表格式和结构无物理硬伤，对客流指标等数值趋势的合理度，必须有人工的二次专业校验审计才能点击 Merge。
