import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { detectHeroQuality } from './useHeroQuality';
import {
  createHeroSceneState,
  heroSceneReducer,
  selectAutoRotateActive,
} from '../lib/hero3d/sceneReducer';

describe('detectHeroQuality 设备探测（simple + predictable + safe）', () => {
  const originalMatch = window.matchMedia;
  const originalHC = navigator.hardwareConcurrency;

  beforeEach(() => {
    vi.stubGlobal('devicePixelRatio', 1);
  });
  afterEach(() => {
    vi.stubGlobal('matchMedia', originalMatch);
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: originalHC,
      configurable: true,
    });
    vi.unstubAllGlobals();
  });

  function stubEnv(mobile: boolean, cores: number) {
    vi.stubGlobal('matchMedia', ((q: string) => ({
      matches: mobile ? q.includes('max-width') : false,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia);
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: cores,
      configurable: true,
    });
  }

  it('mobile（<=767px）→ low', () => {
    stubEnv(true, 16);
    expect(detectHeroQuality()).toBe('low');
  });

  it('desktop 4 cores → medium', () => {
    stubEnv(false, 4);
    expect(detectHeroQuality()).toBe('medium');
  });

  it('desktop 8 cores → high（当前预期档）', () => {
    stubEnv(false, 8);
    expect(detectHeroQuality()).toBe('high');
  });

  it('desktop 2 cores → low（弱设备）', () => {
    stubEnv(false, 2);
    expect(detectHeroQuality()).toBe('low');
  });
});

describe('hover A→B→leave 与 runtime reduce motion', () => {
  it('A hover → B hover → leave：状态与视觉归属正确迁移，无卡滞', () => {
    let s = createHeroSceneState();
    s = heroSceneReducer(s, { type: 'HOVER_ENTER', city: 'A' });
    expect(s).toMatchObject({ mode: 'hover', hoveredCity: 'A' });
    // A → B：同一次移动语义（leave A + enter B 在事件流中为两次派发）
    s = heroSceneReducer(s, { type: 'HOVER_ENTER', city: 'B' });
    expect(s).toMatchObject({ mode: 'hover', hoveredCity: 'B' });
    s = heroSceneReducer(s, { type: 'HOVER_LEAVE' });
    expect(s).toMatchObject({ mode: 'overview', hoveredCity: null });
    expect(selectAutoRotateActive(s)).toBe(true);
  });

  it('runtime reduce 双向：true 全灭 → false 恢复（按 intent 与模式裁决）', () => {
    let s = createHeroSceneState();
    // overview + 旋转开 → 切 reduce：动画全灭
    s = heroSceneReducer(s, { type: 'SET_REDUCED_MOTION', value: true });
    expect(selectAutoRotateActive(s)).toBe(false);
    // 切回 no-preference（overview）：按 intent 恢复
    s = heroSceneReducer(s, { type: 'SET_REDUCED_MOTION', value: false });
    expect(selectAutoRotateActive(s)).toBe(true);
    // focused 下切回 no-preference：不能恢复旋转
    s = heroSceneReducer(s, { type: 'SELECT_CITY', city: 'x' });
    s = heroSceneReducer(s, { type: 'TRANSITION_END' });
    s = heroSceneReducer(s, { type: 'SET_REDUCED_MOTION', value: true });
    s = heroSceneReducer(s, { type: 'SET_REDUCED_MOTION', value: false });
    expect(s.mode).toBe('focused');
    expect(selectAutoRotateActive(s)).toBe(false);
  });
});
