import { useState, useEffect } from 'react';
import type { MetroStats, CityAssetsIndex, Manifest, MetroCity, CityAsset, CoverManifest, CoverManifestItem, QualityReport } from '../types/metro';

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
  // 封面图元数据字段（从 city-covers manifest 中聚合而来）
  cover_file: string | null;
  cover_status: 'downloaded' | 'fallback' | 'missing' | 'unknown';
  cover_source_url?: string;
  cover_license?: string;
  cover_author?: string;
  cover_attribution?: string;
}

export interface MetroDataState {
  loading: boolean;
  error: string | null;
  stats: MetroCity[];
  assets: CityAsset[];
  merged: MergedCity[];
  manifest: Manifest | null;
  coversManifest: CoverManifest | null;
  qualityReport: QualityReport | null;
}


function mergeData(assets: CityAsset[], stats: MetroCity[], covers: CoverManifest | null): MergedCity[] {
  const statsMap = new Map<string, MetroCity>();
  for (const s of stats) {
    statsMap.set(s.city, s);
  }

  const coverItemMap = new Map<string, CoverManifestItem>();
  if (covers && covers.items) {
    for (const item of covers.items) {
      coverItemMap.set(item.city, item);
    }
  }

  return assets.map((a) => {
    const s = statsMap.get(a.city) || null;
    const coverItem = coverItemMap.get(a.city) || null;

    // 优雅降级兜底
    const cover_status = coverItem?.status || (a.city === 'hohhot' ? 'fallback' : 'downloaded');
    const cover_file = coverItem ? coverItem.file : (a.city === 'hohhot' ? null : `${a.city}.webp`);

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
      cover_file,
      cover_status,
      cover_source_url: coverItem?.source_url,
      cover_license: coverItem?.license,
      cover_author: coverItem?.author,
      cover_attribution: coverItem?.attribution,
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
    coversManifest: null,
    qualityReport: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statsData, assetsData, manifestData, coversManifestData, qualityReportData] = await Promise.all([
          fetchJSON<MetroStats>(withBaseUrl('data/latest/metro_stats.json')),
          fetchJSON<CityAssetsIndex>(withBaseUrl('data/latest/city_assets_index.json')),
          fetchJSON<Manifest>(withBaseUrl('data/latest/manifest.json')),
          fetchJSON<CoverManifest>(withBaseUrl('assets/city-covers/manifest.json')).catch(() => null),
          fetchJSON<QualityReport>(withBaseUrl('data/latest/quality_report.json')).catch(() => null),
        ]);

        if (cancelled) return;

        const merged = mergeData(assetsData.items, statsData.items, coversManifestData);

        setState({
          loading: false,
          error: null,
          stats: statsData.items,
          assets: assetsData.items,
          merged,
          manifest: manifestData,
          coversManifest: coversManifestData,
          qualityReport: qualityReportData,
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

