import { describe, expect, it } from 'vitest';
import {
  createHeroSceneState,
  heroSceneReducer,
  selectAmbientAnimation,
  selectAutoRotateActive,
} from './sceneReducer';
import type { HeroSceneAction, HeroSceneState } from './types';

function run(state: HeroSceneState, ...actions: HeroSceneAction[]): HeroSceneState {
  return actions.reduce(heroSceneReducer, state);
}

describe('heroSceneReducer 场景状态机', () => {
  it('overview → hover → overview（无选中城市）', () => {
    let s = createHeroSceneState();
    expect(s.mode).toBe('overview');
    s = run(s, { type: 'HOVER_ENTER', city: 'beijing' });
    expect(s.mode).toBe('hover');
    expect(s.hoveredCity).toBe('beijing');
    // hover 期间旋转暂停
    expect(selectAutoRotateActive(s)).toBe(false);
    s = run(s, { type: 'HOVER_LEAVE' });
    expect(s.mode).toBe('overview');
    expect(s.hoveredCity).toBeNull();
    expect(selectAutoRotateActive(s)).toBe(true);
  });

  it('overview → transitioning → focused（点击城市）', () => {
    let s = createHeroSceneState();
    s = run(s, { type: 'SELECT_CITY', city: 'shanghai' });
    expect(s.mode).toBe('transitioning');
    expect(s.selectedCity).toBe('shanghai');
    expect(s.transition).toEqual({ to: 'focus', city: 'shanghai' });
    // 过渡中旋转停
    expect(selectAutoRotateActive(s)).toBe(false);
    // 重复点击同一城市幂等，不重启镜头
    const again = run(s, { type: 'SELECT_CITY', city: 'shanghai' });
    expect(again).toBe(s);
    s = run(s, { type: 'TRANSITION_END' });
    expect(s.mode).toBe('focused');
    expect(s.transition).toBeNull();
    // focused 下 autoRotate 不自动恢复
    expect(selectAutoRotateActive(s)).toBe(false);
  });

  it('focused → transitioning → overview（关闭详情）', () => {
    let s = run(
      createHeroSceneState(),
      { type: 'SELECT_CITY', city: 'guangzhou' },
      { type: 'TRANSITION_END' },
    );
    expect(s.mode).toBe('focused');
    s = run(s, { type: 'CLOSE_PANEL' });
    expect(s.mode).toBe('transitioning');
    expect(s.selectedCity).toBeNull();
    expect(s.transition).toEqual({ to: 'reset', city: null });
    s = run(s, { type: 'TRANSITION_END' });
    expect(s.mode).toBe('overview');
    expect(selectAutoRotateActive(s)).toBe(true);
  });

  it('selected 状态不被 hover 覆盖：focused 下 hover 进出仍回 focused', () => {
    let s = run(
      createHeroSceneState(),
      { type: 'SELECT_CITY', city: 'chengdu' },
      { type: 'TRANSITION_END' },
    );
    s = run(s, { type: 'HOVER_ENTER', city: 'xian' });
    expect(s.mode).toBe('focused');
    expect(s.hoveredCity).toBe('xian');
    expect(s.selectedCity).toBe('chengdu');
    s = run(s, { type: 'HOVER_LEAVE' });
    expect(s.mode).toBe('focused');
    expect(s.hoveredCity).toBeNull();
  });

  it('hover 中点击城市：hover 语义让位聚焦过渡', () => {
    const s = run(
      createHeroSceneState(),
      { type: 'HOVER_ENTER', city: 'wuhan' },
      { type: 'SELECT_CITY', city: 'wuhan' },
    );
    expect(s.mode).toBe('transitioning');
    expect(s.selectedCity).toBe('wuhan');
  });

  it('拖拽挂起旋转；重置视角 / 显式开关解除', () => {
    let s = run(createHeroSceneState(), { type: 'USER_CAMERA_DRAG' });
    expect(s.autoRotateSuspended).toBe(true);
    expect(selectAutoRotateActive(s)).toBe(false);
    // 重置视角（无选中）解除挂起
    s = run(s, { type: 'RESET_VIEW' });
    expect(selectAutoRotateActive(s)).toBe(true);
    // 拖拽后关再开旋转开关也解除
    s = run(s, { type: 'USER_CAMERA_DRAG' }, { type: 'TOGGLE_AUTOROTATE' });
    expect(s.autoRotateEnabled).toBe(false);
    s = run(s, { type: 'TOGGLE_AUTOROTATE' });
    expect(s.autoRotateEnabled).toBe(true);
    expect(s.autoRotateSuspended).toBe(false);
  });

  it('reduced motion：旋转与持续动画全灭，UI 状态反馈仍可用', () => {
    let s = createHeroSceneState();
    s = run(s, { type: 'SET_REDUCED_MOTION', value: true });
    expect(selectAutoRotateActive(s)).toBe(false);
    expect(selectAmbientAnimation(s)).toEqual({
      pulse: false,
      ambience: false,
      flylineEffect: false,
    });
    // 选中反馈仍然成立
    s = run(s, { type: 'SELECT_CITY', city: 'hangzhou' }, { type: 'TRANSITION_END' });
    expect(s.mode).toBe('focused');
    expect(s.selectedCity).toBe('hangzhou');
  });

  it('滚出视口：持续动画暂停，回到视口恢复', () => {
    let s = createHeroSceneState();
    s = run(s, { type: 'SET_VISIBILITY', visible: false });
    expect(selectAutoRotateActive(s)).toBe(false);
    expect(selectAmbientAnimation(s).flylineEffect).toBe(false);
    s = run(s, { type: 'SET_VISIBILITY', visible: true });
    expect(selectAutoRotateActive(s)).toBe(true);
  });

  it('URL ?city= 直达初始化为 focused', () => {
    const s = createHeroSceneState({ selectedCity: 'shenzhen' });
    expect(s.mode).toBe('focused');
    expect(s.selectedCity).toBe('shenzhen');
    // 直达 focused 下关闭面板走标准回全国链路
    const s2 = run(s, { type: 'CLOSE_PANEL' }, { type: 'TRANSITION_END' });
    expect(s2.mode).toBe('overview');
  });

  it('controls 开关：飞线 / 标签 / 指标切换', () => {
    let s = createHeroSceneState();
    s = run(s, { type: 'TOGGLE_LINES' });
    expect(s.showLines).toBe(false);
    s = run(s, { type: 'TOGGLE_LABELS' });
    expect(s.showLabels).toBe(false);
    s = run(s, { type: 'SET_METRIC', metric: 'operating_mileage_km' });
    expect(s.metric).toBe('operating_mileage_km');
    // 幂等
    expect(run(s, { type: 'SET_METRIC', metric: 'operating_mileage_km' })).toBe(s);
  });

  it('quality 档位驱动环境动画旗标', () => {
    const high = run(createHeroSceneState(), { type: 'SET_QUALITY', quality: 'high' });
    expect(selectAmbientAnimation(high)).toEqual({
      pulse: true,
      ambience: true,
      flylineEffect: true,
    });
    const low = run(createHeroSceneState(), { type: 'SET_QUALITY', quality: 'low' });
    expect(selectAmbientAnimation(low).ambience).toBe(false);
    expect(selectAmbientAnimation(low).pulse).toBe(false);
  });
});
