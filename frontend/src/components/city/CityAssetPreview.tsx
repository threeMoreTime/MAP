import { useState, useCallback, useEffect, useRef } from 'react';
import type { MergedCity } from '../../hooks/useMetroData';
import { withBaseUrl } from '../../utils/path';
import EmptyState from '../common/EmptyState';
import styles from './CityAssetPreview.module.css';

interface Props {
  city: MergedCity;
}

type TabKey = 'network' | 'plan';

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

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
  const [imageLoading, setImageLoading] = useState(false);

  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [fitMode, setFitMode] = useState<'contain' | 'natural'>('contain');

  const [isFullscreen, setIsFullscreen] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

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

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + SCALE_STEP, MAX_SCALE));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - SCALE_STEP, MIN_SCALE));
  }, []);

  const handleReset = useCallback(() => {
    resetView();
  }, [resetView]);

  const handleFitModeToggle = useCallback(() => {
    setFitMode(prev => (prev === 'contain' ? 'natural' : 'contain'));
    resetView();
  }, [resetView]);

  const handleFullscreenOpen = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  const handleFullscreenClose = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  // ESC to close fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  // Body scroll lock when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      tx: translateX,
      ty: translateY,
    };
  }, [scale, translateX, translateY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setTranslateX(dragStartRef.current.tx + dx);
    setTranslateY(dragStartRef.current.ty + dy);
  }, [isDragging, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Fullscreen overlay click
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsFullscreen(false);
    }
  }, []);

  const zoomPercent = Math.round(scale * 100);

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
        {hasRealImage && !imageLoading && (
          <div className={styles.toolbar}>
            <div className={styles.toolbarGroup}>
              <button
                className={styles.toolButton}
                onClick={handleZoomOut}
                disabled={scale <= MIN_SCALE}
                aria-label="缩小"
              >
                −
              </button>
              <span className={styles.zoomValue}>{zoomPercent}%</span>
              <button
                className={styles.toolButton}
                onClick={handleZoomIn}
                disabled={scale >= MAX_SCALE}
                aria-label="放大"
              >
                +
              </button>
              <button
                className={styles.toolButton}
                onClick={handleReset}
                aria-label="重置视图"
              >
                重置
              </button>
            </div>
            <div className={styles.toolbarGroup}>
              <button
                className={`${styles.toolButton} ${fitMode === 'natural' ? styles.toolButtonActive : ''}`}
                onClick={handleFitModeToggle}
                aria-label={fitMode === 'contain' ? '切换原始比例' : '切换适应容器'}
              >
                {fitMode === 'contain' ? '适应容器' : '原始比例'}
              </button>
              <button
                className={styles.toolButton}
                onClick={handleFullscreenOpen}
                aria-label="全屏预览"
              >
                全屏
              </button>
            </div>
          </div>
        )}

        {hasRealImage ? (
          <div
            className={styles.imageArea}
            ref={viewportRef}
          >
            {imageLoading && (
              <div className={styles.loading}>图片加载中...</div>
            )}
            <div
              className={`${styles.imageViewport} ${isDragging ? styles.imageDragging : ''}`}
              style={{
                overflow: fitMode === 'natural' && scale > 1 ? 'auto' : 'hidden',
              }}
            >
              <div
                className={styles.imageInner}
                style={{
                  transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                  transformOrigin: 'center center',
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                <img
                  src={imageUrl}
                  alt={alt}
                  loading="lazy"
                  decoding="async"
                  className={styles.image}
                  style={{
                    width: fitMode === 'contain' ? '100%' : undefined,
                    maxWidth: fitMode === 'natural' ? 'none' : undefined,
                    cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                    userSelect: 'none',
                    display: imageLoading ? 'none' : 'block',
                  }}
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageError(true);
                    setImageLoading(false);
                  }}
                  draggable={false}
                />
              </div>
            </div>
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.viewOriginal}
            >
              查看原图
            </a>
          </div>
        ) : has && imageUrl && imageError ? (
          <div className={styles.empty}>
            <EmptyState
              icon="📁"
              title={`${label}加载失败`}
              description="图片资源无法加载"
            />
          </div>
        ) : (
          <div className={styles.empty}>
            <EmptyState
              icon="📁"
              title={`${label}资源正在收集整理中`}
              description={`暂无${label}资源`}
            />
          </div>
        )}
      </div>

      {isFullscreen && hasRealImage && (
        <div
          className={styles.fullscreenOverlay}
          onClick={handleOverlayClick}
          role="dialog"
          aria-modal="true"
          aria-label={`${city.city_cn}${label}全屏预览`}
        >
          <div className={styles.fullscreenContent}>
            <div className={styles.fullscreenHeader}>
              <div className={styles.fullscreenTitle}>
                {city.city_cn} · {label}
              </div>
              <button
                className={styles.fullscreenClose}
                onClick={handleFullscreenClose}
                aria-label="关闭全屏预览"
              >
                ✕
              </button>
            </div>
            <div className={styles.fullscreenImageWrap}>
              <img
                src={imageUrl}
                alt={alt}
                className={styles.fullscreenImage}
              />
            </div>
            <div className={styles.fullscreenFooter}>
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.viewOriginal}
              >
                查看原图
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
