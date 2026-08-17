import { describe, it, expect, vi, afterEach } from 'vitest';
import { daysSince, freshnessLevel } from './dataFreshness';

afterEach(() => {
  vi.useRealTimers();
});

function fakeToday(date: string) {
  vi.setSystemTime(new Date(date + 'T12:00:00'));
}

describe('daysSince', () => {
  it('同一天返回 0', () => {
    fakeToday('2026-08-17');
    expect(daysSince('2026-08-17')).toBe(0);
  });

  it('跨月计算天数', () => {
    fakeToday('2026-08-17');
    expect(daysSince('2026-05-08')).toBe(101);
  });

  it('兼容 ISO 时间戳前缀', () => {
    fakeToday('2026-08-17');
    expect(daysSince('2026-08-14T06:34:20Z')).toBe(3);
  });

  it('非法或缺失输入返回 null', () => {
    expect(daysSince(null)).toBeNull();
    expect(daysSince('')).toBeNull();
    expect(daysSince('not-a-date')).toBeNull();
  });
});

describe('freshnessLevel', () => {
  it('90 天内为 fresh，超过 90 天为 stale', () => {
    expect(freshnessLevel(0)).toBe('fresh');
    expect(freshnessLevel(90)).toBe('fresh');
    expect(freshnessLevel(91)).toBe('stale');
    expect(freshnessLevel(101)).toBe('stale');
  });

  it('未知天数返回 null', () => {
    expect(freshnessLevel(null)).toBeNull();
  });
});
