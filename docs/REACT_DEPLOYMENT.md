# React 前端静态部署与发布手册

> 项目：全国城市地铁客流数据可视化大屏
> 版本：v1.2.0-dev
> 仓库：threeMoreTime/MAP

---

## 1. 部署目标与架构

新版主力前端位于 `frontend/`，技术栈为 **React 18 + TypeScript + Vite + ECharts + HashRouter**。
项目静态部署设计采用“动静分离，自包含打包”策略：
- 使用 **HashRouter** 进行路由管理。因为 Hash 路由（如 `/#/cities`）在刷新时浏览器不会向服务器发送路径请求，而是纯前端解析，因此在 GitHub Pages 刷新时不会触发 404 错误。
- 同时，项目配备了自定义静态 `404.html`，用于在 GitHub Pages 环境下，对外部或第三方直接发起非 Hash 格式的子路径访问（例如直接打开非 Hash 格式链接 `/MAP/cities`）进行自动识别与修复，将其安全地重定向回 SPA 的 Hash 路由格式（如 `/MAP/#/cities`），避免 404 错误。
- GitHub Pages 子路径下的预期访问链接为：`https://threemoretime.github.io/MAP/#/dashboard`。

---

## 2. 本地构建与数据同步

每次构建前，必须保证本地最新的客流数据及图片同步至 React 前端的静态目录中：
Vite 配置已设置 `base: './'`。在执行 `npm run build` 时，由于 `prebuild` 钩子配置，会自动触发运行 `scripts/sync-data.cjs`：
1. 将 `data/latest/*.json` 复制到 `frontend/public/data/latest/`；
2. 将 `assets/china.json` 复制到 `frontend/public/assets/china.json`；
3. 将 `assets/city-covers/` 下的缩略摄影封面及 `manifest.json` 复制到 `frontend/public/assets/city-covers/`；
4. 将 `cities/` 中各城市声明的高清线路网图和规划图（PNG）复制到 `frontend/public/cities/` 中。

> [!NOTE]
> `frontend/public/data/`、`frontend/public/assets/` 及 `frontend/public/cities/` 均为同步临时目录，已被 `.gitignore` 排除，绝不提交至 Git 仓库。

---

## 3. 本地验证指令

在提交代码或发布前，应在本地环境执行全套验证程序：

### 3.1 验证旧版 Dashboard 基线 (Legacy Baseline)
```bash
# 根目录下安装依赖并执行全套验收测试（含数据 Schema 验证及 16 项浏览器真真实交互验收）
npm ci
npm run test:data
npm run test:acceptance
```

### 3.2 验证 React 主力前端
```bash
cd frontend
npm ci
npm run typecheck       # TS 类型安全检查
npm run build           # 生产构建（自动执行 prebuild 数据同步）
npm run check:static    # 静态健全性检验（T01-T09）
npm run test:ui         # React 浏览器真真实交互验收（T01-T25）
```

---

## 4. CI 检查矩阵 (Continuous Integration)

项目配置了 GitHub Actions 自动化 CI 工作流（`.github/workflows/ci.yml`），每次向 `master` 分支推送或提交 PR 时自动触发，执行三个相互隔离的 Job：

| Job 标识 | 目的 | 执行步骤 |
|----------|------|----------|
| `legacy-check` | 确保旧版 `dashboard.html` 基线 100% 可用 | `npm ci` -> `npm run test:data` -> `npm run test:acceptance` (运行系统 Chrome) |
| `react-check` | 验证 React 代码合规性与静态打包完整度 | `npm ci` -> `npm run typecheck` -> `npm run build` -> `npm run check:static` |
| `react-ui-test` | 隔离运行 React 自动化 UI 浏览器验收 | 记录系统 `google-chrome --version` -> `npm ci` -> `npm run build` -> `npm run test:ui` (依赖 Chrome  headless) |

### check:static 静态安全检查项 (T01-T09)
Vite 生产构建输出至 `frontend/dist/` 后，静态健全性校验脚本将强制检查以下项，任何一项不满足 CI 将标记为 Fail：
- **T01**：`dist/index.html` 文件必须存在。
- **T02**：`dist/assets/` 静态资源目录必须存在。
- **T03**：`dist/data/latest/` 下的 `metro_stats.json`、`city_assets_index.json`、`manifest.json` 必须完整存在。
- **T04**：`dist/assets/china.json` 地图底图必须存在。
- **T05**：`index.html` 绝对路径安全检查，不允许包含任何直接指向根目录的非相对路径资源（如 `/assets/` 或 `/data/`）。
- **T06**：打包后的 JS/HTML 中不得包含任何硬编码的绝对数据路径。
- **T07**：`dist/assets/` 下必须至少包含一个 `.js` 和一个 `.css` 编译产物。
- **T08**：`city-covers` 完整性校验。
- **T09**：读取 `city_assets_index.json`，验证 `dist/cities/` 中所有声明的线路网图和规划图（PNG）物理文件均存在，不得丢失任何一个城市的图源。

---

## 5. GitHub Pages 手动部署流程

为保障发布的绝对可控，GitHub Pages 部署工作流采用 **手动触发** 模式。

### 部署前提
1. 代码已成功合并入 `master` 分支；
2. 远端 CI 工作流已通过并全绿。

### 触发步骤
1. 打开 GitHub 仓库页面，切换至 **Actions** 选项卡；
2. 在左侧工作流列表中选择 **Deploy React Frontend to Pages**；
3. 点击右侧的 **Run workflow** 下拉菜单，选择 `master` 分支，点击绿色按钮触发执行；
4. 部署完成后，在 `deploy` Job 详情中会打印出最终的部署 URL。

### 部署产物
部署流程会自动将 `frontend/dist` 打包并安全托管至 GitHub 官方 CDN。**绝对不会发布仓库的根目录，保证了源码和临时数据的隔离**。

---

## 6. 上线后人工验收清单

发布上线后，请通过浏览器访问以下测试链接进行最终的环境验收：

- [ ] **数据大屏首页**：[https://threemoretime.github.io/MAP/#/dashboard](https://threemoretime.github.io/MAP/#/dashboard)
  - 验证地图散点及各项排行图正常加载，无 ECharts 报错。
  - 在搜索框输入“厦门”，检查图表能否联动筛选，点击散点能否正常拉起详情弹窗。
- [ ] **城市资源网格**：[https://threemoretime.github.io/MAP/#/cities](https://threemoretime.github.io/MAP/#/cities)
  - 验证 50 个城市的名片卡片以瀑布流格式完美排版。
  - 检查封面图加载完整，卡片微标状态与实际收录符合。
- [ ] **城市详情页面**：[https://threemoretime.github.io/MAP/#/city/xiamen](https://threemoretime.github.io/MAP/#/city/xiamen)
  - 检查年度历史折线趋势图正常渲染。
  - 切换“线网图”与“规划图”Tab，验证图片加载，并使用滚轮进行放大、缩小及平移拖动，功能应丝滑无卡顿。
  - 检查关于 Wikimedia 的署名及免责声明面板展示无溢出。
- [ ] **说明页面**：[https://threemoretime.github.io/MAP/#/about](https://threemoretime.github.io/MAP/#/about)
  - 验证各项数据定义表排版对齐。
- [ ] **Hash 路由防刷新机制**：
  - 在 [https://threemoretime.github.io/MAP/#/cities](https://threemoretime.github.io/MAP/#/cities) 页面，直接按下浏览器刷新键（F5）。
  - 预期结果：因为 HashRouter 刷新时浏览器完全不向服务器发起路径请求，所以页面会纯前端本地重新渲染，完美展示当前路由，绝对不会报错或发生 404。
- [ ] **直连非 Hash 子路径兜底校验（404 重定向）**：
  - 在浏览器地址栏中输入非 Hash 格式的地址并回车：`https://threemoretime.github.io/MAP/cities`（注意没有 `/#/`）。
  - 预期结果：GitHub Pages 404 兜底机制生效，加载自定义的极简 `404.html` 页面并立即执行路径修复脚本，在毫秒级内自动将其重定向回标准的 Hash 格式 `https://threemoretime.github.io/MAP/#/cities`，页面顺利渲染出城市网格，用户甚至无感知。

---

## 7. 紧急回滚方案 (Rollback)

若在线环境验证发现灾难性故障或异常，请遵循以下流程回滚：

### 7.1 Pages 静态版本回滚
1. 进入 GitHub 仓库的 **Settings** -> **Pages**。
2. 更改 Source 或暂停 Pages 服务以立即下线受损网页。
3. （或者）在 GitHub Actions 历史中，找到上一次成功部署的 `Deploy React Frontend to Pages` 历史记录，选择重新部署该 Artifact 即可秒级恢复。

### 7.2 代码回滚
1. 若定位为 master 上的代码逻辑故障，本地执行：
   ```bash
   git log --oneline -n 10
   git revert <error-commit-hash>
   git push origin master
   ```
2. 等待 CI 完成，再次手动触发部署工作流上线。
