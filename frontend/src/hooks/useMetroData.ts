import { useState, useEffect } from 'react';
import type { MetroStats, CityAssetsIndex, Manifest, MetroCity, CityAsset } from '../types/metro';

export interface MergedCity extends CityAsset {
  stats: MetroCity | null;
  daily_ridership_wan: number;
  ridership_intensity: number;
  operating_lines: number;
  operating_stations: number;
  operating_mileage_km: number;
  lines_under_construction: number;
  peak_ridership_wan: number;
  peak_ridership_date: string;
}

export interface MetroDataState {
  loading: boolean;
  error: string | null;
  stats: MetroCity[];
  assets: CityAsset[];
  merged: MergedCity[];
  manifest: Manifest | null;
}

function mergeData(assets: CityAsset[], stats: MetroCity[]): MergedCity[] {
  const statsMap = new Map<string, MetroCity>();
  for (const s of stats) {
    statsMap.set(s.city, s);
  }
  return assets.map((a) => {
    const s = statsMap.get(a.city) || null;
    return {
      ...a,
      stats: s,
      daily_ridership_wan: s?.daily_ridership_wan ?? 0,
      ridership_intensity: s?.ridership_intensity ?? 0,
      operating_lines: s?.operating_lines ?? 0,
      operating_stations: s?.operating_stations ?? 0,
      operating_mileage_km: s?.operating_mileage_km ?? 0,
      lines_under_construction: s?.lines_under_construction ?? 0,
      peak_ridership_wan: s?.peak_ridership_wan ?? 0,
      peak_ridership_date: s?.peak_ridership_date ?? '',
    };
  });
}

import { withBaseUrl } from '../utils/path';

async function fetchJSON<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
  return resp.json() as Promise<T>;
}

export function useMetroData(): MetroDataState {
  const [state, setState] = useState<MetroDataState>({
    loading: true,
    error: null,
    stats: [],
    assets: [],
    merged: [],
    manifest: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statsData, assetsData, manifestData] = await Promise.all([
          fetchJSON<MetroStats>(withBaseUrl('data/latest/metro_stats.json')),
          fetchJSON<CityAssetsIndex>(withBaseUrl('data/latest/city_assets_index.json')),
          fetchJSON<Manifest>(withBaseUrl('data/latest/manifest.json')),
        ]);

        if (cancelled) return;

        const merged = mergeData(assetsData.items, statsData.items);

        setState({
          loading: false,
          error: null,
          stats: statsData.items,
          assets: assetsData.items,
          merged,
          manifest: manifestData,
        });
      } catch (e) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: e instanceof Error ? e.message : 'Unknown error',
          }));
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
