import { useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts';

export interface UseEChartOptions {
  loading?: boolean;
  onReady?: (instance: echarts.ECharts) => void;
}

export function useEChart(
  containerRef: React.RefObject<HTMLDivElement | null>,
  option: echarts.EChartsOption | null,
  deps: unknown[],
  opts?: UseEChartOptions,
) {
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const disposedRef = useRef(false);

  const getInstance = useCallback(() => instanceRef.current, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || opts?.loading) return;

    // Handle StrictMode double-init: check existing instance on the DOM element
    if (!instanceRef.current) {
      const existing = echarts.getInstanceByDom(el);
      if (existing) {
        instanceRef.current = existing;
      } else {
        instanceRef.current = echarts.init(el);
      }
    }

    const instance = instanceRef.current;
    disposedRef.current = false;

    if (option) {
      instance.setOption(option, true);
      opts?.onReady?.(instance);
    }

    return () => {
      disposedRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts?.loading, ...deps]);

  // Resize handling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      instanceRef.current?.resize();
    });
    ro.observe(el);

    const handleResize = () => {
      instanceRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [containerRef]);

  // Dispose on unmount
  useEffect(() => {
    const el = containerRef.current;
    return () => {
      if (instanceRef.current && el) {
        instanceRef.current.dispose();
        instanceRef.current = null;
      }
    };
  }, [containerRef]);

  return { getInstance };
}
