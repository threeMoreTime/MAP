# DESIGN.md — 纸墨 · 朱印

全站视觉契约。P3 逐页迁移期间与迁移之后，任何界面改动以本文件为准；
token 唯一来源是 `src/styles/tokens.css`（Tailwind v4 `@theme`）。

## 1. 视觉主题与气质

纸墨编辑部：米白宣纸底上的墨色排印，朱砂红作为唯一强调色（印章意象，呼应地铁线路图的传统制图气质）。深度靠纸面阴影与底色阶差表达，不用边框围栏。数据面前是安静的纸，数据本身是墨。

## 2. 色彩与角色

| 令牌 | 值 | 角色 |
|---|---|---|
| `paper-50` | #faf8f1 | 页面画布 |
| `paper-100` | #f4f0e6 | 卡片/抬升面 |
| `paper-200` | #eae4d5 | 分割底/悬浮底 |
| `paper-300` | #dcd4c0 | 常规边线 |
| `ink-900` | #211d16 | 主文字 |
| `ink-700` | #453f33 | 次文字 |
| `ink-500` | #6e6656 | 说明文字 |
| `ink-400` | #8f8672 | 标签/轴文字 |
| `vermilion-500` | #c03d2b | 唯一强调：链接/选中/榜首/主 CTA |
| `vermilion-600/700` | #a83622 / #8f2f1d | 悬浮/按压 |
| `vermilion-100/50` | #f2ded6 / #f9efea | 淡朱底（选中态底色） |
| `jade-600` | #37755a | 仅"数据完备"类正向语义 |
| `gold-600` | #9a7325 | 仅"部分覆盖"类提示语义 |

60-30-10：纸面 60、墨字与边线 30、朱砂 ≤10。图表调色板见 tokens.css 中 `--chart-*` 变量（墨阶 + 朱砂高亮）。

## 3. 字体规则

- 标题（页面题、区块题、数字主指标）：`font-serif` = Noto Serif SC 子集（200-900 可变，swap 加载）→ Songti SC → SimSun → serif。字重 600。
- 正文/标签/按钮：`font-sans` 系统栈。字重 400/500。
- CJK 行高：正文 1.7-1.8；标题 1.25-1.35。
- **禁止对中文施加负字距**（letter-spacing 仅限 `lang="en"` 的拉丁串）。
- 数字列/指标：`tabular-nums`（`font-variant-numeric`）。

## 4. 组件样式

- **按钮**：默认 = 墨字 + paper-100 底 + 1px paper-300 边线，圆角 `rounded-md`(4px)；主按钮 = 白字 + vermilion-500 底；悬浮主按钮 vermilion-600；按压 `scale(0.96)` + vermilion-700；焦点 `focus-visible` 朱砂外圈。高度 ≥40px。
- **卡片**：默认**无卡片区块优先**（区块题 + 分割线）；确需容器时用 paper-100 底 + `shadow-card`，圆角 6px，hover `shadow-card-hover`（阴影抬升，不位移不变色边）。
- **表格/列表行**：行间 `1px solid rgba(33,29,22,0.06)` 分割线；数字右对齐 tabular-nums，标签左对齐。
- **输入/选择**：paper-50 底 + paper-300 边线，聚焦朱砂边线；无发光效果。

## 5. 布局原则

- 间距阶梯走 Tailwind 默认 4px 基准；区块间距 8 (32px) 为主节奏，区块内 4-6。
- 容器最大宽度 1180px 居中，左右 24px 内边距（移动 16px）。
- 状态总览在上、明细在下；无 hero 营销段。

## 6. 深度与抬升

0）画布 paper-50 → 1）卡片 paper-100 + shadow-card → 2）悬浮/浮层 paper-100 + shadow-card-hover。相邻表面至少 4% 亮度差或 shadow-card 起步。边框（paper-300）只用于分割与输入件，不用于卡片围栏。

## 7. Do / Don't

- Do：图表用墨阶序列、朱砂只给"当前关注的系列"。
- Do：空态写明"缺什么、为什么"（沿用现有口径文案）。
- Don't：紫色/青色渐变、玻璃拟态、渐变文字、>1px 的彩色左边条强调。
- Don't：对中文用负字距或 letter-spacing。
- Don't：动效中出现 bounce/elastic；只用 transform/opacity。
- Don't：同一元素混用 CSS Module 与 Tailwind 类。

## 8. 响应式

断点沿用 Tailwind 默认（sm 640 / md 768 / lg 1024）。移动端：导航折叠为现有形态，触控目标 ≥40px，单列卡片，图表高度 ≥240px。375px 无横向溢出（T31/T34 验收口径）。

## 9. Agent 提示速查

- 页面题：`font-serif text-2xl font-semibold text-ink-900`，区块题 `font-serif text-lg font-semibold text-ink-900` + 底部 1px paper-300 分割。
- 主指标卡：`bg-paper-100 rounded-lg shadow-card p-5`，数值 `font-serif text-3xl font-semibold text-ink-900 tabular-nums`，标签 `text-sm text-ink-500`。
- 选中态：`bg-vermilion-50 text-vermilion-600`；链接 `text-vermilion-500 hover:text-vermilion-600 underline-offset-4 hover:underline`。
- 进入动效：`motion-safe:animate-[fadeUp_.4s_var(--ease-paper)_both]`，同级子项 100ms 阶梯（inline style `animation-delay`）。
- 图表：轴标签 `--chart-axis-label`，网格 `--chart-split-line`，单系列 `--chart-ink-2`，榜首/选中 `--chart-vermilion`。
