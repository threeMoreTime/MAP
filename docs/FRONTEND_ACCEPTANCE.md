# React 前端验收文档

> 版本：v1.2.0-dev | 日期：2026-05-10

## 验收目标

验证 React 前端（Vite + React + TypeScript + HashRouter + ECharts）在生产构建后功能正常，覆盖三页路由、数据加载、图表渲染、交互操作、控制台错误、移动端适配和静态资源路径。

## 验收命令

```bash
cd frontend
npm install
npm run typecheck     # TypeScript 类型检查
npm run build         # 生产构建
npm run test:ui       # 浏览器自动化验收（T01-T22）
```

> `npm run test:ui` 会先执行 `npm run build`，再启动 Vite preview 服务器运行浏览器验收。

## 依赖说明

- `puppeteer-core` 已声明为 `frontend/devDependencies`，不依赖根目录 `node_modules`
- 验收脚本通过 `require('puppeteer-core')` 加载，需本地已安装 Chrome 浏览器
- `npm install` 即可自动安装所有验收依赖

## 页面覆盖

| 路由 | 页面 | 说明 |
|------|------|------|
| `/#/dashboard` | 数据总览 | Hero 区域 + 统计卡片 + 筛选工具栏 + 6 个图表区域 |
| `/#/cities` | 城市资源总览 | 城市卡片网格 + 搜索 + 筛选标签 |
| `/#/city/:id` | 城市详情 | 面包屑 + 统计卡片 + 趋势图 + 真实线路图/规划图 + 数据说明 |
| `/#/about` | 数据说明 | 数据来源、字段说明、更新机制、已知限制、免责声明 |

## 验收测试项（T01-T22）

| 编号 | 测试项 | 状态类型 | 说明 |
|------|--------|----------|------|
| T01 | 构建成功 | PASS/FAIL | `npm run build` 正常完成 |
| T02 | Preview 服务响应 | PASS/FAIL | Vite preview 服务器在 4173-4177 端口启动 |
| T03 | Dashboard 页可访问 | PASS/FAIL | 包含标题、统计卡片、筛选工具栏、图表区域 |
| T04 | Cities 页可访问 | PASS/FAIL | 城市卡片数量 > 0 |
| T05 | About 页可访问 | PASS/FAIL | 包含"数据来源"和"免责声明"内容 |
| T06 | Dashboard ECharts 实例 | PASS/FAIL | 至少 4 个 ECharts 实例（含 fallback 降级判断） |
| T07 | 搜索"厦门" | PASS/FAIL | 无控制台错误、无白屏 |
| T08 | 指标切换 | PASS/FAIL | 日客流/运营里程/运营站点/客流强度四项切换无错误 |
| T09 | TopN 切换 | PASS/FAIL | 10/20/全部三档切换无错误 |
| T10 | 地图点击城市详情 | **MANUAL** | ECharts canvas 点击坐标不稳定，需人工验证城市详情面板联动 |
| T11 | Cities 筛选标签 | PASS/FAIL | 全部城市/有客流数据/暂无客流/有线路图/有规划图五项无错误 |
| T12 | About 内容区块 | PASS/FAIL | 至少 5 个内容区块 |
| T13 | 控制台错误检查 | PASS/FAIL | 排除 favicon 404 和 sourcemap 警告 |
| T14 | 375px 移动端 | PASS/FAIL | 三页 scrollWidth <= innerWidth + 1 |
| T15 | 静态资源路径 | PASS/FAIL | data/latest 和 assets/china.json 成功加载 |
| T16 | 城市详情页可访问 | PASS/FAIL | /#/city/xiamen 包含"厦门""运营线路""年度客流趋势""线路图""数据说明" |
| T17 | Cities 点击导航 | PASS/FAIL | 搜索"厦门"并点击卡片，URL 变为 #/city/xiamen |
| T18 | 不存在城市处理 | PASS/FAIL | /#/city/not-exist 显示"未找到城市"，无 JS 错误 |
| T19 | 城市详情页移动端 | PASS/FAIL | 375px /#/city/xiamen scrollWidth <= innerWidth + 1 |
| T20 | 城市封面图资源加载 | PASS/FAIL | manifest-aware 检查：50 张卡片中 49 张 data-has-cover="true"、1 张 "false"（hohhot）；真实 cover fetch 返回 200 + image/*；hohhot backgroundImage 不含 hohhot.webp |
| T21 | 城市详情页线路图/规划图 | PASS/FAIL | 测试城市 xiamen：network img 存在且 fetch 200+image/*、查看原图链接存在；点击规划图 Tab 后 plan img 存在且 fetch 200+image/*、链接更新；无 console error；375px 无横向滚动；图片返回 text/html 即使 status=200 也 FAIL |
| T22 | 城市详情页线路图预览交互 | PASS/FAIL | 测试城市 xiamen：线路图 img 存在；点击放大按钮后缩放值变化或 transform 包含 scale；点击缩小按钮成功；点击重置后缩放值回到 100%；点击全屏预览按钮后 overlay 出现且含图片；按 ESC 后 overlay 关闭；切换规划图 Tab 后缩放值仍为 100%；375px 无横向滚动 |

### 状态类型说明

| 状态 | 含义 | 计入失败 |
|------|------|----------|
| PASS | 自动化验证通过 | 否 |
| FAIL | 自动化验证失败 | 是 |
| MANUAL | 需人工验证，不计入自动 PASS | 否 |
| SKIP | 跳过，不计入失败 | 否 |

> **注意**：自动化 PASS 不代表人工地图点击已完成。T10 需人工在浏览器中验证地图气泡点击后城市详情面板联动是否正常。

## Preview 服务器端口策略

验收脚本使用 `--strictPort` 模式启动 Vite preview：

- 按顺序尝试端口 4173 → 4174 → 4175 → 4176 → 4177
- 某端口被占用时，启动失败并自动尝试下一个端口
- 成功启动后记录真实使用的端口
- 不依赖 Vite 自动换端口行为，避免端口误判
- 所有端口均失败时输出清晰错误信息并退出

## 与旧版验收的关系

| 维度 | React 前端验收 | 旧版 Python 验收 |
|------|---------------|-----------------|
| 入口 | `cd frontend && npm run test:ui` | `python scripts/run_acceptance.py` |
| 目标 | React 前端（Vite 构建） | dashboard.html 单文件 |
| 测试项 | T01-T22（22 项，含 MANUAL） | 4 步串行（数据索引/校验/语法/浏览器 16 项） |
| 共存 | 两者独立运行，互不影响 | 两者独立运行，互不影响 |

## 验收结果汇总格式

```
Total: 22  PASS: 21  FAIL: 0  MANUAL: 1  SKIP: 0
```

- FAIL > 0 时退出码为 1
- MANUAL / SKIP 不导致失败
- 输出中明确标注 MANUAL 项

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
