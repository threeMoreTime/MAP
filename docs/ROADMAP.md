# 项目路线图

> 项目：全国城市地铁客流数据可视化大屏
> 版本：v1.0.0
> 日期：2026-05-05
> 仓库：threeMoreTime/MAP

---

## 当前状态

- 版本：v1.0.0
- 当前阶段：Phase 3 - 自动化验收脚本（已完成）
- 浏览器验收：16/16 PASS
- 数据覆盖：全国主要城市地铁客流数据

---

## Phase 1：文档基线建设（已完成）

**目标**：建立完整的项目文档体系，为后续迭代提供基线。

**产物**：
- [x] `docs/TESTING_ACCEPTANCE.md` - 验收测试文档
- [x] `docs/RELEASE_PROCESS.md` - 发布流程文档
- [x] `docs/ROADMAP.md` - 项目路线图
- [x] `docs/KNOWN_ISSUES.md` - 已知问题清单
- [x] `.github/PULL_REQUEST_TEMPLATE.md` - PR 模板

**验收标准**：
- 所有文档文件已创建并提交
- 文档内容与项目现状一致
- PR 模板可在 GitHub 正常使用

---

## Phase 2：数据结构标准化（已完成）

**目标**：统一数据格式，建立数据校验机制。

**产物**：
- [x] `data/latest/metro_stats.json` — 汇总 34 城市客流数据
- [x] `data/latest/city_assets_index.json` — 索引 48 城市资源文件
- [x] `data/latest/manifest.json` — 数据层整体统计
- [x] `data/schema/metro_stats.schema.json` — JSON Schema 定义
- [x] `scripts/build_data_index.py` — 数据索引构建脚本
- [x] `scripts/validate_data.py` — 数据校验脚本

**验收标准**：
- `build_data_index.py` 可重复生成数据层文件
- `validate_data.py` 输出 PASS（0 errors）
- dashboard.html 未被修改
- 文档已同步更新（DATA_SCHEMA、ARCHITECTURE_DATA_FLOW、TESTING_ACCEPTANCE）

---

## Phase 3：自动化验收脚本（已完成）

**目标**：将浏览器测试正式化，集成到开发流程。

**产物**：
- [x] `scripts/acceptance_dashboard.js` — puppeteer-core 浏览器验收（16 项）
- [x] `scripts/check_dashboard_syntax.py` — Dashboard JS 语法检查
- [x] `scripts/run_acceptance.py` — 总验收入口（4 步串行）
- [x] `package.json` — npm scripts 集成（test:data / test:dashboard / test:acceptance）

**验收标准**：
- `python scripts/run_acceptance.py` 一键执行全部验收
- 浏览器验收 16/16 PASS
- 自动启停静态服务，Chrome 路径自动检测
- 失败时退出码 1，全部通过退出码 0

---

## Phase 4：Dashboard 数据外置

**目标**：将嵌入在 HTML 中的 DATA 对象分离为独立 JSON 文件。

**产物**：
- [ ] 独立的城市数据 JSON 文件（`data/metro_data.json`）
- [ ] 修改 dashboard.html 通过 fetch 加载外部数据
- [ ] 数据加载失败的降级处理（友好提示）
- [ ] 加载性能优化（缓存、压缩）

**验收标准**：
- dashboard.html 中不再包含硬编码 DATA 对象
- 页面可正常加载外部 JSON 数据
- 网络异常时显示友好的错误提示
- 页面加载性能不低于当前水平

---

## Phase 5：GitHub Pages 发布

**目标**：通过 GitHub Pages 提供在线访问。

**产物**：
- [ ] GitHub Pages 配置（从 main 分支的根目录发布）
- [ ] 自定义 404 页面
- [ ] 在线 Demo 地址可正常访问
- [ ] README 中添加在线访问链接

**验收标准**：
- `https://threemoretime.github.io/MAP/dashboard.html` 可正常访问
- 地图、图表、搜索等所有功能正常
- 移动端访问布局正常
- 页面加载时间 < 5 秒

---

## Phase 6：增量更新与定期采集

**目标**：实现数据自动采集和定期更新。

**产物**：
- [ ] GitHub Actions 定时任务（Cron）
- [ ] 自动数据采集 + 提交工作流
- [ ] 数据变更检测（仅在有变化时提交）
- [ ] 更新失败的通知机制

**验收标准**：
- GitHub Actions 按计划自动执行数据采集
- 新数据自动提交到仓库并打 Tag
- 无数据变化时不产生空提交
- 采集失败时可通过 GitHub Notification 获知

---

## Phase 7：城市详情页增强

**目标**：为每个城市生成独立的详情页面。

**产物**：
- [ ] 城市详情页模板（单城市 HTML）
- [ ] 详情页生成脚本 `generate_city_pages.py`
- [ ] 详情页包含：客流趋势图、线路信息、历史对比
- [ ] Dashboard 中城市气泡点击跳转到详情页

**验收标准**：
- 每个有数据的城市均有独立的详情页
- 详情页数据与 Dashboard 一致
- 详情页在移动端可正常浏览
- 详情页之间可通过导航切换

---

## 时间线（预估）

| 阶段   | 内容                 | 预估工期 | 依赖       |
| ------ | -------------------- | -------- | ---------- |
| Phase 1 | 文档基线建设        | 已完成   | 无         |
| Phase 2 | 数据结构标准化      | 1 周     | Phase 1    |
| Phase 3 | 自动化验收脚本      | 1 周     | Phase 1    |
| Phase 4 | 数据外置            | 3 天     | Phase 2    |
| Phase 5 | GitHub Pages 发布   | 1 天     | Phase 4    |
| Phase 6 | 增量更新与定期采集  | 1 周     | Phase 3, 5 |
| Phase 7 | 城市详情页增强      | 2 周     | Phase 4, 5 |

---

## 备注

本路线图为规划性文档，实际执行顺序和工期可能根据项目需求调整。每个阶段开始前应在 Issue 中详细讨论具体实施方案。
