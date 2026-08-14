import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMetroData } from './useMetroData';
import type { MetroStats, CityAssetsIndex, Manifest } from '../types/metro';

function jsonResponse(data: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => data } as Response;
}

function makeStats(): MetroStats {
  return {
    generated_at: '2026-01-01T00:00:00Z',
    source: 'MetroDB.org',
    city_count: 1,
    no_daily_data_cities: [],
    items: [
      {
        city: 'beijing',
        city_cn: '北京',
        scrape_date: '2026-01-01',
        operating_lines: 27,
        lines_under_construction: 10,
        operating_stations: 490,
        operating_mileage_km: 836,
        daily_ridership_wan: 1086.5,
        ridership_intensity: 1.23,
        peak_ridership_wan: 1300.2,
        peak_ridership_date: '2024-04-30',
        yearly_avg_ridership: { years: [2023], values: [1000] },
      },
    ],
  };
}

function makeAssets(): CityAssetsIndex {
  return {
    generated_at: '2026-01-01T00:00:00Z',
    city_count: 3,
    items: [
      {
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
      },
      {
        city: 'wuhu',
        city_cn: '芜湖',
        dir: 'wuhu',
        has_network_map: true,
        network_map_path: 'cities/wuhu/wuhu_network.png',
        has_plan_map: true,
        plan_map_path: 'cities/wuhu/wuhu_plan.png',
        has_stats: true,
        stats_path: 'cities/wuhu/wuhu_stats.json',
        has_yearly_trend: false,
        yearly_trend_path: null,
      },
      {
        city: 'hohhot',
        city_cn: '呼和浩特',
        dir: 'hohhot',
        has_network_map: true,
        network_map_path: 'cities/hohhot/hohhot_network.png',
        has_plan_map: false,
        plan_map_path: null,
        has_stats: false,
        stats_path: null,
        has_yearly_trend: false,
        yearly_trend_path: null,
      },
    ],
  };
}

function makeManifest(): Manifest {
  return {
    generated_at: '2026-01-01T00:00:00Z',
    version: 'v1.0.0',
    stats_city_count: 1,
    asset_city_count: 3,
    network_map_count: 3,
    plan_map_count: 2,
    yearly_trend_count: 1,
    no_daily_data_count: 0,
    no_daily_data_cities: [],
    data_files: [],
  };
}

function stubFetch(routes: Record<string, () => Response>, fallback?: () => Response) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    const factory = routes[url];
    if (factory) return Promise.resolve(factory());
    if (fallback) return Promise.resolve(fallback());
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMetroData', () => {
  it('成功加载并合并 stats/assets/covers', async () => {
    stubFetch(
      {
        '/data/latest/metro_stats.json': () => jsonResponse(makeStats()),
        '/data/latest/city_assets_index.json': () => jsonResponse(makeAssets()),
        '/data/latest/manifest.json': () => jsonResponse(makeManifest()),
        '/data/latest/quality_report.json': () => jsonResponse({ schema_version: '1' }),
        '/assets/city-covers/manifest.json': () =>
          jsonResponse({
            items: [
              {
                city: 'beijing',
                city_cn: '北京',
                file: 'beijing.webp',
                status: 'downloaded',
                license: 'CC BY-SA 3.0',
                author: 'tester',
              },
            ],
          }),
      }
    );

    const { result } = renderHook(() => useMetroData());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.merged).toHaveLength(3);

    const beijing = result.current.merged.find((c) => c.city === 'beijing')!;
    expect(beijing.daily_ridership_wan).toBe(1086.5);
    expect(beijing.cover_status).toBe('downloaded');
    expect(beijing.cover_license).toBe('CC BY-SA 3.0');

    const wuhu = result.current.merged.find((c) => c.city === 'wuhu')!;
    expect(wuhu.operating_stations).toBe(0); // 无统计字段回退

    // hohhot 无封面 manifest 记录时走 fallback 特例
    const hohhot = result.current.merged.find((c) => c.city === 'hohhot')!;
    expect(hohhot.cover_status).toBe('fallback');
    expect(hohhot.cover_file).toBeNull();
  });

  it('covers 与 quality_report 失败时优雅降级为 null，不阻断主数据', async () => {
    stubFetch({
      '/data/latest/metro_stats.json': () => jsonResponse(makeStats()),
      '/data/latest/city_assets_index.json': () => jsonResponse(makeAssets()),
      '/data/latest/manifest.json': () => jsonResponse(makeManifest()),
      '/data/latest/quality_report.json': () => jsonResponse({}, false, 500),
      '/assets/city-covers/manifest.json': () => jsonResponse({}, false, 500),
    });

    const { result } = renderHook(() => useMetroData());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.coversManifest).toBeNull();
    expect(result.current.qualityReport).toBeNull();
    expect(result.current.merged).toHaveLength(3);
  });

  it('主数据加载失败时进入错误态并保留错误信息', async () => {
    stubFetch({
      '/data/latest/metro_stats.json': () => jsonResponse({}, false, 500),
      '/data/latest/city_assets_index.json': () => jsonResponse(makeAssets()),
      '/data/latest/manifest.json': () => jsonResponse(makeManifest()),
    });

    const { result } = renderHook(() => useMetroData());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain('metro_stats.json');
    expect(result.current.merged).toEqual([]);
  });
});
