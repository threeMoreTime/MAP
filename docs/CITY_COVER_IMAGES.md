# City Cover Images

> Phase 4.7 — 城市卡片封面图片本地化

## 1. 为什么要本地城市封面图片

CitiesPage 城市卡片封面区原先使用 CSS 渐变色模拟图片质感。本地封面图片提升了视觉辨识度，让用户一眼识别城市特色。

**核心原则：**
- 所有图片必须来自 Wikimedia Commons / Wikidata
- 只使用版权明确、可溯源的 CC 协议图片
- 不使用版权不明的来源（百度图片、Google Images、小红书、携程、马蜂窝等）
- 图片加载失败时静默回退到 CSS 渐变，无 broken image

## 2. 图片来源策略

**唯一来源：** Wikimedia Commons (commons.wikimedia.org) / Wikidata (wikidata.org)

**搜索优先级：**
1. `{城市中文名} 天际线` — 中文 Wikimedia Commons 搜索
2. `{城市中文名} skyline` — 英文关键词搜索
3. `{城市中文名} 城市风光` — 中文城市风景
4. `{城市英文名} skyline` — 英文搜索
5. Wikidata P18 属性 — 城市实体关联图片（fallback）

**许可证要求：**
仅接受以下许可证：
- CC0 / Public Domain
- CC BY 2.0 / 2.5 / 3.0 / 4.0
- CC BY-SA 2.0 / 2.5 / 3.0 / 4.0

**过滤规则：**
- 宽度 ≥ 800px
- 宽高比 ≤ 5:1（排除超宽条形图）
- 排除文件名包含：logo, map, metro map, subway map, route, diagram, plan, icon, seal, flag
- 原始文件大小 ≤ 10MB

## 3. 脚本使用

```bash
# 处理所有城市（跳过已存在的）
python scrapers/scrape_city_covers.py

# 仅处理前 N 个城市（测试用）
python scrapers/scrape_city_covers.py --limit 3

# 处理单个城市
python scrapers/scrape_city_covers.py --city xiamen

# 强制重新下载
python scrapers/scrape_city_covers.py --force
python scrapers/scrape_city_covers.py --city beijing --force
```

**依赖：** requests, Pillow

```bash
pip install requests Pillow
```

## 4. Manifest 字段说明

`assets/city-covers/manifest.json` 记录每张图片的完整溯源信息：

| 字段 | 说明 |
|------|------|
| `city` | 城市 slug（英文标识） |
| `city_cn` | 城市中文名 |
| `file` | 文件名（如 `xiamen.webp`），fallback/error 时为 null |
| `status` | `downloaded` / `fallback` / `error` |
| `source_url` | Wikimedia Commons 文件描述页 URL |
| `image_url` | 原始图片下载 URL |
| `license` | 许可证名称（如 `CC BY-SA 4.0`） |
| `author` | 原作者 |
| `attribution` | 署名信息 |
| `width` | 转换后宽度（800px） |
| `height` | 转换后高度 |

## 5. 前端集成方式

CitiesPage 城市卡片封面使用 CSS `background-image` 叠加策略：

```tsx
<div
  className="city-cover-art city-cover-image"
  style={{
    backgroundImage: `url(${coverUrl}), ${gradientFallback})`,
  }}
/>
```

- **图片存在**：浏览器显示 webp 图片
- **图片 404**：浏览器静默回退到 CSS 渐变，无 broken image 图标
- **图片层上方**：radial-gradient 装饰层 + 底部渐变遮罩 + 信息浮层

## 6. 回退策略

| 场景 | 表现 |
|------|------|
| 城市有 webp 文件 | 显示封面图片 |
| 城市无 webp 文件（未下载/error） | CSS 渐变色回退 |
| 网络加载失败 | CSS 渐变色回退 |
| `assets/city-covers/` 目录不存在 | CSS 渐变色回退 |

## 7. 文件大小指南

| 指标 | 目标值 |
|------|--------|
| 单张图片 | 80KB - 180KB |
| 50 城市总计 | 5MB - 10MB |
| 输出格式 | WebP (quality=80, width=800px) |
| 硬上限 | 总计 ≤ 15MB |

## 8. 数据同步

`frontend/scripts/sync-data.cjs` 会自动将 `assets/city-covers/` 同步到 `frontend/public/assets/city-covers/`，在 `npm run dev` 和 `npm run build` 前自动执行。

`frontend/public/assets/city-covers/` 为同步产物，已在 `.gitignore` 中排除。

## 9. 图片来源与署名

- 所有已下载封面图的来源、作者、协议和署名信息记录在 `assets/city-covers/manifest.json`。
- `manifest.json` 是城市封面图的 attribution source of truth。
- 使用或分发这些图片时，应保留对应的 `source_url`、`license`、`author`、`attribution` 字段。
- CC BY / CC BY-SA 图片需要署名；CC BY-SA 图片的再分发需要遵守相同协议条款。
- 不得删除 manifest 中的来源与协议字段。

## 10. 构建检查

`frontend/scripts/check-static-build.cjs` T08 检查项：
- 如果 `dist/assets/city-covers/` 存在：检查 manifest.json 和至少一个 .webp 文件
- 如果不存在：输出 SKIP 信息，不失败构建（可选检查）

## Phase 4.7.1 八城补全策略

Phase 4.7.1 针对以下 8 个 fallback/error 城市做了更谨慎的候选筛选：

- 成都 (chengdu)、重庆 (chongqing)、高雄 (kaohsiung)、台北 (taipei)
- 福州 (fuzhou)、昆明 (kunming)、徐州 (xuzhou)、呼和浩特 (hohhot)

**增强措施：**
- 为每个城市配置精确搜索关键词（如 `Fuzhou Fujian skyline`、`Kunming Yunnan skyline`）
- 增加错误地名过滤：福州排除含 "Fuzhoushan"/"Taipei" 的候选，昆明排除含 "Kunming Lake"/"Summer Palace" 的候选，徐州排除含 "Zhengzhou"/"HSR" 的候选
- 增加宽高比过滤：`width/height >= 1.2`，拒绝竖向图片
- 增加候选重试：如果最佳候选下载失败（如文件过大），自动尝试下一个候选
- 支持 `--dry-run` 模式：输出候选列表但不下载，便于人工审核

**补全结果：**
- 7/8 城市成功补全
- 呼和浩特 (hohhot) 仍为 fallback：Wikimedia Commons 无合适的横向、有 license 的城市风景图片
- 找不到合规图片时继续 fallback，不使用版权不清晰或错误城市的图片
