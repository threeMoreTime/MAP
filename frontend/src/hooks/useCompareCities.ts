import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMetroData, type MergedCity } from './useMetroData';
import type { QualityReportCity, ComparableCity } from '../types/metro';

function toNull(hasStats: boolean, val: number): number | null {
  return hasStats && val > 0 ? val : null;
}

function buildComparableCities(
  merged: MergedCity[],
  qualityCities: QualityReportCity[] | undefined,
): ComparableCity[] {
  const qMap = new Map<string, QualityReportCity>();
  if (qualityCities) {
    for (const qc of qualityCities) qMap.set(qc.city, qc);
  }

  return merged.map((m) => {
    const qc = qMap.get(m.city);
    const hasStats = m.has_stats;

    return {
      city: m.city,
      city_cn: m.city_cn,
      hasStats,
      dailyRidershipWan: toNull(hasStats, m.daily_ridership_wan),
      operatingMileageKm: toNull(hasStats, m.operating_mileage_km),
      operatingStations: toNull(hasStats, m.operating_stations),
      operatingLines: toNull(hasStats, m.operating_lines),
      ridershipIntensity: toNull(hasStats, m.ridership_intensity),
      peakRidershipWan: toNull(hasStats, m.peak_ridership_wan),
      hasYearlyTrend: m.has_yearly_trend,
      hasNetworkMap: m.has_network_map,
      hasPlanMap: m.has_plan_map,
      coverStatus: m.cover_status,
      qualityScore: qc?.quality_score ?? null,
      qualityLevel: qc?.quality_level ?? null,
      missingItems: qc?.missing_items ?? [],
      warnings: qc?.warnings ?? [],
      riskFlags: qc?.risk_flags ?? [],
      yearlyYears: m.stats?.yearly_avg_ridership?.years ?? [],
      yearlyValues: m.stats?.yearly_avg_ridership?.values ?? [],
    };
  });
}

function pickDefaults(all: ComparableCity[]): string[] {
  const highWithRidership = all
    .filter(c => c.qualityLevel === 'high' && c.dailyRidershipWan !== null)
    .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0)
      || (b.dailyRidershipWan ?? 0) - (a.dailyRidershipWan ?? 0));

  if (highWithRidership.length >= 3) {
    return highWithRidership.slice(0, 3).map(c => c.city);
  }

  const fallback = all
    .filter(c => c.hasStats && c.dailyRidershipWan !== null)
    .sort((a, b) => (b.dailyRidershipWan ?? 0) - (a.dailyRidershipWan ?? 0));

  const picks = new Set(highWithRidership.map(c => c.city));
  for (const c of fallback) {
    if (picks.size >= 3) break;
    picks.add(c.city);
  }
  return [...picks];
}

const MAX_CITIES = 5;
const CITIES_KEY = 'cities';

export function useCompareCities() {
  const { merged, qualityReport, loading, error } = useMetroData();
  const [searchParams, setSearchParams] = useSearchParams();

  const allCities = useMemo(
    () => buildComparableCities(merged, qualityReport?.cities),
    [merged, qualityReport],
  );

  const cityMap = useMemo(() => {
    const m = new Map<string, ComparableCity>();
    for (const c of allCities) m.set(c.city, c);
    return m;
  }, [allCities]);

  const [manualSelection, setManualSelection] = useState<string[] | null>(null);

  const urlCities = searchParams.get(CITIES_KEY);

  const selectedSlugs = useMemo(() => {
    if (manualSelection !== null) return manualSelection;

    if (loading || allCities.length === 0) return [];

    if (urlCities) {
      const valid = urlCities.split(',').filter(s => cityMap.has(s));
      if (valid.length >= 2) return valid;
      const defaults = pickDefaults(allCities);
      const combined = [...new Set([...valid, ...defaults])].slice(0, MAX_CITIES);
      return combined.length >= 2 ? combined : defaults;
    }

    return pickDefaults(allCities);
  }, [manualSelection, urlCities, loading, allCities, cityMap]);

  const selectedCities = useMemo(
    () => selectedSlugs.map(s => cityMap.get(s)!).filter(Boolean),
    [selectedSlugs, cityMap],
  );

  const insufficientSelection = selectedCities.length < 2;
  const maxReached = selectedCities.length >= MAX_CITIES;

  const syncUrl = useCallback((slugs: string[]) => {
    setSearchParams(prev => {
      if (slugs.length === 0) {
        prev.delete(CITIES_KEY);
      } else {
        prev.set(CITIES_KEY, slugs.join(','));
      }
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  const addCity = useCallback((slug: string) => {
    if (selectedSlugs.includes(slug) || selectedSlugs.length >= MAX_CITIES) return;
    const next = [...selectedSlugs, slug];
    setManualSelection(next);
    syncUrl(next);
  }, [selectedSlugs, syncUrl]);

  const removeCity = useCallback((slug: string) => {
    const next = selectedSlugs.filter(s => s !== slug);
    setManualSelection(next);
    syncUrl(next);
  }, [selectedSlugs, syncUrl]);

  const setSelectedCities = useCallback((slugs: string[]) => {
    const clamped = slugs.filter(s => cityMap.has(s)).slice(0, MAX_CITIES);
    setManualSelection(clamped);
    syncUrl(clamped);
  }, [cityMap, syncUrl]);

  useEffect(() => {
    if (manualSelection === null && selectedSlugs.length > 0 && !urlCities) {
      syncUrl(selectedSlugs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return {
    allCities,
    cityMap,
    selectedCities,
    selectedSlugs,
    loading,
    error,
    insufficientSelection,
    maxReached,
    addCity,
    removeCity,
    setSelectedCities,
  };
}
