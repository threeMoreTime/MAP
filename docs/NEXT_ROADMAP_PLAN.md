# MAP 后续路线规划：Phase 5.6.1 → Phase 10

> **项目**：全国城市地铁客流数据可视化大屏 (MAP)  
> **文档定位**：长期全量演进路线与自动化架构规划方案  
> **制定版本**：v1.2.0-dev  
> **拟定日期**：2026-05-21  
> **仓库地址**：threeMoreTime/MAP  
> **当前状态**：Phase 5.1/5.6/5.6.1 已通过远端全绿 CI/CD 与线上冒烟验证。  

---

## 1. 当前状态复核与口径梳理

在启动后续全量规划前，我们基于 MAP 仓库对当前的事实状态进行深度的审计与口径整理，纠正任何潜在的模糊概念或数据矛盾。

### 1.1 事实状态审计
* **技术底座**：
  * 主力前端：`frontend/` React 18 + TS + Vite + ECharts + CSS Modules，基于 `HashRouter`。
  * 旧版基线：根目录下 `dashboard.html`，定位为 **Frozen Baseline / Legacy Fallback**，仅用于数据兼容性校验和备用访问，不新增任何新功能。
* **数据流与同步**：
  * 通过 `scripts/sync-data.cjs` 实现构建前的数据增量同步，将数据层（`data/latest/`）、地图边界（`assets/china.json`）、城市封面（`assets/city-covers/`）及线路规划图片（`cities/`）一键同步至 `frontend/public/`。
* **CI/CD 验证闭环**：
  * GitHub Actions CI 工作流（`.github/workflows/ci.yml`）：集成语法检测（`legacy-check`）、静态类型编译（`react-check`）、本地真浏览器 UI 测试（`react-ui-test`）。
  * GitHub Pages 自动/手动 CD 部署工作流（`.github/workflows/pages.yml`）：仅在 master 分支 push 且 CI 成功后才被触发部署；部署完毕后自动拉起 Headless Chrome 运行线上真浏览器冒烟测试（`test:pages`）。
  * SPA 404 跳转自修复：`frontend/public/404.html` 极简自愈方案，支持非 Hash 路由（例如 `/MAP/cities`）在 CDN 层面的毫秒级重定向到 `/MAP/#/cities`，规避 404 体验硬伤。

### 1.2 存在的文档与编号冲突
* **时序与编号错位**：目前 `ROADMAP.md` 中，`Phase 5.1` (自动部署) 位于 `Phase 5.3` (查看器重构) 后面，且 `Phase 5.6`（关于数据可信度增强）在先前的文档中未能针对“已索引/有统计/无客流”等底层口径做透彻表述。
* **“实时性”文字噪声**：历史文档（如 `CHANGELOG.md`）局部提到“实时动态读取”、“实时数据”。MAP 属于**静态公开快照数据集成**，非生产级实时数据库或官方认证运营数据。

### 1.3 存在的数据口径冲突（数据口径绝对统一）
在 `DataSnapshotCard`、`AboutPage`、`ROADMAP` 和所有涉及统计的文案中，必须严格贯彻以下无二义性口径：
* **城市索引**：`50 城`（即 `city_assets_index.json` 中收录的全部城市）。
* **有统计记录**：`34 城`（即在 `metro_stats.json` 数据汇总中占有一行记录的城市）。
* **有日客流展示值**：`23 城`（即同时满足：①在 34 城统计中，② `daily_ridership_wan > 0` 且有具体客流数据）。
* **暂无日客流展示值**：`27 城`（计算公式：$50 - 23$。包含完全无统计记录的 16 个城市，以及有记录但日客流被清洗为 0 或缺失的 11 个城市）。
* **其中有统计但无日客流**：`11 城`（有统计记录但无可用客流量，如太原）。
* **线路图覆盖**：`48 城`。
* **规划图覆盖**：`41 城`。
* **封面图覆盖**：`49 / 50`（仅呼和浩特退化为 fallback CSS 渐变背景，其余 49 城拥有真实的 CC 协议 WebP 封面）。

---

## 2. 规划原则

为了保护项目工程的长期稳定性，我们在后续演进中必须毫不妥协地遵守以下黄金原则：

1. **事实导向原则 (Reality-First)**：
   * 任何文档和变更记录中，严禁提前将计划阶段写为“已完成”。
   * 数据快照和文案描述必须实事求是地强调“公开快照属性”，使用“根据当前快照动态读取”代替“实时更新”。
2. **双 Commit 严格拆分策略 (Double-Commit Discipline)**：
   * 每一个阶段任务默认并且必须拆分为两个逻辑提交：
     * **Commit 1**：只提交功能代码、测试用例和自动化脚本更新。
     * **CI/CD 阶段监控**：推送后，严密关注 GitHub 远端 Actions 的 `CI` 及 `Deploy` 工作流，确保 `smoke-test` 等线上环境测试全绿。
     * **Commit 2**：在远端全绿且部署验证通过后，方可将 README、Roadmap 和 Changelog 等文档状态标记为“已完成并远端验证通过”，完成文档收口提交。
3. **旧版基线不破坏原则 (Baseline Freeze)**：
   * 绝对禁止对根目录的 `dashboard.html`、`scripts/acceptance_dashboard.js` 以及 `scripts/run_acceptance.py` 进行删除或大幅 UI 重构。
   * 旧版大屏只作安全回归，不进行任何新功能开发。
4. **数据与资源非破坏原则 (Asset Safety)**：
   * 不随意篡改历史物理数据（如 `data/latest/` 目录和各城市目录 JSON 文件），任何数据重构必须在专有增量/检测阶段配合自动化校验脚本进行。
5. **测试标准零妥协 (Assertion Strictness)**：
   * 绝不为了通过验收而移除或放宽现有的 UI 或页面测试断言。重点防护 `T20` 封面校验、`T21` 厦门图片 complete 校验及 `T25` 边界状态。

---

## 3. 总路线图

| 阶段编号 | 阶段名称 | 优先级 | 是否 OpenSpec | 阶段目标 | 验收与验证方式 |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Phase 5.6.1** | 数据覆盖口径文案统一 | **P0** | 否 | 【已完成】消除 34/23/27 数据指标的不一致误解，统一全网文案口径。 | 已通过远端全绿 CI/CD 与线上冒烟验证 |
| **Phase 5.7** | 旧版基线维护策略落纸 | **P0** | 否 | 【已完成】明确 `dashboard.html` 归档与回归政策，规范双前端并存策略。 | 已通过本地与远端 CI `legacy-check` 回归 |
| **Phase 6** | 数据增量更新与定期采集 | **P1** | 是 | 【已配置待验证】建立可控的 GitHub Actions 定期数据采集与变更自动 PR 机制。 | 模拟采集 Run & 自动数据格式校验 |
| **Phase 6.1** | 数据质量报告与异常检测 | **P1** | 否 | 为数据管道建立多维质量评分，产出自动化质量报告 JSON。 | `npm run check:static` 自动化套件扩展 |
| **Phase 7** | 数据质量中心 (Data Quality Center) | **P1** | 是 | 新建 `/#/data-quality` 页面，可视化展示覆盖率、缺失及异常指标。 | 新增 `test:ui` T29/T30 + 线上 Smoke |
| **Phase 8** | 多城市数据交叉对比功能 | **P2** | 是 | 新建 `/#/compare` 模块，支持 2-5 个城市的多指标横向对比分析。 | 新增 `test:ui` 联动校验 + 响应式溢出检测 |
| **Phase 9** | 深度分享、CSV导出与报告生成 | **P2** | 否 | 支持复制当前视图链接、数据 CSV 导出及质量大纲 Markdown 复制。 | 导出数据完整性与格式规范检查 |
| **Phase 10** | 性能、可访问性与工程债整理 | **P2** | 否 | 升级 Node/Actions 依赖生命周期，实现 ECharts 懒加载及 A11y 优化。 | Lighthouse 跑分审计 + `test:pages` 性能回归 |

---

## 4. Phase 5.6.1：数据覆盖口径文案统一（已完成）

**状态：已完成并远端验证通过**

### 4.1 背景
当前 `DataSnapshotCard`、`AboutPage` 以及 Roadmap 的文案中，关于城市数量（50 索引城）、有统计数据（34 城）以及实际有日客流大屏展示（23 城）等数据的表述存在口径模糊。极易给最终用户带来“数据自相矛盾”或“为什么有些城市没有统计”的疑惑。

### 4.2 范围
* **修改页面与组件**：
  * [frontend/src/components/common/DataSnapshotCard.tsx](file:///c:/Users/Administrator/Desktop/FL/MAP/frontend/src/components/common/DataSnapshotCard.tsx)：重构文本结构，精细化拆解 34 城、23 城、11 城的逻辑关系。
  * [frontend/src/pages/AboutPage.tsx](file:///c:/Users/Administrator/Desktop/FL/MAP/frontend/src/pages/AboutPage.tsx)：同步数据覆盖率统计处的口径说明，消除“实时”字样。
* **修改文档**：
  * 更新 `CHANGELOG.md` 及 `docs/ROADMAP.md` 中所有将静态快照称为“实时更新”的文字。
* **修改测试**：
  * 升级 `frontend/scripts/acceptance-react.cjs` 中的 `T26` 与 `T28`，增加对精准口径文字的断言硬校验。

### 4.3 产物
* **DataSnapshotCard 优化**：精细展示“有客流记录 34 城 (含实际展示 23 城 / 无可用日客流 11 城)”，并增加相应图例说明。
* **AboutPage 说明增强**：明确标注“当前呈现结果为公开学术资料与运营快照合并整理，非官方实时数据”。
* **T26/T28 测试套件升级**：增加对新增口径关键字（如“有客流记录”、“实际展示”、“暂无可用客流”）的真浏览器文本比对。

### 4.4 验收标准
* **本地测试**：`npm run test:ui` 28 项全绿，T26/T28 严格校验通过。
* **线上冒烟**：`BASE_URL` 生产环境下 `npm run test:pages` 完美通过。
* **静态校验**：`npm run typecheck` 与 `npm run check:static` 无任何阻断异常。

### 4.5 提交与验证策略
* **Commit 1**：只提交 `DataSnapshotCard.tsx`、`AboutPage.tsx` 的文案微调以及 `acceptance-react.cjs` 的断言更新。
* **远端 CI/CD 验证**：观察 master push 后的 Actions `CI` & `Deploy` 全绿，确认线上测试无控制台 404 等 error。
* **Commit 2**：更新本地 `CHANGELOG.md` 和 `docs/ROADMAP.md` 中的口径记录，完成阶段合规收口。

---

### 4.6 阶段执行提示词（可直接复制给 AI 运行）

```text
你现在是资深前端开发与数据产品经理，请在 MAP 项目中全面实施 Phase 5.6.1：数据覆盖口径文案统一。

【当前背景】
当前 Dashboard 快照与 About 页在描述 50 索引城、34 统计城、23 实际展示城及 11 个日客流为 0 城市时口径较为模糊，可能引发数据自相矛盾误解。

【修改范围与要求】
1. 修改 frontend/src/components/common/DataSnapshotCard.tsx：
   - 保持科技深蓝玻璃微拟态样式。
   - 统一大屏口径为：
     - 城市索引：50 城
     - 有客流记录：34 城 (其中：实际展示 23 城 / 无可用日客流 11 城)
     - 暂无日客流：27 城 (16 城完全无统计 + 11 城客流暂缺)
     - 线路图覆盖：48 城
     - 规划图覆盖：41 城
     - 封面图覆盖：49 / 50
   - 在卡片内清晰通过文字或图例表达这些计算关系，去除任何“实时数据”或“官方认证”等可能产生实时性误导的文案，统一改为“公开数据快照”。
2. 修改 frontend/src/pages/AboutPage.tsx：
   - 确保数据指标统计处与上述口径完全统一，在显著位置补充“本站数据仅基于公开学术数据和各城市运营快照动态计算得出，并非实时官方数据”。
3. 升级 frontend/scripts/acceptance-react.cjs 中的 T26 和 T28：
   - 将原有 T26 断言改为硬比对上述新增口径文字（如 "有客流记录", "34 城", "实际展示 23 城", "暂无日客流", "27 城" 等）。
   - 将 T28 断言升级为硬校验“公开快照”或“动态读取”等文案的展示。

【禁止修改范围】
1. 不修改 dashboard.html，不重构 Legacy 验收套件。
2. 不修改 data/latest/*.json 及 cities/ 物理数据文件。
3. 不得降低现有的任何 test:ui 断言。

【本地验证】
在 CWD=frontend 下依次执行并确保全绿：
1. npm run typecheck
2. npm run build
3. npm run check:static
4. 本地预览服务器启动后跑：npm run test:ui （确保 T26、T28 通过）
5. 环境变量 BASE_URL 指向本地预览地址，运行：npm run test:pages

【提交策略】
1. Commit 1 仅提交前端代码、组件及测试脚本。
2. 观察远端 GitHub Actions 的 CI 与 自动 Deploy 全绿且线上 Smoke 完美通过后。
3. Commit 2 提交 CHANGELOG.md 与 docs/ROADMAP.md 的文档口径收口，标记 Phase 5.6.1 已完成。
```

---

## 5. Phase 5.7：旧版 dashboard.html 维护策略（已完成）

**当前状态：已完成并远端验证通过**

### 5.1 背景
React 前端迁移已经彻底完成并实现全面生产级部署。但在项目演进过程中，根目录下的 `dashboard.html` 仍扮演着备用及 Legacy 兼容的“锚点”角色。如果不将其“冷冻落纸”，后续盲目的双轨道维护将给工程带来极高成本。

### 5.2 范围
* **文件新建与规约**：
  * [NEW] [docs/LEGACY_DASHBOARD_POLICY.md](file:///c:/Users/Administrator/Desktop/FL/MAP/docs/LEGACY_DASHBOARD_POLICY.md)：阐述 `dashboard.html` 为 **Frozen Baseline**，只接受核心数据层更新回归，不再接受任何视觉或新交互重构。
* **README 修正**：
  * 在 [README.md](file:///c:/Users/Administrator/Desktop/FL/MAP/README.md) 中增加专门章节，强调 `dashboard.html` 为 legacy 归档定位，引导主流开发者全面投奔 `frontend/`。
* **CI 验证规则固化**：
  * 确保 `.github/workflows/ci.yml` 中的 `legacy-check` 始终保留，并将 `scripts/run_acceptance.py` 集成在此，作为底线质量防御。

### 5.3 产物
* `docs/LEGACY_DASHBOARD_POLICY.md` 政策文件。
* 带有 Legacy 退化警告说明的 `README.md` 与 `RELEASE_PROCESS.md`。

### 5.4 验收标准
* 根目录 `python scripts/run_acceptance.py` 本地回归通过。
* 远端 Actions CI 中的 `legacy-check` Job 顺利 PASS。

### 5.5 提交与验证策略
* **Commit 1**：只提交 `README.md` 中 Legacy 边界的修订与 `RELEASE_PROCESS.md` 修改。
* **远端验证**：确保远端 Actions CI 的 `legacy-check` 工作流通过。
* **Commit 2**：提交 `docs/LEGACY_DASHBOARD_POLICY.md` 并标记 Roadmap 中的 Phase 5.7 状态为完成。

---

### 5.6 阶段执行提示词（可直接复制给 AI 运行）

```text
你现在是资深技术负责人与架构师，请实施 Phase 5.7：旧版 dashboard.html 维护策略落纸。

【目标】
在文档与流程层面明确根目录下的旧版单文件大屏 dashboard.html 作为 "Frozen Baseline" 的长期生存周期，阻止任何非必要的多头开发，并维护好现有的 Legacy 验收红线。

【修改范围】
1. 新建 docs/LEGACY_DASHBOARD_POLICY.md：
   - 规定 dashboard.html 仅限用于"灾备环境 fallback" 与 "数据向后兼容性验证基线"。
   - 规定不再对其进行任何新 UI 特性开发或功能重构，当 React 运行出错时，可作为零网络依赖的最简大屏呈现。
   - 明确数据同步脚本 sync-data.cjs 或 Python 爬虫的向后兼容底线。
2. 修改 README.md 与 docs/RELEASE_PROCESS.md：
   - 增加说明，指导新开发者：任何新功能（如城市对比、数据质量等）仅开发于 React 分支，发布新版本时不再需要手动修改 dashboard.html，仅执行 python scripts/validate_data.py 及 python scripts/run_acceptance.py 对旧版本做数据一致性回归。
3. 确保 .github/workflows/ci.yml 中的 legacy-check job 依然被严格保留且不会与 React CI 混合。

【禁止修改范围】
1. 严禁改动 dashboard.html，严禁移除 scripts/run_acceptance.py 及相关 test:dashboard 测试脚本。

【本地验证】
1. 运行：python scripts/run_acceptance.py 确保旧版基线全绿。
2. 运行：npm run typecheck 确保 React 构建不受文档变动影响。

【提交策略】
1. Commit 1 仅提交 README、RELEASE_PROCESS 的规约文字改动。
2. 远端 CI 全绿后，Commit 2 新建 docs/LEGACY_DASHBOARD_POLICY.md 并在 ROADMAP.md 中将 Phase 5.7 标为已完成。
```

---

## 6. Phase 6：数据增量更新与定期采集（已配置待验证）

### 6.1 背景
当前 MAP 的所有城市地铁客流量以及线路图图片资源，皆为先前某次批量采集的静态快照。为了保证系统的数据演化能力而又不给线上站点造成高频请求骚扰，需要建立一套严密的“低频、增量、审查式”自动采集更新体系。

### 6.2 范围
* **爬虫与数据层调整**：
  * 修改 `scrapers/scrape_metrodb.py`：支持增量下载检测。如果目标站点未发生实际年份增长或数值变动，不重写 JSON，避免空噪变更。
  * 引入防噪控制：`generated_at` 的微妙时间戳变动不应视为数据变动，不单独触发数据更新。
* **GitHub Actions 整合**：
  * [NEW] `.github/workflows/data-update.yml`：配置为每月定时（Cron：`0 0 1 * *`）或手动触发。运行爬虫与质量校验，若有实质性数据变更，自动发起一个新的 PR 提交，而不是直接推送至 master，从而提供人工审核（Auditing）空间。
* **文档编写**：
  * [NEW] [docs/DATA_UPDATE_RUNBOOK.md](file:///c:/Users/Administrator/Desktop/FL/MAP/docs/DATA_UPDATE_RUNBOOK.md)：阐述如何手动触发爬虫、如何恢复破损数据、及人工 PR 审计指南。

### 6.3 产物
* 定期采集工作流 `.github/workflows/data-update.yml`。
* `scrapers/` 数据防噪脚本与增量逻辑强化。
* `docs/DATA_UPDATE_RUNBOOK.md` 手册。

### 6.4 验收标准
* 本地或 CI 的 Mock 运行中，数据无变化时输出“无实质变更，跳过 PR 创建”。
* 当构造异常数据时，采集脚本能安全终止并发送“数据断裂/类型异常”警告。

### 6.5 提交与验证策略
* **OpenSpec 签署**：本阶段为核心数据流变动，必须先在 `docs/openspec/data_update.md` 确定安全采集频次限制及 PR 发起策略。
* **Commit 1**：只提交 `scrapers/` 脚本改动与 `.github/workflows/data-update.yml` 任务定义。
* **验证**：手动在 GitHub 触发 `data-update` workflow，确认它能否成功检测数据并自动向 master 提 PR。
* **Commit 2**：提交 `docs/DATA_UPDATE_RUNBOOK.md` 并更新 ROADMAP。

---

### 6.6 阶段执行提示词（可直接复制给 AI 运行）

```text
你现在是 GitHub Actions 工程化专家与爬虫架构师，请在 MAP 中规划与实施 Phase 6：数据增量更新与定期采集。

【当前背景】
我们需要一套低频且安全的数据更新管道，避免频繁采集和直接 push master 导致线上数据崩溃或产生琐碎的 generated_at 变更提交。

【修改范围与要求】
1. 需要先编写 OpenSpec：docs/openspec/data_update.md。明确规定每月 1 号执行一次，且任何爬取到的数据必须与 data/schema/ 校验通过，方能进入下一流程。
2. 升级 scrapers/scrape_metrodb.py：
   - 支持数据比对。只有当实际的 daily_ridership_wan 或新运营年份数据发生变动时才重写本地 JSON。
   - 过滤掉因爬取系统时间生成的 timestamp 变化噪音，防止产生无实质内容的 git diff。
3. 新建 .github/workflows/data-update.yml：
   - 监听 cron: '0 0 1 * *' (每月一号) 或 workflow_dispatch。
   - 工作流步骤：
     ① 检出 master 分支代码。
     ② 安装 python 依赖，运行 scrapers/scrape_metrodb.py 及 generate_charts.py。
     ③ 运行 python scripts/validate_data.py 对新捕获的数据做严密的格式与边界值验证。
     ④ 使用 git diff 检查 data/latest 和 cities 目录的实际变更。
     ⑤ 若存在实质变更，利用 peter-evans/create-pull-request 自动创建一个以 "data-update/update-YYYY-MM" 为分支的 Pull Request。严禁直接 push 到 master。
4. 新建 docs/DATA_UPDATE_RUNBOOK.md：
   - 编写爬虫脚本的数据修复手册与异常恢复手段，并详实介绍如何审核生成的 PR。

【禁止修改范围】
1. 绝对不要直接 push 生产数据，严禁在 CI 校验失败时强行提 PR。

【本地验证】
1. 运行：python scrapers/scrape_metrodb.py 与 python scripts/validate_data.py，验证爬取后数据校验全绿。
2. 本地模拟运行 actions 命令，确保 PR 生成机制正常工作。

【提交策略】
1. Commit 1 提交爬虫、CI yaml 文件。
2. 远端 Action PR 机制通过并拉起 PR 验证合格后，Commit 2 提交 DATA_UPDATE_RUNBOOK.md 并归档。
```

---

## 7. Phase 6.1：数据质量报告与异常检测

### 7.1 背景
为了给未来的“数据质量中心”页面打下坚实的静态元数据基础，并在数据管道捕获外部数据时对可能存在的字段异常（如客流量突然翻了10倍、运营年份断裂等）做自动拦截，需要引入一个独立的“数据质量报告生成器”。

### 7.2 范围
* **脚本开发**：
  * [NEW] `scripts/build_quality_report.py`：遍历 50 索引城市，对以下 10 个维度进行严格评测并产出质量扣分机制：
    1. 城市是否在 50 城索引中；
    2. 是否有 `stats.json` 物理文件；
    3. `daily_ridership_wan` 是否有非 0 真实数据；
    4. 历史年份趋势数据是否断裂；
    5. 地理地图散点坐标是否在合理范围内；
    6. 实景封面图是否为真实 WebP 图片，还是降级；
    7. 线路图是否存在；
    8. 建设规划图是否存在；
    9. 数据的年度更新范围；
    10. 异常极值拦截（例如日客流大于 2000 万人次时输出 warning）。
* **整合构建层**：
  * 在 `scripts/build_data_index.py` 或 `prebuild` 逻辑中引入该生成器，自动在 `frontend/public/data/latest/` 输出 [quality_report.json](file:///c:/Users/Administrator/Desktop/FL/MAP/data/latest/quality_report.json)。

### 7.3 产物
* `scripts/build_quality_report.py` 数据质量评估器。
* 自动产出的质量数据元文件 `data/latest/quality_report.json`。
* [NEW] [docs/DATA_QUALITY.md](file:///c:/Users/Administrator/Desktop/FL/MAP/docs/DATA_QUALITY.md)：解释各项扣分权重及数据健壮度分级规则。

### 7.4 验收标准
* 运行 `python scripts/build_quality_report.py` 后，在 `data/latest/` 下自动成功输出并格式化 `quality_report.json`。
* `quality_report.json` 应包含汇总质量指标（如“全网可用度：78%”）以及各城市的明细扣分矩阵。

### 7.5 提交与验证策略
* **Commit 1**：只提交 `build_quality_report.py` 脚本与前置同步、构建的挂载代码。
* **验证**：确保 CI 中成功编译并产出正确的 JSON 物理文件，`check:static` 没有对新加入的静态 JSON 抛错。
* **Commit 2**：提交 `docs/DATA_QUALITY.md` 并标记 Roadmap。

---

### 7.6 阶段执行提示词（可直接复制给 AI 运行）

```text
你现在是数据管道架构师与质量管理负责人，请实施 Phase 6.1：数据质量报告与异常检测。

【目标】
建立针对 50 城市的 10 维自动化质量扫描评估器，最终自动编译出格式精美、多维评分的 quality_report.json，为后续的质量中心提供数据总线。

【修改范围】
1. 新建 scripts/build_quality_report.py：
   - 自动扫描 50 城市目录及其数据，对 10 维质量指标（城市索引、包含 stats、日客流有效值、历史趋势完整度、坐标校验、封面图真实度、线路/规划图存在度、最新更新年份、客流异常翻倍极值、字段格式等）执行判定。
   - 为每个城市输出 100 分制的质量分数与扣分明细；同时算出一个“全网综合数据覆盖健壮度”总体百分比。
   - 将该报告输出至 data/latest/quality_report.json。
2. 将 scripts/build_quality_report.py 挂载在 prebuild 或 scripts/sync-data.cjs 中：
   - 确保每次本地构建或 CI 部署前，会自动同步并生成最新的 quality_report.json 到 frontend/public/data/latest/。
3. 新建 docs/DATA_QUALITY.md：
   - 规定每个指标维度的评分细则、扣分逻辑及警报红线（例如：核心城市缺失线路图强行降级为 D 级）。

【禁止修改范围】
1. 不修改原始的 schema 结构定义文件。

【本地验证】
1. 运行：python scripts/build_quality_report.py 检查 quality_report.json 成功产出且无结构语法错误。
2. 运行：npm run build 检查静态构建是否顺利带上该 JSON 文件。

【提交策略】
1. Commit 1 提交 python 报告生成脚本及构建配置挂载。
2. 远端 CI 跑通且质量文件顺利部署后，Commit 2 提交 docs/DATA_QUALITY.md 并在 ROADMAP.md 中将 Phase 6.1 标记为已完成。
```

---

## 8. Phase 7：Data Quality Center

### 8.1 背景
为了贯彻透明、可信的数据大屏宗旨，需要为大屏开辟一个全新的可视化路由，让普通用户能够一目了然地看到 50 个城市的地铁数据完整度排名、数据缺失列表以及目前全网覆盖的宏观评分，从而大幅增加项目技术的可采信度。

### 8.2 范围
* **新页面开发**：
  * [NEW] [frontend/src/pages/DataQualityPage.tsx](file:///c:/Users/Administrator/Desktop/FL/MAP/frontend/src/pages/DataQualityPage.tsx)：全新可视化中心，基于 Phase 6.1 生成的 `quality_report.json`。
  * 页面功能：
    1. 总体覆盖率与健康度（科技风仪表盘 UI，ECharts 刻度渲染）；
    2. 城市数据完整度排行榜（分值排名柱状图，支持升序降序）；
    3. 明细列表分类卡片（精巧区分“已收录城市”、“无日客流城市”、“图片资源缺失城市”）；
    4. 每一个城市的数据“诊断清单”（悬浮气泡或手风琴显示扣分详情）；
    5. 数据修补贡献指引（引导热心用户点击链接向 MAP 提交新数据）。
* **路由注册**：
  * 在 `frontend/src/main.tsx` 或路由定义中注册 `/#/data-quality` 路由。
  * 在全局 NavigationBar/Footer 中加入入口按钮。
* **测试用例**：
  * 在 `acceptance-react.cjs` 中新增 `T29` 与 `T30` 自动化验收断言。

### 8.3 产物
* `DataQualityPage.tsx` 数据质量可视化主页面。
* 对 `quality_report.json` 的异步动态加载逻辑与 ECharts 展现组件。
* 针对数据质量页面的 E2E 浏览器验收测试。

### 8.4 验收标准
* 访问 `/#/data-quality` 页面呈现正确，无任何报错或异常。
* 新增的 T29/T30 自动化用例在本地 `npm run test:ui` 全绿通过。
* 线上冒烟测试包含对 `/#/data-quality` 健康加载和内容的断言。

### 8.5 提交与验证策略
* **OpenSpec 签署**：由于涉及全新路由及大型新页面交互，必须先在 `docs/openspec/data_quality_page.md` 中画出组件架构和信息流向，获批后再动手。
* **Commit 1**：提交 `DataQualityPage` 核心代码、路由配置、UI 样式及新增测试用例。
* **远端验证**：关注远端 Pages 部署与 smoke-test 中对 `/#/data-quality` 的访问是否完全畅通，有无 JS console 报错。
* **Commit 2**：在 ROADMAP 中标记已完成。

---

### 8.6 阶段执行提示词（可直接复制给 AI 运行）

```text
你现在是高级前端开发工程师与交互设计师，请在 MAP 中规划与实施 Phase 7：Data Quality Center。

【当前背景】
我们需要将 Phase 6.1 产出的数据质量数据元转换为精美、直观的独立页面，入口为 /#/data-quality，让大屏的用户能够公开审计我们所收录的全部城市资源。

【修改范围与要求】
1. 需要先编写 OpenSpec：docs/openspec/data_quality_page.md，明确定义页面设计原型、所采用的 ECharts 架构和适配标准。
2. 新建 frontend/src/pages/DataQualityPage.tsx：
   - 保持极客深蓝科技风格，玻璃微拟态容器。
   - 异步加载 runtime 的 quality_report.json。
   - 顶部呈现：全网健康度百分比仪表盘（使用 ECharts gauge 图表渲染，青色至深蓝科技渐变）。
   - 中间呈现：50 城市质量评分柱状图（使用 ECharts bar，支持通过点击 Tab 进行"按分数降序"与"按城市首字母排序"切换）。
   - 底部呈现：分类网格。
     - 卡片一：已收录完整 23 城列表。
     - 卡片二：暂无日客流 11 城列表。
     - 卡片三：资源缺失 27 城列表（线路/规划图缺失）。
     - 卡片四：开源贡献指引区（提供指向 GitHub Issue 的修补引导）。
3. 注册路由：
   - 在前端主入口注册路由，并在 Header 与 Footer 中增加“数据质量中心 📊”跳转链接。
4. 升级 frontend/scripts/acceptance-react.cjs：
   - 新增 T29 测试：验证 /#/data-quality 可达，ECharts 实例数量大于等于 2。
   - 新增 T30 测试：验证数据质量页面的四大列表卡片存在，点击排序 Tab 后无报错。
5. 升级 frontend/scripts/smoke-pages.cjs：
   - 线上冒烟测试增加对 /#/data-quality 页面的访问，确认其健康加载。

【禁止修改范围】
1. 绝不修改现有的 6 指标卡片 DOM ID 及原有 dashboard 页面的核心大屏结构。

【本地验证】
1. 运行：npm run build
2. 启动本地预览并运行：npm run test:ui 与 test:pages 确认本地测试全绿。

【提交策略】
1. Commit 1 提交质量页全部前端代码与测试用例。
2. 远端 Action 冒烟通过后，Commit 2 提交文档收口，标记 Phase 7 已完成。
```

---

## 9. Phase 8：城市对比功能

### 9.1 背景
MAP 项目虽然具备 50 城市的独立查看功能，但缺乏城市与城市之间（特别是同量级地铁城市，如“厦门 VS 福州”、“北京 VS 上海”）的横向直观数据对比功能。这是一个高增值的交互模块，需要精密的架构设计。

### 9.2 范围
* **新组件与逻辑**：
  * [NEW] [frontend/src/pages/ComparePage.tsx](file:///c:/Users/Administrator/Desktop/FL/MAP/frontend/src/pages/ComparePage.tsx)：入口为 `/#/compare`。
  * 功能规划：
    1. **城市选择器**：支持通过多选框或胶囊标签同时选定 2-5 个城市。
    2. **雷达图多维比对**：使用 ECharts 雷达图，横跨“日客流、运营里程、站点数、线路数、客流强度、峰值客流”六维比对。
    3. **对比分析表格**：玻璃拟态表格，以不同颜色高亮展现“胜出者”或“均值对比”。
    4. **趋势曲线重叠**：将多城市的年度客流量历史趋势在同一个 ECharts 折线图中进行重合堆叠渲染（支持归一化轴或基准对齐）。
* **UI 样式设计**：
  * 保持与大屏一致的毛玻璃与渐变边框，响应式适配（移动端自动折叠为两两纵向比对，防止表格超宽溢出）。
* **验收保障**：
  * 引入 `test:ui` 的 `T31`、`T32`、`T33`、`T34` 四个针对多城市多轮比对的自动化测试。

### 9.3 产物
* `ComparePage.tsx` 多城对比控制台。
* 雷达图、重叠趋势图等对比可视化组件。
* 完备的 OpenSpec 设计说明及验收测试脚本。

### 9.4 验收标准
* 对比控制台流畅承载 5 个城市比对，图表多线条绘制无堆叠冲突或标签遮挡。
* 键盘操作与多选框交互符合 A11y 规范。
* 375px 移动端无横向溢出。

### 9.5 提交与验证策略
* **OpenSpec 签署 (Mandatory)**：**必须**在 `docs/openspec/compare_system.md` 下画出极高精度的时域比对数据结构定义和多图表自适应布局图，经团队签字后再编码。
* **Commit 1**：提交对比模块代码、公共组件、新路由及 E2E 测试用例。
* **验证**：Actions 远端跑通，线上 Smoke 执行对比操作无性能卡顿或 JS 栈溢出。
* **Commit 2**：更新 Roadmap 标志。

---

### 9.6 阶段执行提示词（可直接复制给 AI 运行）

```text
你现在是资深前端架构师与交互工程师，请实施 Phase 8：多城市数据交叉对比功能。

【目标】
在 React 前端新增精美且强大的多城（2-5个）多维数据比对页面，入口为 /#/compare，包含雷达图和多城重合趋势折线。

【修改范围与开发规格】
1. 必须首先编写 OpenSpec 文档 docs/openspec/compare_system.md。定义 compare 专有数据源的裁剪融合机制及多图自适应性能边界。
2. 新建 frontend/src/pages/ComparePage.tsx：
   - 保持科技深蓝夜光 UI，响应式列宽。
   - 核心组件一：**动态多选搜索框**。支持用户在 50 城中勾选 2 到 5 个城市；用彩色胶囊标签显示已选择的城市，并支持点击 "X" 快速删除。
   - 核心组件二：**六维属性雷达图**。使用 ECharts Radar，映射已选城市的客流量、里程、站点、线路、强度、峰值，不同城市分配专有的亮丽渐变光晕线。
   - 核心组件三：**趋势合并对比折线图**。将已选城市的历史年度客流量折线在同一个折线图里并联显示，配有醒目的 Legend 指引。
   - 核心组件四：**对比玻璃表格**。每一行代表一个指标，高亮每一项指标的“第一名”。
3. 页面适配与 A11y：
   - 表格在 900px 以下切换为横向平移，在 375px 下只允许选择 2 个城市比对并折叠部分次要指标，杜绝任何横向溢出。
4. 注册路由及导航：
   - 注册 /#/compare，在 Header 新增“数据对比 ⚖️”入口。
5. 新增 test:ui 验收测试 T31-T34：
   - T31：验证对比页面各图表容器存在，默认无选择城市时显示 "请勾选要对比的城市" 友好空状态。
   - T32：模拟勾选“北京”、“上海”、“广州”三个城市，验证雷达图 legend 发生更新，且数据比对表格输出非空。
   - T33：测试在 375px 下自动触发 2 城选择上限阻断，验证响应式。
   - T34：测试点击 Legend 关闭某条折线时，图表未抛错。

【禁止修改范围】
1. 不降低原有的 test:ui T01-T28 的任何断言。

【本地验证】
1. 运行：npm run build 与 npm run dev
2. 跑本地 test:ui 确认 T31-T34 完美通过。

【提交策略】
1. Commit 1 仅提交 /compare 业务代码、样式及新版测试用例。
2. 远端 Actions 全绿后，Commit 2 更新 Roadmap 文档，正式归档。
```

---

## 10. Phase 9：分享、导出与报告能力

### 10.1 背景
为了将 MAP 从一个纯粹的可视化展示站提升为能够为学术研究、轨道交通爱好者提供“工具化复用”价值的半生产平台，需要为页面配备多种实用的分享、数据导出与大纲报告提取能力。

### 10.2 范围
* **组件级按钮扩展**：
  * **一键复制视图**：在 Dashboard 和 Cities 页面筛选处，支持将当前的搜索词及筛选标签序列化为 URL Query 参数（如 `/#/cities?search=xi&filter=complete`），并配有“复制链接”的科技感弹窗提示，当第三方访问该 URL 时自动还原筛选状态。
  * **详情数据 CSV 导出**：在城市详情页“数据说明”手风琴上方加入“导出数据”按钮，一键将当前城市的历史年份趋势、站点里程等核心数据转换为标准 CSV 供用户下载。
  * **图片海报导出**：利用 HTML5 Canvas 机制或 ECharts 自带的 `getDataURL` 功能，支持用户将当前的客流趋势图或对比雷达图导出为精美的 PNG 海报图片。

### 10.3 产物
* URL 状态序列化与反序列化 Hook（`useUrlState`）。
* 各主要看板的“复制分享”与“CSV 导出”功能按钮及数据转换驱动。
* 导出状态的 UI 反馈组件。

### 10.4 验收标准
* 点击“复制分享链接”，剪贴板成功写入带 Query 参数的 Hash URL；新标签页打开该 URL 能百分之百自动还原对应的过滤和搜索状态。
* 导出的 CSV 文件在 Microsoft Excel 或文本编辑器中解析正常，中文字符无乱码。

### 10.5 提交与验证策略
* **Commit 1**：只提交 URL 参数解析逻辑、导出驱动代码及更新后的详情与列表页按钮。
* **验证**：在 CI 中确认无打包构建问题，线上冒烟验证带 query 的 URL 跳转无白屏。
* **Commit 2**：更新文档，将 Phase 9 标记为已验证。

---

### 10.6 阶段执行提示词（可直接复制给 AI 运行）

```text
你现在是数据产品与前端工程专家，请实施 Phase 9：分享、导出与报告能力。

【目标】
为 MAP 前端打通数据流通生命周期，实现“带状态的链接复制分享”、“历史数据一键 CSV 导出”以及“可视化图表 PNG 导出”。

【修改范围与规格要求】
1. 新建或在 utils/ 中实现 useUrlState 辅助 Hook：
   - 自动监听和序列化 react-router-dom 的 search params。
   - 当用户在 Cities 页面搜索“厦门”并勾选“resourceComplete”时，URL 自动同步为 /#/cities?q=厦门&filter=complete。
   - 实现“复制分享链接”按钮：点击后将该 URL 写入用户剪贴板，并触发微秒级“链接已复制 🔗”毛玻璃 Toast 动效。
   - 确保当第三方用户在新浏览器打开该分享 URL 时，大屏自动反序列化并还原上述搜索和筛选状态。
2. 在 CityDetailPage 的数据说明区域新增“数据导出 📥”功能：
   - 提取 MergedCity 的 history 与 metrics 数据。
   - 在前端生成 UTF-8-BOM 格式（防止 Excel 乱码）的 CSV 字符串。
   - 创建动态 Blob 下载链接，触发浏览器下载："[城市名]_地铁客流历史数据.csv"。
3. 新增图表下载按钮：
   - 在城市详情折线图与对比雷达图工具栏上，优雅挂载“保存为图片 📷”按钮，调用 ECharts 实例的 chart.getDataURL() 实现高清晰度图表 PNG 导出。

【禁止修改范围】
1. 绝对不要修改 data/latest/*.json 的文件源，严禁修改 ECharts 初始化配置中已稳定的主题常量。

【本地验证】
1. 运行：npm run build
2. 手动在本地 preview 中执行 CSV 导出，检查导出文件格式；测试复制带 Query 的链接，跨浏览器验证状态是否精准复原。

【提交策略】
1. Commit 1 提交分享、导出逻辑与相关 UI 修改。
2. 远端 CI/CD 通过后，Commit 2 完成 CHANGELOG 与 ROADMAP 收口。
```

---

## 11. Phase 10：性能、可访问性与工程债整理

### 11.1 背景
随着 MAP 的路由、图表、封面图、导出及测试用例日益增多，工程底座开始积累一定包袱（如 Node.js 在 Actions 中的弃用警告、ECharts 分包加载不够彻底、以及移动端在极端触控下的响应延迟）。需要集中进行一次全网“深水区性能与可访问性”大扫除。

### 11.2 范围
* **性能与包分析**：
  * 引入 Vite 包大小分析插件，对生产包进行审计，进一步拆分包体积。
  * 将大体积的地图 GeoJSON（`china.json`）和 `quality_report.json` 采用异步懒加载策略（仅在路由激活时发起动态 fetch）。
* **可访问性 (A11y) 与键盘导航**：
  * 为所有核心筛选按钮、多选框、图表 Tab 补充完整的 `aria-label` 与 `role` 属性。
  * 补充完整的键盘 Focus 高亮轮廓以及对 `prefers-reduced-motion` 媒体查询的完整适配，为动画过载的用户关闭卡片浮动特效。
* **工程依赖生命周期整理**：
  * 解决 Actions 运行日志中关于 `Node.js 16/18` 弃用的 Warning，将 `.github/workflows/` 中所有使用的 actions 版本升级到 runtime 支持 Node.js 20+ 的最新版本（例如 `actions/checkout@v4`、`actions/upload-pages-artifact@v3`）。
  * 制定统一的 `package.json` 开发与依赖升级矩阵，保障第三方安全库漏洞拦截。

### 11.3 产物
* 优化升级后的 `.github/workflows/` 工作流定义。
* 完善的 A11y 属性与懒加载配置代码。
* [NEW] [docs/PERFORMANCE_A11Y_AUDIT.md](file:///c:/Users/Administrator/Desktop/FL/MAP/docs/PERFORMANCE_A11Y_AUDIT.md)：记录包体积比对数据与 Lighthouse 评分基线审计报告。

### 11.4 验收标准
* 本地打包产物中，主 bundle 体积压缩到最佳大小，ECharts 实现了完全的按需分割。
* GitHub Actions 运行全流程无任何 `node deprecated` 的警告日志。
* 大屏在 Lighthouse 检测中，A11y（可访问性）和 Performance（性能）评分保持高水准。

### 11.5 提交与验证策略
* **Commit 1**：只提交依赖项定义升级、组件懒加载优化与 A11y 辅助代码。
* **验证**：远端 CI 彻底清除 deprecated Warning，线上冒烟正常。
* **Commit 2**：提交 `docs/PERFORMANCE_A11Y_AUDIT.md` 并标记已完成。

---

### 11.6 阶段执行提示词（可直接复制给 AI 运行）

```text
你现在是前端资深架构师与性能调优专家，请实施 Phase 10：性能、可访问性与工程债整理。

【目标】
全面升级项目工程底座，解决 GitHub Actions 的 Node 废弃警告，优化 ECharts 懒加载及静态资源异步 fetch，引入 A11y 与 prefers-reduced-motion 保护，完成最后的工程债整理。

【修改范围与调优要求】
1. 升级 .github/workflows/ci.yml 和 pages.yml：
   - 将所有三方 action 步骤（如 checkout, upload-pages-artifact, deploy-pages）升级到支持 Node.js 20 运行环境的最新主版本（如 actions/checkout@v4），彻底消除 CI 日志中的 runtime 废弃 warning。
2. 优化资源动态 fetch 与 ECharts：
   - 确保 china.json 地图数据仅在 DashboardPage 渲染且 Chart 挂载时异步加载；避免在主 bundle 或路由入口提前阻塞。
   - 审计 vite.config.ts 中的分包策略，使 echarts 和 React 基础组件保持极致分块，提高浏览器缓存命中率。
3. 补充可访问性（A11y）和减弱动画支持：
   - 为搜索框、分类标签、对比多选框补充醒目的 :focus-visible 外观轮廓，并配置无歧义的 aria-label 属性。
   - 在 CSS 中全局引入 @media (prefers-reduced-motion: reduce) 媒体查询，一旦检测到用户设置，立即彻底关闭卡片 hover 浮起、封面图 zoom 以及大屏背景微动画，保障光敏敏感人群的使用安全。

【禁止修改范围】
1. 不得删除或修改任何 legacy 验收文件，不得降低 test:ui 和 test:pages 的既有断言。

【本地验证】
1. 运行：npm run build && npm run preview 检查分包体积与懒加载日志。
2. 运行本地 UI 测试与 pages 线上冒烟，确保调优后无任何交互降级或控制台报错。

【提交策略】
1. Commit 1 仅提交工程配置、三方 Actions 升级与组件性能优化。
2. 远端 CI/CD 验证无 warning 且部署全绿后，Commit 2 提交 docs/PERFORMANCE_A11Y_AUDIT.md 并正式完成全量路线图收口。
```

---

## 12. 长期演进风险清单

| 风险项 | 潜在影响 | 缓解措施 |
| :--- | :--- | :--- |
| **外部数据源结构与反爬变动** | 自动采集脚本失效，造成 Phase 6 的增量更新流程中断 | 1. 爬虫强制要求 JSON Schema 底线校验；<br>2. 爬取失败时 CI 自动阻断，仅发 PR 并自动报警，绝不污染 master 物理数据。 |
| **三方地图/图片资源版权纠纷** | wikimedia / commons 上的部分城市封面由于授权变更导致不合规 | 1. 坚决只采信 CC0/CC-BY/CC-BY-SA 协议图片；<br>2. 在 `assets/city-covers/manifest.json` 中保持高度精细的作者与来源溯源，支持人工一键下线机制。 |
| **大体积静态包对 Pages 部署造成延迟** | 随着多城市线路图及规划图 PNG 的入库，仓库体积可能显著增大 | 1. 在 Phase 10 中利用编译按需加载；<br>2. 限制单张城市大图不得超过 500KB，并采用高压缩率 PNG 或现代 WebP 格式。 |
| **双前端（React与单HTML文件）数据脱节** | 对 `data/latest/` 格式进行微调时导致旧版基线 `dashboard.html` 发生致命 JS 溢出 | 1. 强力保留 CI 中的 `legacy-check` 与 `scripts/run_acceptance.py`；<br>2. 任何涉及 schema 修改必须进行严格的双轨自动化回归测试。 |

---

## 13. 后续阶段建议排序

我们建议技术团队严格按照**“文案先理顺、规约先定稿、管道先跑通、页面再上马、复杂功放后”**的科学演进顺序执行：

$$\text{Phase 5.6.1 (文案统一)} \longrightarrow \text{Phase 5.7 (单HTML维护规约)} \longrightarrow \text{Phase 6/6.1 (自动采集与数据质量数据总线)}$$
$$\downarrow$$
$$\text{Phase 7 (数据质量可视化中心)} \longrightarrow \text{Phase 8 (多城数据对比控制台)} \longrightarrow \text{Phase 9 (分享与导出)} \longrightarrow \text{Phase 10 (工程债整理)}$$

此排序最大化保证了后面的复杂模块（如 `ComparePage`、`DataQualityPage`）能够直接使用前面阶段积淀下来的高质量数据总线与鲁棒性管道，有效规避了边开发新页面边重构数据层造成的双重返工。

---

## 14. 下一步首个执行提示词

技术团队下一步可以直接复制以下高精度提示词投喂给 AI 助手，以启动 **Phase 5.6.1** 的研发流程：

```text
你现在是资深前端开发与数据产品经理，请在 MAP 项目中全面实施 Phase 5.6.1：数据覆盖口径文案统一。

【当前背景】
当前 Dashboard 快照与 About 页在描述 50 索引城、34 统计城、23 实际展示城及 11 个日客流为 0 城市时口径较为模糊，可能引发数据自相矛盾误解。

【修改范围与要求】
1. 修改 frontend/src/components/common/DataSnapshotCard.tsx：
   - 保持科技深蓝玻璃微拟态样式。
   - 统一大屏口径为：
     - 城市索引：50 城
     - 有客流记录：34 城 (其中：实际展示 23 城 / 无可用日客流 11 城)
     - 暂无日客流：27 城 (16 城完全无统计 + 11 城客流暂缺)
     - 线路图覆盖：48 城
     - 规划图覆盖：41 城
     - 封面图覆盖：49 / 50
   - 在卡片内清晰通过文字或图例表达这些计算关系，去除任何“实时数据”或“官方认证”等可能产生实时性误导的文案，统一改为“公开数据快照”。
2. 修改 frontend/src/pages/AboutPage.tsx：
   - 确保数据指标统计处与上述口径完全统一，在显著位置补充“本站数据仅基于公开学术数据和各城市运营快照动态计算得出，并非实时官方数据”。
3. 升级 frontend/scripts/acceptance-react.cjs 中的 T26 和 T28：
   - 将原有 T26 断言改为硬比对上述新增口径文字（如 "有客流记录", "34 城", "实际展示 23 城", "暂无日客流", "27 城" 等）。
   - 将 T28 断言升级为硬校验“公开快照”或“动态读取”等文案的展示。

【禁止修改范围】
1. 不修改 dashboard.html，不重构 Legacy 验收套件。
2. 不修改 data/latest/*.json 及 cities/ 物理数据文件。
3. 不得降低现有的任何 test:ui 断言。

【本地验证】
在 CWD=frontend 下依次执行并确保全绿：
1. npm run typecheck
2. npm run build
3. npm run check:static
4. 本地预览服务器启动后跑：npm run test:ui （确保 T26、T28 通过）
5. 环境变量 BASE_URL 指向本地预览地址，运行：npm run test:pages

【提交策略】
1. Commit 1 仅提交前端代码、组件及测试脚本。
2. 观察远端 GitHub Actions 的 CI 与 自动 Deploy 全绿且线上 Smoke 完美通过后。
3. Commit 2 提交 CHANGELOG.md 与 docs/ROADMAP.md 的文档口径收口，标记 Phase 5.6.1 已完成。
```
