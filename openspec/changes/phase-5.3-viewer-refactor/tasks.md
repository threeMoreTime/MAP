# Phase 5.3 任务清单

## 任务组 1：交互模型重构

- [x] 重构 CityAssetPreview.tsx 状态模型（scale/translateX/translateY/isDragging/dragStart/dragMoved refs）
- [x] 实现鼠标滚轮缩放（preventDefault、鼠标位置缩放中心、minScale/maxScale 限制）
- [x] 实现鼠标左键拖拽（window mousemove/mouseup、不要求 scale > 1、cursor grab/grabbing、拖拽阈值 4px）
- [x] 实现鼠标左键单击放大（拖拽阈值区分、点击位置缩放中心、到 maxScale 不重置）
- [x] 不绑定双击重置事件
- [x] 工具栏 stopPropagation 避免触发图片交互

## 任务组 2：工具栏与样式重构

- [x] 工具栏移至图片容器左上角（position absolute、z-index 高于图片）
- [x] 工具栏不参与 transform，不随图片移动
- [x] 工具栏样式改为小圆形按钮、浅灰/白色半透明背景、轻微阴影
- [x] 工具栏按钮：+ (放大)、− (缩小)、⌂ (重置)、⛶ (全屏)
- [x] 每个按钮有 aria-label
- [x] 图片查看区域背景改为浅灰 #f3f4f6
- [x] 图片容器高度响应式（desktop 680px、tablet 560px、mobile 400px）
- [x] 保留查看原图链接

## 任务组 3：全屏模式重构

- [x] 全屏模式使用同一套交互逻辑（滚轮缩放、拖拽、单击放大）
- [x] 全屏工具栏固定在左上角
- [x] 全屏中 ESC 关闭全屏
- [x] Tab 切换时关闭全屏并重置视图
- [x] 打开全屏时禁止 body 滚动，关闭后恢复
- [x] 全屏背景浅灰或深色、图片区域清晰

## 任务组 4：重置与边界处理

- [x] 重置按钮：scale=1, translateX=0, translateY=0，不关闭全屏
- [x] Tab 切换自动重置视图并关闭全屏
- [x] EmptyState 不显示查看器工具栏
- [x] 组件卸载时清理 window 事件监听
- [x] 移动端 375px 无横向滚动、工具栏不撑破容器

## 任务组 5：验收脚本更新

- [x] 增强 T22：工具栏固定左上角位置检查
- [x] 增强 T22：鼠标滚轮缩放测试（wheel 事件、scale 变化）
- [x] 增强 T22：左键单击放大测试（click、scale 增大）
- [x] 增强 T22：拖拽测试（mousedown/move/up、translate 变化、不要求 scale > 1）
- [x] 增强 T22：重置按钮测试（scale 回到 100%）
- [x] 增强 T22：全屏测试（overlay 出现、全屏工具栏、全屏中 wheel 缩放、全屏中拖拽、ESC 关闭）
- [x] 增强 T22：Tab 切换重置测试
- [x] 增强 T22：375px 无横向滚动

## 任务组 6：文档更新

- [x] 更新 docs/FRONTEND_ACCEPTANCE.md T22 描述
- [x] 更新 docs/REACT_MIGRATION_PLAN.md 新增 Phase 5.3 章节
- [x] 更新 docs/ROADMAP.md 新增 Phase 5.3

## 任务组 7：验证

- [x] npm run typecheck 通过
- [x] npm run build 通过
- [x] npm run check:static 通过
- [x] npm run test:ui 全部 PASS（T01-T23，T10 MANUAL）
- [x] python scripts/run_acceptance.py 旧版 16/16 PASS
