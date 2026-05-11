# Phase 5.3：地铁线路图 / 规划图查看器交互重构

## Why

当前 CityAssetPreview 组件的 PC 端图片预览交互为按钮式缩放，不符合地铁图查看器的预期体验。用户希望交互更接近 MetroMan 地铁图查看器（metroman.cn/maps/beijing），提供滚轮缩放、鼠标位置缩放中心、左键拖拽、左键单击放大等地图查看器级别的交互。

## What Changes

### 交互模型重构
- 滚轮缩放：鼠标滚轮控制图片缩放，缩放中心为鼠标当前位置
- 左键拖拽：鼠标左键按住即可拖拽图片，不要求 scale > 1
- 左键单击放大：单击图片放大一档（有拖拽阈值区分）
- 不实现双击重置
- 工具栏固定在图片容器左上角，不随图片移动
- 全屏模式与普通模式共用同一套交互逻辑

### 样式重构
- 图片查看区域背景从深蓝改为浅灰（#f3f4f6）
- 工具栏改为小圆形按钮、浅灰半透明背景、轻微阴影
- 图片容器高度：desktop 620-720px、tablet 520-600px、mobile 360-460px

### 验收更新
- T22 增强为覆盖滚轮缩放、左键拖拽、左键单击放大、全屏内交互等完整测试

### 文档更新
- FRONTEND_ACCEPTANCE.md、REACT_MIGRATION_PLAN.md、ROADMAP.md 新增 Phase 5.3

## Impact

- 新增 capability：地图查看器级别图片交互
- 修改文件：
  - `frontend/src/components/city/CityAssetPreview.tsx` — 交互模型重构
  - `frontend/src/components/city/CityAssetPreview.module.css` — 样式重构
  - `frontend/scripts/acceptance-react.cjs` — T22 增强
  - `docs/FRONTEND_ACCEPTANCE.md` — T22 描述更新
  - `docs/REACT_MIGRATION_PLAN.md` — Phase 5.3 记录
  - `docs/ROADMAP.md` — Phase 5.3 记录
