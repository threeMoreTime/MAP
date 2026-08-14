import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useDashboardFilters,
  getMetricValue,
  isMetricValid,
  formatMetricValue,
  formatDaily,
} from './useDashboardFilters';
import type { MergedCity } from './useMetroData';

function makeCity(overrides: Partial<MergedCity> = {}): MergedCity {
  return {
    city: 'beijing',
    city_cn: '北京',
    dir: 'beijing',
    has_network_map: true,
    network_map_path: 'cities/beijing/beijing_network.png',
    has_plan_map: true,
    plan_map_path: 'cities/beijing/beijing_plan.png',
    has_stats: true,
    stats_path: 'cities/beijing/beijing_stats.json',
    has_yearly_trend: true,
    yearly_trend_path: 'cities/beijing/beijing_yearly_trend.png',
    stats: null,
    daily_ridership_wan: 1086.5,
    ridership_intensity: 1.234,
    operating_lines: 27,
    operating_stations: 490,
    operating_mileage_km: 836,
    lines_under_construction: 10,
    peak_ridership_wan: 1300.2,
    peak_ridership_date: '2024-04-30',
    cover_file: 'beijing.webp',
    cover_status: 'downloaded',
    ...overrides,
  };
}

describe('纯函数：指标取值与格式化', () => {
  it('getMetricValue 日客流无效时返回 null，其余指标回退 0', () => {
    const noDaily = makeCity({ daily_ridership_wan: 0 });
    expect(getMetricValue(noDaily, 'daily_ridership_wan')).toBeNull();
    expect(getMetricValue(noDaily, 'operating_mileage_km')).toBe(836);

    const beijing = makeCity();
    expect(getMetricValue(beijing, 'daily_ridership_wan')).toBe(1086.5);
  });

  it('isMetricValid 按指标语义判断有效性', () => {
    const zeroCity = makeCity({
      daily_ridership_wan: 0,
      ridership_intensity: 0,
      operating_stations: 0,
    });
    expect(isMetricValid(zeroCity, 'daily_ridership_wan')).toBe(false);
    expect(isMetricValid(zeroCity, 'ridership_intensity')).toBe(false);
    expect(isMetricValid(zeroCity, 'operating_stations')).toBe(false);

    const valid = makeCity();
    expect(isMetricValid(valid, 'daily_ridership_wan')).toBe(true);
    expect(isMetricValid(valid, 'ridership_intensity')).toBe(true);
  });

  it('formatMetricValue 空数据与带单位格式', () => {
    expect(formatMetricValue(makeCity({ daily_ridership_wan: 0 }), 'daily_ridership_wan')).toBe(
      '暂无数据'
    );
    expect(formatMetricValue(makeCity(), 'daily_ridership_wan')).toBe('1086.5 万人次');
    expect(formatMetricValue(makeCity(), 'ridership_intensity')).toBe('1.23');
    expect(formatMetricValue(makeCity(), 'operating_mileage_km')).toBe('836 km');
  });

  it('formatDaily 有效值与空值', () => {
    expect(formatDaily(makeCity())).toBe('1086.5 万');
    expect(formatDaily(makeCity({ daily_ridership_wan: 0 }))).toBe('暂无数据');
  });
});

describe('useDashboardFilters', () => {
  const cities: MergedCity[] = [
    makeCity(), // 北京：全量数据
    makeCity({
      city: 'wuhu',
      city_cn: '芜湖',
      has_stats: true,
      daily_ridership_wan: 0,
      ridership_intensity: 0,
      operating_stations: 0,
      operating_mileage_km: 0,
      has_yearly_trend: false,
      yearly_trend_path: null,
    }),
    makeCity({
      city: 'kaohsiung',
      city_cn: '高雄',
      has_stats: false,
      stats_path: null,
      daily_ridership_wan: 0,
      operating_stations: 40,
      has_plan_map: false,
      plan_map_path: null,
    }),
  ];

  it('filteredCities 剔除无站点且无统计的城市', () => {
    const { result } = renderHook(() => useDashboardFilters(cities));
    const names = result.current.filteredCities.map((c) => c.city);
    // 北京有站点有统计；芜湖无站点但有统计保留；高雄无统计但有站点保留
    expect(names).toEqual(['beijing', 'wuhu', 'kaohsiung']);
  });

  it('关键词同时支持中文与大小写不敏感的英文', () => {
    const { result } = renderHook(() => useDashboardFilters(cities));
    act(() => result.current.setKeyword('北京'));
    expect(result.current.filteredCities.map((c) => c.city)).toEqual(['beijing']);

    act(() => result.current.setKeyword('KAO'));
    expect(result.current.filteredCities.map((c) => c.city)).toEqual(['kaohsiung']);
  });

  it('cityFilter 资源完备口径：线网图+规划图+统计+日客流齐备', () => {
    const { result } = renderHook(() => useDashboardFilters(cities));
    act(() => result.current.setCityFilter('resourceComplete'));
    expect(result.current.allFilteredCities.map((c) => c.city)).toEqual(['beijing']);

    act(() => result.current.setCityFilter('resourceMissing'));
    expect(result.current.allFilteredCities.map((c) => c.city)).toEqual(['wuhu', 'kaohsiung']);
  });

  it('rankedCities 按指标降序并受 topN 截断', () => {
    const { result } = renderHook(() => useDashboardFilters(cities));
    // 日客流量只有北京有效
    expect(result.current.rankedCities.map((c) => c.city)).toEqual(['beijing']);

    // 切换到运营站点：高雄 40 站也参与排名
    act(() => result.current.setMetric('operating_stations'));
    expect(result.current.rankedCities.map((c) => c.city)).toEqual(['beijing', 'kaohsiung']);

    act(() => result.current.setTopN(1));
    expect(result.current.rankedCities.map((c) => c.city)).toEqual(['beijing']);
  });
});
