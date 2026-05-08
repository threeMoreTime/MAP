# React 前端验收文档

> 版本：v1.0.0 | 日期：2026-05-09

## 验收目标

验证 React 前端（Vite + React + TypeScript + HashRouter + ECharts）在生产构建后功能正常，覆盖三页路由、数据加载、图表渲染、交互操作、控制台错误、移动端适配和静态资源路径。

## 验收命令

```bash
cd frontend
npm install
npm run typecheck     # TypeScript 类型检查
npm run build         # 生产构建
npm run test:ui       # 浏览器自动化验收（T01-T15）
```

## 页面覆盖

| 路由 | 页面 | 说明 |
|------|------|------|
| `/#/dashboard` | 数据总览 | Hero 区域 + 统计卡片 + 筛选工具栏 + 6 个图表区域 |
| `/#/cities` | 城市资源总览 | 城市卡片网格 + 搜索 + 筛选标签 |
| `/#/about` | 数据说明 | 数据来源、字段说明、更新机制、已知限制、免责声明 |

## 验收测试项（T01-T15）

| 编号 | 测试项 | 说明 |
|------|--------|------|
| T01 | 构建成功 | `npm run build` 正常完成 |
| T02 | Preview 服务响应 | Vite preview 服务器在 4173-4177 端口启动 |
| T03 | Dashboard 页可访问 | 包含标题"全国城市地铁客流可视化平台"、统计卡片、筛选工具栏、图表区域 |
| T04 | Cities 页可访问 | 城市卡片数量 > 0 |
| T05 | About 页可访问 | 包含"数据来源"和"免责声明"内容 |
| T06 | Dashboard ECharts 实例 | 至少 4 个 ECharts 实例（地图/排行/里程/趋势/强度） |
| T07 | 搜索"厦门" | 无控制台错误、无白屏 |
| T08 | 指标切换 | 日客流/运营里程/运营站点/客流强度四项切换无错误 |
| T09 | TopN 切换 | 10/20/全部三档切换无错误 |
| T10 | 地图点击详情 | 自动化点击不稳定，列为手动验证项 |
| T11 | Cities 筛选标签 | 全部城市/有客流数据/暂无客流/有线路图/有规划图五项无错误 |
| T12 | About 内容区块 | 至少 5 个内容区块 |
| T13 | 控制台错误检查 | 排除 favicon 404 和 sourcemap 警告，JSON 404/JS 异常/React 错误计为失败 |
| T14 | 375px 移动端 | 三页 scrollWidth <= innerWidth + 1 |
| T15 | 静态资源路径 | data/latest 和 assets/china.json 成功加载 |

## 与旧版验收的关系

| 维度 | React 前端验收 | 旧版 Python 验收 |
|------|---------------|-----------------|
| 入口 | `cd frontend && npm run test:ui` | `python scripts/run_acceptance.py` |
| 目标 | React 前端（Vite 构建） | dashboard.html 单文件 |
| 测试项 | T01-T15（15 项） | 4 步串行（数据索引/校验/语法/浏览器 16 项） |
| 共存 | 两者独立运行，互不影响 | 两者独立运行，互不影响 |

## 前置条件

- Chrome 浏览器已安装（或设置 `PUPPETEER_EXECUTABLE_PATH` 环境变量）
- `npm run build` 可正常执行
- `data/latest/` 和 `assets/china.json` 已通过 `scripts/sync-data.cjs` 同步到 `frontend/public/`

## Chrome 路径检测

验收脚本按以下顺序查找 Chrome：

1. 环境变量 `PUPPETEER_EXECUTABLE_PATH`
2. 环境变量 `CHROME_PATH`
3. Windows 默认路径：`C:\Program Files\Google\Chrome\Application\chrome.exe` 等
4. macOS 默认路径：`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
5. Linux 默认路径：`/usr/bin/google-chrome` 或 `/usr/bin/chromium-browser`

若未找到 Chrome，脚本将以 exit 1 退出。
