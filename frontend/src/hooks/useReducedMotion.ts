import { useSyncExternalStore } from 'react';

/**
 * prefers-reduced-motion 监听（支持运行时变化，非仅 mount 读取）。
 * 用 useSyncExternalStore 订阅媒体查询；jsdom 无完整实现时安全退化为 false。
 */
const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  let mq: MediaQueryList;
  try {
    mq = window.matchMedia(QUERY);
  } catch {
    return () => {};
  }
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia(QUERY).matches;
  } catch {
    return false;
  }
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
