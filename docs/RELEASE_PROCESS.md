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

## 步骤 8：可选 GitHub Pages 发布

> 当前尚未配置 GitHub Pages，此步骤为未来规划。

```bash
# 推送到 main 分支
git push origin main

# 如已配置 GitHub Pages，访问以下地址验证
# https://threemoretime.github.io/MAP/dashboard.html
```

---

## 附录：紧急回滚

若发布后发现严重问题：

```bash
# 查看提交历史
git log --oneline -10

# 回退到上一个稳定版本
git revert HEAD
git push origin main

# 或回退到指定版本
git revert <commit-hash>
```
