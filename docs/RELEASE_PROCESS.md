# 发布流程

> 项目：全国城市地铁客流数据可视化大屏
> 版本：v1.1.0
> 日期：2026-05-08
> 仓库：threeMoreTime/MAP

---

## 发布流程概览

```
更新数据 → 生成图表 → 嵌入 Dashboard → 语法检查 → 浏览器验收 → 更新文档 → Git Commit → 打 Tag → (可选) GitHub Pages
```

---

## 步骤 1：更新数据

运行数据采集脚本，获取最新的地铁客流数据。

```bash
# 运行爬虫脚本采集 MetroDB 数据
python scrapers/scrape_metrodb.py
```

- 确认采集脚本无报错
- 检查输出数据文件是否包含预期城市数量
- 记录数据更新日期

---

## 步骤 2：生成图表

运行图表生成脚本。

```bash
python scrapers/generate_charts.py
```

- 确认图表配置生成无报错
- 检查输出文件（`output/` 和 `cities/` 下的趋势图）内容是否完整

---

## 步骤 3：更新 Dashboard

将最新数据嵌入到 Dashboard 页面（当前为内嵌模式，Phase 4 将改为外部加载）。

```bash
# 当前：数据已内嵌在 dashboard.html 中，无需额外操作
# 运行采集脚本时数据会自动写入
python scrapers/scrape_metrodb.py
```

- 确认 `dashboard.html` 中 DATA 对象已更新
- 验证数据格式正确（JSON 结构完整）

---

## 步骤 4：执行验收

### 4.1 一键验收（推荐）

```bash
python scripts/run_acceptance.py
```

该命令自动执行：数据构建 → 数据校验 → JS 语法检查 → 浏览器真实验收。

`build_data_index.py` 采用稳定写入：当源数据未变化时不会重写 `data/latest/*.json`，避免无意义的 `generated_at` 时间戳 diff。

### 4.2 分步验收

```bash
# 数据校验
python scripts/validate_data.py

# JS 语法检查
python scripts/check_dashboard_syntax.py

# 浏览器验收
node scripts/acceptance_dashboard.js
```

验收标准：**16/16 PASS**（详见 [TESTING_ACCEPTANCE.md](./TESTING_ACCEPTANCE.md)）

若任何测试失败，需修复后重新执行本步骤。

---

## 步骤 5：更新文档

根据本次变更内容更新以下文档：

| 文档 | 更新时机 |
|------|----------|
| `CHANGELOG.md` | 每次发布必须更新 |
| `docs/ROADMAP.md` | 阶段完成或计划变更时更新 |
| `docs/KNOWN_ISSUES.md` | 发现新问题或修复已有问题时更新 |
| `docs/TESTING_ACCEPTANCE.md` | 测试用例变更时更新 |

---

## 步骤 6：Git Commit

```bash
# 查看变更文件
git status

# 查看具体变更内容
git diff

# 暂存所有相关文件（避免包含无关文件）
git add dashboard.html CHANGELOG.md docs/

# 提交，使用语义化提交信息
git commit -m "feat: update metro data to YYYY-MM-DD

- 更新 XX 个城市客流数据
- 新增 XX 城市
- 修复 XX 问题
"
```

---

## 步骤 7：打 Tag

```bash
# 创建带注释的版本标签
git tag -a v1.x.x -m "v1.x.x - YYYY-MM-DD 数据更新

主要变更：
- 变更描述 1
- 变更描述 2
"

# 推送标签到远程
git push origin v1.x.x
```

**版本号规则**（语义化版本）：

- **主版本号（Major）**：不兼容的数据结构变更或架构重构
- **次版本号（Minor）**：新增功能、新增城市数据、新增图表
- **修订号（Patch）**：数据更新、Bug 修复、文档更新

---

## 步骤 8：双前端发布与回归校验流程 (Phase 5.1 已配置)

项目现已支持新版 React 前端（主力）与旧版 Dashboard（Frozen Baseline）双规发布。

### 8.1 React 主发布与静态部署
1. 本地完成开发或数据更新；
2. 执行全量构建前同步与静态健全性校验：
   ```bash
   cd frontend
   npm ci
   npm run typecheck
   npm run build
   npm run check:static
   ```
3. 将修改推送至 GitHub 远程仓库的 `master` 分支，等待 CI 流水线（CI Workflow）全绿通过；
4. 进入 GitHub Actions 界面，手动触发 **Deploy React Frontend to Pages** 部署工作流，编译发布 `frontend/dist` 至 GitHub Pages；
5. 在线环境人工验收（参见 `docs/REACT_DEPLOYMENT.md`）。

### 8.2 Legacy 旧版基线回归校验
每次发布均需验证旧版 `dashboard.html` 的可用性与兼容性：
```bash
# 根目录下执行
npm ci
npm run test:acceptance
```

### 8.3 数据定时/手动采集与发布流程
数据采集与结构未发生改变，依然保留原有发布机制：
1. 运行 `python scrapers/scrape_metrodb.py` 及 `scrapers/scrape_all_cities.py`；
2. 运行 `python scrapers/generate_charts.py`；
3. 运行 `python scripts/validate_data.py` 对生成数据执行 Schema 校验；
4. 将数据变更推送至 Git 并重新执行双前端构建发布流程。

---

## 附录：紧急回滚 (Rollback)

若在线发布后发现严重缺陷或异常问题，请按以下双重保障方案回滚：

### 1. GitHub Pages 版本秒级回滚
1. 打开 GitHub 仓库页面，切换至 **Actions** -> **Deploy React Frontend to Pages**；
2. 在运行历史列表中，找到上一次已知稳定的部署历史记录；
3. 点击进入该记录，选择 **Re-run jobs**，将上一版本的静态包重新部署上线，实现秒级生产恢复。

### 2. 代码级别回退
若需要撤销造成故障的代码提交：
```bash
# 查看最近提交历史
git log --oneline -n 10

# 回退 HEAD 或指定异常提交
git revert HEAD
# (或回退指定哈希) git revert <commit-hash>

# 推送回退代码至远端
git push origin master
```
推送后，CI 自动校验，全绿后手动触发 Pages Workflow 即可完成生产彻底回滚。
