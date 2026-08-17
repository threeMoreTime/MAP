import { describe, expect, it } from 'vitest';
import { cityFocusPose, OVERVIEW_POSE } from './camera';
import type { RankedCity } from './types';

const city: RankedCity = {
  city: 'beijing',
  cityCn: '北京',
  lng: 116.4,
  lat: 39.9,
  value: 1000,
  rank: 1,
  raw: {} as RankedCity['raw'],
};

/** 模拟 geo3D dataToPoint：lng/lat → 内部 3D 坐标 */
const project = (lngLat: [number, number]) => [lngLat[0] - 106, 0, lngLat[1] - 36];

describe('hero3d camera 纯函数', () => {
  it('中景聚焦：center 投影到城市、distance 60-70、俯角 ≈ 40、不携带 beta', () => {
    const pose = cityFocusPose(project, city);
    expect(pose.center?.[0]).toBeCloseTo(10.4);
    expect(pose.center?.[1]).toBeCloseTo(0);
    expect(pose.center?.[2]).toBeCloseTo(3.9);
    expect(pose.distance).toBeGreaterThanOrEqual(60);
    expect(pose.distance).toBeLessThanOrEqual(70);
    expect(pose.alpha).toBe(40);
    expect(pose.beta).toBeUndefined();
  });

  it('全国总览构图保持基线参数', () => {
    expect(OVERVIEW_POSE.distance).toBe(118);
    expect(OVERVIEW_POSE.alpha).toBe(38);
    expect(OVERVIEW_POSE.center).toEqual([0, 0, 0]);
  });
});
