import { useEffect, useState } from 'react';
import { QUALITY_PROFILES } from '../lib/hero3d/palette';
import type { HeroQuality } from '../lib/hero3d/types';

/**
 * 设备能力探测（轻量，不做 benchmark）：
 * desktop capable → high / 普通桌面 → medium / 移动或弱设备 → low。
 * 断点跨越（移动↔桌面）时运行时重判。
 */
export function detectHeroQuality(): HeroQuality {
  if (typeof window === 'undefined') return 'medium';
  const isMobile =
    !!window.matchMedia &&
    (() => {
      try {
        return window.matchMedia('(max-width: 767px)').matches;
      } catch {
        return false;
      }
    })();
  if (isMobile) return 'low';

  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined;
  const dpr = window.devicePixelRatio ?? 1;
  if ((cores ?? 4) >= 8 && dpr >= 1) return 'high';
  if ((cores ?? 4) >= 4) return 'medium';
  return 'low';
}

export function useHeroQuality(): HeroQuality {
  const [quality, setQuality] = useState<HeroQuality>(detectHeroQuality);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia('(max-width: 767px)');
    } catch {
      return;
    }
    const onChange = () => setQuality(detectHeroQuality());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return quality;
}

export { QUALITY_PROFILES };
