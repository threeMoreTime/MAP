import type { MetricKey } from '../../types/metro';
import { QUALITY_PROFILES } from './palette';
import type { HeroSceneAction, HeroSceneState } from './types';

/**
 * Hero 场景状态机（纯 reducer，可单测）。
 *
 * 模式语义：
 * - overview：全国视角，autoRotate 由派生规则决定
 * - hover：悬停城市（无选中时），autoRotate 暂停
 * - transitioning：镜头过渡中，禁止重复触发过渡
 * - focused：城市聚焦完成，右侧详情面板在场，autoRotate 不自动恢复
 */

export function createHeroSceneState(
  init?: Partial<Pick<HeroSceneState, 'metric' | 'selectedCity' | 'quality' | 'reducedMotion'>>,
): HeroSceneState {
  // URL ?city= 直达：数据就绪前即进入 focused（面板先行，镜头由场景层在 ready 后补聚焦）
  const selected = init?.selectedCity ?? null;
  const quality = init?.quality ?? 'medium';
  return {
    mode: selected ? 'focused' : 'overview',
    metric: init?.metric ?? ('daily_ridership_wan' as MetricKey),
    selectedCity: selected,
    hoveredCity: null,
    // 移动端 / 弱设备（low 档）默认不起转，节省 GPU；用户可用 controls 打开
    autoRotateEnabled: quality !== 'low',
    autoRotateSuspended: false,
    showLines: true,
    showLabels: true,
    reducedMotion: init?.reducedMotion ?? false,
    quality,
    visible: true,
    introDone: false,
    transition: null,
  };
}

export function heroSceneReducer(
  state: HeroSceneState,
  action: HeroSceneAction,
): HeroSceneState {
  switch (action.type) {
    case 'HOVER_ENTER': {
      if (state.hoveredCity === action.city) return state;
      const mode =
        state.mode === 'overview'
          ? ('hover' as const)
          : state.mode; // focused / transitioning / 已有 hover：hover 不覆盖 selected 与过渡
      return { ...state, hoveredCity: action.city, mode };
    }
    case 'HOVER_LEAVE': {
      if (state.hoveredCity === null) return state;
      // 已有选中城市时回 focused，不得回 overview
      const mode =
        state.mode === 'hover'
          ? state.selectedCity
            ? ('focused' as const)
            : ('overview' as const)
          : state.mode;
      return { ...state, hoveredCity: null, mode };
    }
    case 'SELECT_CITY': {
      if (!action.city) return state;
      // 过渡中重复点击同一城市：幂等，不重启镜头
      if (
        state.mode === 'transitioning' &&
        state.transition?.to === 'focus' &&
        state.transition.city === action.city
      ) {
        return state;
      }
      return {
        ...state,
        mode: 'transitioning',
        selectedCity: action.city,
        transition: { to: 'focus', city: action.city },
      };
    }
    case 'CLOSE_PANEL': {
      if (!state.selectedCity) return state;
      return {
        ...state,
        mode: 'transitioning',
        selectedCity: null,
        hoveredCity: null,
        transition: { to: 'reset', city: null },
      };
    }
    case 'RESET_VIEW': {
      // 重置视角：清选中（走回全国过渡）、解除旋转挂起，并总是发出相机重置信号
      return {
        ...state,
        mode: state.selectedCity ? 'transitioning' : 'overview',
        selectedCity: null,
        hoveredCity: null,
        transition: { to: 'reset', city: null },
        autoRotateSuspended: false,
      };
    }
    case 'TRANSITION_END': {
      if (!state.transition) return state;
      // 相机命令（如无选中的重置视角）不经过 transitioning 模式，只清过渡信号
      if (state.mode !== 'transitioning') return { ...state, transition: null };
      if (state.transition.to === 'focus' && state.selectedCity) {
        return { ...state, mode: 'focused', transition: null };
      }
      return { ...state, mode: 'overview', transition: null };
    }
    case 'SET_METRIC': {
      if (state.metric === action.metric) return state;
      return { ...state, metric: action.metric };
    }
    case 'TOGGLE_AUTOROTATE': {
      // 显式开关重新武装旋转（清除拖拽挂起）
      return {
        ...state,
        autoRotateEnabled: !state.autoRotateEnabled,
        autoRotateSuspended: false,
      };
    }
    case 'TOGGLE_LINES':
      return { ...state, showLines: !state.showLines };
    case 'TOGGLE_LABELS':
      return { ...state, showLabels: !state.showLabels };
    case 'USER_CAMERA_DRAG':
      // 用户手动调整视角：旋转挂起，直到重置视角或再次切换开关
      if (state.autoRotateSuspended) return state;
      return { ...state, autoRotateSuspended: true };
    case 'SET_REDUCED_MOTION':
      return { ...state, reducedMotion: action.value };
    case 'SET_QUALITY':
      return { ...state, quality: action.quality };
    case 'SET_VISIBILITY':
      return { ...state, visible: action.visible };
    case 'INTRO_DONE':
      return { ...state, introDone: true };
    default:
      return state;
  }
}

/** 派生：当前 autoRotate 是否应当转动（hover 延迟恢复由场景层计时处理） */
export function selectAutoRotateActive(state: HeroSceneState): boolean {
  if (state.reducedMotion || !state.visible) return false;
  if (!state.autoRotateEnabled || state.autoRotateSuspended) return false;
  if (state.mode === 'focused' || state.mode === 'transitioning') return false;
  if (state.hoveredCity != null) return false;
  return true;
}

/** 派生：动画旗标（reduced motion / 不可见时全部熄灭） */
export function selectAmbientAnimation(state: HeroSceneState): {
  pulse: boolean;
  ambience: boolean;
  flylineEffect: boolean;
} {
  if (state.reducedMotion || !state.visible) {
    return { pulse: false, ambience: false, flylineEffect: false };
  }
  const profile = QUALITY_PROFILES[state.quality];
  return {
    pulse: profile.pulse.enabled,
    ambience: profile.ambience,
    flylineEffect: true,
  };
}
