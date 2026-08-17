import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useHeroScene } from './useHeroScene';
import type { MergedCity } from './useMetroData';
import type { MetricKey } from '../types/metro';

function city(name: string, nameCn: string, daily: number, mileage: number): MergedCity {
  return {
    city: name,
    city_cn: nameCn,
    daily_ridership_wan: daily,
    operating_mileage_km: mileage,
    operating_stations: 100,
    operating_lines: 10,
    ridership_intensity: 0.5,
    has_stats: daily > 0,
  } as unknown as MergedCity;
}

const data = [
  city('shanghai', '上海', 1200, 800),
  city('beijing', '北京', 1100, 700),
  city('guangzhou', '广州', 900, 600),
];

function setup(props: Partial<Parameters<typeof useHeroScene>[0]> = {}) {
  return renderHook(
    (p: { metric: MetricKey; selectedCity: string | null }) =>
      useHeroScene({ data, reducedMotion: false, quality: 'high', ...p }),
    {
      initialProps: { metric: 'daily_ridership_wan' as MetricKey, selectedCity: null, ...props },
    },
  );
}

describe('useHeroScene 外部状态同步', () => {
  it('metric prop 变化 → 场景 metric 同步（Hero 与 Dashboard 单一 source of truth）', () => {
    const h = setup();
    expect(h.result.current.state.metric).toBe('daily_ridership_wan');
    act(() => {
      h.rerender({ metric: 'operating_mileage_km', selectedCity: null });
    });
    expect(h.result.current.state.metric).toBe('operating_mileage_km');
    // 排行按新指标重算（里程榜首仍是上海，次席北京 700）
    expect(h.result.current.ranked[1].value).toBe(700);
  });

  it('URL selectedCity prop 出现 → SELECT_CITY 过渡链路；消失 → CLOSE_PANEL 回全国', () => {
    const h = setup();
    act(() => {
      h.rerender({ metric: 'daily_ridership_wan', selectedCity: 'beijing' });
    });
    expect(h.result.current.state.mode).toBe('transitioning');
    expect(h.result.current.state.selectedCity).toBe('beijing');
    act(() => {
      h.result.current.dispatch({ type: 'TRANSITION_END' });
    });
    expect(h.result.current.state.mode).toBe('focused');
    act(() => {
      h.rerender({ metric: 'daily_ridership_wan', selectedCity: null });
    });
    expect(h.result.current.state.mode).toBe('transitioning');
    act(() => {
      h.result.current.dispatch({ type: 'TRANSITION_END' });
    });
    expect(h.result.current.state.mode).toBe('overview');
  });

  it('初始 selectedCity（URL 直达）→ 初始即 focused', () => {
    const h = setup({ selectedCity: 'shanghai' });
    expect(h.result.current.state.mode).toBe('focused');
  });

  it('hover：进出生效且派生节点视觉更新；旋转施加暂停', async () => {
    vi.useFakeTimers();
    try {
      const h = setup();
      const plainSize = h.result.current.nodes.find((n) => n.city === 'beijing')!.symbolSize;
      act(() => {
        h.result.current.hoverCity('beijing');
      });
      expect(h.result.current.state.mode).toBe('hover');
      const hoveredSize = h.result.current.nodes.find((n) => n.city === 'beijing')!.symbolSize;
      expect(hoveredSize).toBeGreaterThan(plainSize);
      // 暂停立即生效（0ms 计时器）
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(h.result.current.rotationApplied).toBe(false);
      act(() => {
        h.result.current.hoverCity(null);
      });
      expect(h.result.current.state.mode).toBe('overview');
      // 恢复经延迟（900ms 内不施加，过后施加）
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(h.result.current.rotationApplied).toBe(false);
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(h.result.current.rotationApplied).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('showLines 关闭 → 飞线数据为空（series 通道拿到空数组）', () => {
    const h = setup();
    expect(h.result.current.lines).toHaveLength(2); // 3 城：hub 上海 → 北京/广州
    act(() => {
      h.result.current.dispatch({ type: 'TOGGLE_LINES' });
    });
    expect(h.result.current.lines).toHaveLength(0);
  });
});
