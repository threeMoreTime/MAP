import { useState, useCallback, useEffect, useRef } from 'react';
import type { MergedCity } from '../../hooks/useMetroData';
import { withBaseUrl } from '../../utils/path';
import EmptyState from '../common/EmptyState';
import styles from './CityAssetPreview.module.css';

interface Props {
  city: MergedCity;
}

type TabKey = 'network' | 'plan';

const MIN_SCALE = 0.4;
const MAX_SCALE = 5;
const WHEEL_STEP = 0.12;
const CLICK_ZOOM_STEP = 0.35;
const TOOLBAR_ZOOM_STEP = 0.25;
const DRAG_THRESHOLD = 4;

function getActiveData(city: MergedCity, tab: TabKey) {
  if (tab === 'network') {
    return { has: city.has_network_map, mapPath: city.network_map_path, label: '线路图' };
  }
  return { has: city.has_plan_map, mapPath: city.plan_map_path, label: '规划图' };
}

export default function CityAssetPreview({ city }: Props) {
  const defaultTab: TabKey = city.has_network_map ? 'network' : city.has_plan_map ? 'plan' : 'network';
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const fullscreenViewportRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const dragMovedRef = useRef(false);

  const { has, mapPath, label } = getActiveData(city, activeTab);
  const imageUrl = has && mapPath ? withBaseUrl(mapPath) : null;
  const alt = `${city.city_cn}${label}`;
  const hasRealImage = has && imageUrl && !imageError;

  const resetView = useCallback(() => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  }, []);

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    setImageError(false);
    setImageLoading(true);
    resetView();
    setIsFullscreen(false);
  }, [resetView]);

  // === Toolbar actions ===
  const handleToolbarZoomIn = useCallback((e?: React.MouseEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setScale(prev => Math.min(prev + TOOLBAR_ZOOM_STEP, MAX_SCALE));
  }, []);

  const handleToolbarZoomOut = useCallback((e?: React.MouseEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setScale(prev => Math.max(prev - TOOLBAR_ZOOM_STEP, MIN_SCALE));
  }, []);

  const handleToolbarReset = useCallback((e?: React.MouseEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    resetView();
  }, [resetView]);

  const handleToolbarFullscreen = useCallback((e?: React.MouseEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setIsFullscreen(true);
  }, []);

  const handleFullscreenClose = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  // === Shared wheel handler factory ===
  const createWheelHandler = useCallback((container: HTMLElement) => (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setScale(prevScale => {
      const nextScale = Math.min(
        Math.max(prevScale * (e.deltaY < 0 ? (1 + WHEEL_STEP) : (1 - WHEEL_STEP)), MIN_SCALE),
        MAX_SCALE
      );
      const scaleRatio = nextScale / prevScale;

      setTranslateX(prevTx => mouseX - (mouseX - prevTx) * scaleRatio);
      setTranslateY(prevTy => mouseY - (mouseY - prevTy) * scaleRatio);

      return nextScale;
    });
  }, []);

  // === Shared mousedown handler factory ===
  const createMouseDownHandler = useCallback((container: HTMLElement) => (e: MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest(`.${styles.toolbar}`) || target.closest(`.${styles.viewOriginal}`) || target.closest('button') || target.closest('a')) {
      return;
    }
    e.preventDefault();
    isDraggingRef.current = true;
    dragMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      tx: translateX,
      ty: translateY,
    };
  }, [translateX, translateY, styles.toolbar, styles.viewOriginal]);

  // === Shared mousemove handler ===
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      dragMovedRef.current = true;
    }
    setTranslateX(dragStartRef.current.tx + dx);
    setTranslateY(dragStartRef.current.ty + dy);
  }, []);

  // === Shared mouseup handler factory ===
  const createMouseUpHandler = useCallback((container: HTMLElement) => (e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const wasDrag = dragMovedRef.current;
    isDraggingRef.current = false;

    if (!wasDrag && e.button === 0) {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setScale(prevScale => {
        const nextScale = Math.min(prevScale + CLICK_ZOOM_STEP, MAX_SCALE);
        if (nextScale === prevScale) return prevScale;
        const scaleRatio = nextScale / prevScale;
        setTranslateX(prevTx => mouseX - (mouseX - prevTx) * scaleRatio);
        setTranslateY(prevTy => mouseY - (mouseY - prevTy) * scaleRatio);
        return nextScale;
      });
    }
  }, []);

  // === Normal mode: native event listeners (non-passive wheel) ===
  useEffect(() => {
    const container = viewportRef.current;
    if (!container || !hasRealImage) return;

    const wheelHandler = createWheelHandler(container);
    const mouseDownHandler = createMouseDownHandler(container);

    container.addEventListener('wheel', wheelHandler, { passive: false });
    container.addEventListener('mousedown', mouseDownHandler);
    return () => {
      container.removeEventListener('wheel', wheelHandler);
      container.removeEventListener('mousedown', mouseDownHandler);
    };
  }, [hasRealImage, createWheelHandler, createMouseDownHandler]);

  // === Global mouse move/up for normal mode drag ===
  useEffect(() => {
    if (!hasRealImage) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        dragMovedRef.current = true;
      }
      setTranslateX(dragStartRef.current.tx + dx);
      setTranslateY(dragStartRef.current.ty + dy);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const wasDrag = dragMovedRef.current;
      isDraggingRef.current = false;

      if (!wasDrag && e.button === 0) {
        const container = viewportRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          setScale(prevScale => {
            const nextScale = Math.min(prevScale + CLICK_ZOOM_STEP, MAX_SCALE);
            if (nextScale === prevScale) return prevScale;
            const scaleRatio = nextScale / prevScale;
            setTranslateX(prevTx => mouseX - (mouseX - prevTx) * scaleRatio);
            setTranslateY(prevTy => mouseY - (mouseY - prevTy) * scaleRatio);
            return nextScale;
          });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [hasRealImage]);

  // === Fullscreen drag/wheel ===
  useEffect(() => {
    if (!isFullscreen || !hasRealImage) return;

    const container = fullscreenViewportRef.current;
    if (!container) return;

    const wheelHandler = createWheelHandler(container);
    const mouseDownHandler = createMouseDownHandler(container);

    container.addEventListener('wheel', wheelHandler, { passive: false });
    container.addEventListener('mousedown', mouseDownHandler);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', createMouseUpHandler(container));

    return () => {
      container.removeEventListener('wheel', wheelHandler);
      container.removeEventListener('mousedown', mouseDownHandler);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isFullscreen, hasRealImage, createWheelHandler, createMouseDownHandler, handleGlobalMouseMove, createMouseUpHandler]);

  // Store fullscreen mouseup handler ref for cleanup
  const fullscreenMouseUpRef = useRef<((e: MouseEvent) => void) | null>(null);

  useEffect(() => {
    if (!isFullscreen || !hasRealImage) {
      if (fullscreenMouseUpRef.current) {
        window.removeEventListener('mouseup', fullscreenMouseUpRef.current);
        fullscreenMouseUpRef.current = null;
      }
      return;
    }

    const container = fullscreenViewportRef.current;
    if (!container) return;

    const mouseUpHandler = createMouseUpHandler(container);
    fullscreenMouseUpRef.current = mouseUpHandler;
    window.addEventListener('mouseup', mouseUpHandler);

    return () => {
      window.removeEventListener('mouseup', mouseUpHandler);
      fullscreenMouseUpRef.current = null;
    };
  }, [isFullscreen, hasRealImage, createMouseUpHandler]);

  // === ESC to close fullscreen ===
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  // === Body scroll lock when fullscreen ===
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isFullscreen]);

  // === Fullscreen overlay click (close on backdrop only, not during drag) ===
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !dragMovedRef.current) {
      setIsFullscreen(false);
    }
  }, []);

  const zoomPercent = Math.round(scale * 100);

  // === Render toolbar (shared between normal & fullscreen) ===
  const renderToolbar = (classNames: { toolbar: string; toolBtn: string; zoomValue: string }, showFullscreen = true) => (
    <div className={classNames.toolbar} onClick={(e) => e.stopPropagation()}>
      <button className={classNames.toolBtn} onClick={handleToolbarZoomIn} aria-label="放大">+</button>
      <button className={classNames.toolBtn} onClick={handleToolbarZoomOut} aria-label="缩小">−</button>
      <button className={classNames.toolBtn} onClick={handleToolbarReset} aria-label="重置视图">⌂</button>
      {showFullscreen && (
        <button className={classNames.toolBtn} onClick={handleToolbarFullscreen} aria-label="全屏预览">⛶</button>
      )}
      <span className={classNames.zoomValue}>{zoomPercent}%</span>
    </div>
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'network' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('network')}
        >
          线路图
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'plan' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('plan')}
        >
          规划图
        </button>
      </div>

      <div className={styles.content}>
        {hasRealImage ? (
          <div
            className={styles.imageArea}
            ref={viewportRef}
          >
            {imageLoading && (
              <div className={styles.loading}>图片加载中...</div>
            )}

            {/* Toolbar - fixed top-left inside imageArea */}
            {renderToolbar({ toolbar: styles.toolbar, toolBtn: styles.toolBtn, zoomValue: styles.zoomValue }, true)}

            {/* Image with transform */}
            <div
              className={styles.imageTransform}
              style={{
                transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                transformOrigin: '0 0',
              }}
            >
              <img
                src={imageUrl}
                alt={alt}
                loading="lazy"
                decoding="async"
                className={styles.image}
                style={{ display: imageLoading ? 'none' : 'block' }}
                onLoad={() => setImageLoading(false)}
                onError={() => { setImageError(true); setImageLoading(false); }}
                draggable={false}
              />
            </div>

            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.viewOriginal}
              onClick={(e) => e.stopPropagation()}
            >
              查看原图
            </a>
          </div>
        ) : has && imageUrl && imageError ? (
          <div className={styles.empty}>
            <EmptyState icon="📁" title={`${label}加载失败`} description="图片资源无法加载" />
          </div>
        ) : (
          <div className={styles.empty}>
            <EmptyState icon="📁" title={`${label}资源正在收集整理中`} description={`暂无${label}资源`} />
          </div>
        )}
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && hasRealImage && (
        <div
          className={styles.fullscreenOverlay}
          onClick={handleOverlayClick}
          role="dialog"
          aria-modal="true"
          aria-label={`${city.city_cn}${label}全屏预览`}
        >
          {/* Fullscreen toolbar - fixed top-left */}
          {renderToolbar(
            { toolbar: styles.fullscreenToolbar, toolBtn: styles.fsToolBtn, zoomValue: styles.fsZoomValue },
            false
          )}

          {/* Fullscreen title */}
          <div className={styles.fullscreenTitle}>
            {city.city_cn} · {label}
          </div>

          {/* Fullscreen image viewport */}
          <div
            className={styles.fullscreenViewport}
            ref={fullscreenViewportRef}
          >
            <div
              className={styles.fullscreenImageTransform}
              style={{
                transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                transformOrigin: '0 0',
              }}
            >
              <img
                src={imageUrl}
                alt={alt}
                className={styles.fullscreenImage}
                draggable={false}
              />
            </div>
          </div>

          {/* Fullscreen close button */}
          <button
            className={styles.fullscreenClose}
            onClick={handleFullscreenClose}
            aria-label="关闭全屏预览"
          >
            ✕
          </button>

          {/* Fullscreen view original link */}
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.fullscreenViewOriginal}
            onClick={(e) => e.stopPropagation()}
          >
            查看原图
          </a>
        </div>
      )}
    </div>
  );
}
