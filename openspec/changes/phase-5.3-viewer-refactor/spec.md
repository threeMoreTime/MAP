# Phase 5.3 规格说明

## 场景

### 场景 1：PC 用户浏览线路图
- 用户访问城市详情页，看到线路图以浅灰背景地图查看器风格展示
- 工具栏固定在图片容器左上角，包含 +/−/⌂/⛶ 按钮
- 用户滚动鼠标滚轮，图片以鼠标位置为缩放中心放大/缩小
- 用户按住左键拖拽图片，不需要先放大
- 用户单击图片，图片放大一档
- 双击不做任何特殊行为

### 场景 2：全屏预览
- 用户点击全屏按钮，进入全屏模式
- 全屏模式中工具栏仍在左上角
- 全屏中滚轮缩放、拖拽、单击放大行为与普通模式完全一致
- ESC 关闭全屏
- Tab 切换时关闭全屏并重置视图

### 场景 3：EmptyState 城市
- 城市无线路图/规划图时，显示 EmptyState
- EmptyState 不显示查看器工具栏

### 场景 4：移动端
- 375px 无横向滚动
- 工具栏按钮更小但可用
- 页面正常滚动不被阻止

## 验收标准

1. 滚轮缩放：鼠标位于图片容器内时，滚轮向上放大、向下缩小，缩放中心为鼠标位置
2. 左键拖拽：鼠标在图片容器内按住左键即可拖拽，不要求 scale > 1
3. 左键单击放大：鼠标移动距离 <= 4px 视为单击，图片放大一档，缩放中心为点击位置
4. 双击不触发重置
5. 工具栏固定在图片容器左上角，不随图片缩放/拖拽移动
6. 全屏模式交互与普通模式一致
7. Tab 切换时重置视图并关闭全屏
8. EmptyState 不显示查看器工具栏
9. 375px 无横向滚动
10. 不修改 dashboard.html、data/latest、cities 源目录、CitiesPage、DashboardPage

## 缩放参数

- minScale = 0.4
- maxScale = 5
- wheelStep = 0.12
- clickZoomStep = 0.35
- toolbarZoomStep = 0.25
- dragThreshold = 4px

## 工具栏按钮

- 放大：+ (aria-label="放大")
- 缩小：− (aria-label="缩小")
- 重置视图：⌂ (aria-label="重置视图")
- 全屏预览：⛶ (aria-label="全屏预览")
- 缩放值显示：xxx%

## 禁止事项

- 不引入第三方图片预览库
- 不新增 UI 框架
- 不修改 dashboard.html
- 不修改 data/latest/*.json
- 不修改 cities/ 原始资源
- 不修改 DashboardPage / CitiesPage
- 不提交 frontend/public/** / frontend/dist/** / frontend/node_modules/**
