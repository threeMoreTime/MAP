import { useEffect } from 'react';
import { echarts } from '../../lib/echarts';

/**
 * HeroMap3D 事件桥（click/hover 通道 + 拖拽判定 + 相机运动后的 hover 重验证
 * + mousedown/up 拾取预热）。全部为 DOM/实例层 wiring，不含业务状态。
 *
 * hover 离开的两条防线：
 * 1) zr mousemove 距离判定（鼠标主动离开节点 30px）；
 * 2) hover 存在期间 250ms 轮询重验证（相机运动把节点移离鼠标时清除）——
 *    不用 geo3dcamerachanged 事件实现：实测监听它会破坏 echarts-gl 的
 *    mousedown/mouseup/click 元素事件派发链。
 *
 * mousedown/mouseup 预热拾取（DOM capture，先于 echarts 事件处理）：
 * echarts-gl 的 chart 级 click 派发条件依赖 pointsMesh.dataIndex（只由
 * mousemove 维护）；render 重建 mesh 后若鼠标静止，dataIndex 失效导致
 * 点击丢失，预热在 down/up 前主动 pick 一次并补设。
 */

export interface HeroEventHandlerMap {
  onCityHover: (city: string | null) => void;
  onCitySelect: (city: string) => void;
  onCameraDrag: () => void;
}

export interface HeroEventBridgeRefs {
  instanceRef: React.MutableRefObject<echarts.ECharts | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  handlersRef: React.MutableRefObject<HeroEventHandlerMap>;
  hoverRef: React.MutableRefObject<{ city: string; dataIndex: number; x: number; y: number } | null>;
  lastMouseRef: React.MutableRefObject<{ x: number; y: number }>;
  revalidateTimerRef: React.MutableRefObject<number | null>;
}

/** 判定拖拽的位移阈值（px）：小于此视为点击，不挂起旋转 */
const DRAG_THRESHOLD = 6;
/** hover 命中半径（px）：鼠标远离节点屏幕位置即视为离开 */
const HOVER_LEAVE_RADIUS = 30;
/** 相机运动后 hover 重验证半径（px）：节点当前投影与鼠标距离超过即清除 */
const HOVER_REVALIDATE_RADIUS = 32;
/** hover 存在期间的重验证轮询间隔（ms） */
const HOVER_REVALIDATE_INTERVAL_MS = 250;

/** geo3D 组件的内部坐标系逃逸口（echarts-gl 无官方类型，收敛在此处与 HeroMap3D） */
interface Geo3DComponentLike {
  coordinateSystem?: {
    dataToPoint?: (data: number[]) => number[];
    viewGL?: {
      viewport?: { width: number; height: number };
      layer?: {
        pickObject(x: number, y: number): {
          target?: { dataIndex?: number };
          vertexIndex?: number;
        } | undefined;
      };
    };
  };
}
type InstanceWithModel = {
  getModel: () => { getComponent: (mainType: string) => unknown };
};

function getGeo3D(inst: echarts.ECharts): Geo3DComponentLike | undefined {
  return (inst as unknown as InstanceWithModel).getModel().getComponent('geo3D') as
    | Geo3DComponentLike
    | undefined;
}

/**
 * 相机运动后的 hover 重验证：读取 echarts-gl 逐帧维护的 PointsMesh._positionNDC
 * （与拾取判定同源的数据），把悬停节点的当前屏幕投影与最新鼠标位置比较。
 * mesh 每次 render 可能被替换，故每次轮询重新解析。
 */
function isHoverStillOnNode(
  inst: echarts.ECharts,
  dataIndex: number,
  mouse: { x: number; y: number },
): boolean {
  try {
    if (dataIndex < 0) return false;
    const views = (inst as unknown as {
      _chartsViews?: Array<{
        type?: string;
        _pointsBuilderList?: Array<{ _mesh?: { _positionNDC?: Float32Array } }>;
      }>;
    })._chartsViews;
    const mesh = views?.find((v) => v.type === 'scatter3D')?._pointsBuilderList?.[0]?._mesh;
    const ndc = mesh?._positionNDC;
    if (!ndc || dataIndex * 2 + 1 >= ndc.length) return false;
    const vp = getGeo3D(inst)?.coordinateSystem?.viewGL?.viewport;
    if (!vp) return false;
    const sx = (ndc[dataIndex * 2] * 0.5 + 0.5) * vp.width;
    const sy = (1 - (ndc[dataIndex * 2 + 1] * 0.5 + 0.5)) * vp.height;
    return Math.hypot(sx - mouse.x, sy - mouse.y) <= HOVER_REVALIDATE_RADIUS;
  } catch {
    return false;
  }
}

function primePickOnMouseEvent(inst: echarts.ECharts, e: MouseEvent): void {
  try {
    const layer = getGeo3D(inst)?.coordinateSystem?.viewGL?.layer;
    const r = layer?.pickObject(e.offsetX, e.offsetY);
    if (r?.target && r.vertexIndex != null) {
      r.target.dataIndex = r.vertexIndex;
    }
  } catch {
    /* 预热失败不致命，最坏情况点击无响应与修复前一致 */
  }
}

export function useHeroMapEvents(refs: HeroEventBridgeRefs, phase: 'loading' | 'ready' | 'fallback'): void {
  const { instanceRef, containerRef, handlersRef, hoverRef, lastMouseRef, revalidateTimerRef } = refs;

  // 事件桥：click / hover 进入 / hover 离开（距离判定 + 轮询重验证）/ 拾取预热
  useEffect(() => {
    const inst = instanceRef.current;
    if (phase !== 'ready' || !inst) return;

    const stopRevalidate = () => {
      if (revalidateTimerRef.current != null) {
        clearInterval(revalidateTimerRef.current);
        revalidateTimerRef.current = null;
      }
    };
    const ensureRevalidate = () => {
      if (revalidateTimerRef.current != null) return;
      revalidateTimerRef.current = window.setInterval(() => {
        const hover = hoverRef.current;
        if (!hover) {
          stopRevalidate();
          return;
        }
        const still = isHoverStillOnNode(inst, hover.dataIndex, lastMouseRef.current);
        if (!still) {
          hoverRef.current = null;
          handlersRef.current.onCityHover(null);
          stopRevalidate();
        }
      }, HOVER_REVALIDATE_INTERVAL_MS);
    };

    const onClick = (params: unknown) => {
      const p = params as { data?: { city?: string } };
      if (p.data?.city) handlersRef.current.onCitySelect(p.data.city);
    };
    const onMouseOver = (params: unknown) => {
      const p = params as {
        data?: { city?: string };
        dataIndex?: number;
        event?: { offsetX?: number; offsetY?: number };
      };
      const city = p.data?.city;
      if (!city) return;
      hoverRef.current = {
        city,
        dataIndex: p.dataIndex ?? -1,
        x: p.event?.offsetX ?? 0,
        y: p.event?.offsetY ?? 0,
      };
      lastMouseRef.current = { x: p.event?.offsetX ?? 0, y: p.event?.offsetY ?? 0 };
      handlersRef.current.onCityHover(city);
      ensureRevalidate();
    };
    const onZrMouseMove = (e: { offsetX?: number; offsetY?: number }) => {
      lastMouseRef.current = { x: e.offsetX ?? 0, y: e.offsetY ?? 0 };
      const hover = hoverRef.current;
      if (!hover) return;
      const dx = lastMouseRef.current.x - hover.x;
      const dy = lastMouseRef.current.y - hover.y;
      if (Math.hypot(dx, dy) > HOVER_LEAVE_RADIUS) {
        hoverRef.current = null;
        handlersRef.current.onCityHover(null);
        stopRevalidate();
      }
    };
    const onLeaveDom = () => {
      if (hoverRef.current) {
        hoverRef.current = null;
        handlersRef.current.onCityHover(null);
      }
      stopRevalidate();
    };

    inst.on('click', onClick);
    inst.on('mouseover', onMouseOver);
    inst.getZr().on('mousemove', onZrMouseMove);
    inst.on('mouseout', onLeaveDom);
    inst.on('globalout', onLeaveDom);

    const domEl = containerRef.current;
    const onDomDown = (e: MouseEvent) => primePickOnMouseEvent(inst, e);
    const onDomUp = (e: MouseEvent) => primePickOnMouseEvent(inst, e);
    domEl?.addEventListener('mousedown', onDomDown, { capture: true });
    domEl?.addEventListener('mouseup', onDomUp, { capture: true });

    return () => {
      stopRevalidate();
      domEl?.removeEventListener('mousedown', onDomDown, { capture: true } as EventListenerOptions);
      domEl?.removeEventListener('mouseup', onDomUp, { capture: true } as EventListenerOptions);
      inst.off('click', onClick);
      inst.off('mouseover', onMouseOver);
      inst.getZr().off('mousemove', onZrMouseMove);
      inst.off('mouseout', onLeaveDom);
      inst.off('globalout', onLeaveDom);
    };
  }, [phase, instanceRef, containerRef, handlersRef, hoverRef, lastMouseRef, revalidateTimerRef]);

  // 用户拖拽/缩放判定：位移超阈值或滚轮 → 挂起自动旋转（点击不受影响）。
  // 上报发生在拖拽过程中（阈值一过即报），而非 pointerup：
  // echarts-gl 每次 setOption 都会用 model.autoRotate 重放控制层旋转态，
  // React 不尽快把 model 置 false，周期渲染会在拖拽中途复活旋转。
  useEffect(() => {
    const el = containerRef.current;
    if (phase !== 'ready' || !el) return;
    let down = false;
    let moved = 0;
    let reported = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (e: PointerEvent) => {
      down = true;
      moved = 0;
      reported = false;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!down) return;
      moved += Math.hypot(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
      if (moved > DRAG_THRESHOLD && !reported) {
        reported = true;
        handlersRef.current.onCameraDrag();
      }
    };
    const onPointerUp = () => {
      down = false;
    };
    const onWheel = () => handlersRef.current.onCameraDrag();
    const onLeave = () => {
      down = false;
      if (hoverRef.current) {
        hoverRef.current = null;
        handlersRef.current.onCityHover(null);
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [phase, containerRef, handlersRef, hoverRef]);
}
