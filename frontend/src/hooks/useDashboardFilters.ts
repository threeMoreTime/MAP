import { useState, useMemo } from 'react';
import type { MetricKey, CityFilterTag } from '../types/metro';
import type { MergedCity } from './useMetroData';
import { METRIC_LABELS } from '../types/metro';

export function hasValidDailyRidership(d: MergedCity): boolean {
  return d.daily_ridership_wan > 0;
}

export function getMetricValue(d: MergedCity, metric: MetricKey): number | null {
  if (metric === 'daily_ridership_wan') {
    return hasValidDailyRidership(d) ? d.daily_ridership_wan : null;
  }
  return (d[metric] as number) || 0;
}

export function isMetricValid(d: MergedCity, metric: MetricKey): boolean {
  if (metric === 'daily_ridership_wan') return hasValidDailyRidership(d);
  if (metric === 'ridership_intensity') return d.ridership_intensity > 0;
  return d.operating_stations > 0;
}

export function formatMetricValue(d: MergedCity, metric: MetricKey): string {
  const meta = METRIC_LABELS[metric];
  const value = getMetricValue(d, metric);
  if (value == null) return '暂无数据';
  return Number(value).toFixed(meta.decimals) + (meta.unit ? ' ' + meta.unit : '');
}

export function formatDaily(d: MergedCity): string {
  return hasValidDailyRidership(d) ? d.daily_ridership_wan.toFixed(1) + ' 万' : '暂无数据';
}

function applyCityFilter(cities: MergedCity[], tag: CityFilterTag): MergedCity[] {
  switch (tag) {
    case 'hasRidership':
      return cities.filter((c) => c.has_stats && c.daily_ridership_wan > 0);
    case 'noRidership':
      return cities.filter((c) => !c.has_stats || c.daily_ridership_wan <= 0);
    case 'hasNetworkMap':
      return cities.filter((c) => c.has_network_map);
    case 'hasPlanMap':
      return cities.filter((c) => c.has_plan_map);
    case 'all':
    default:
      return cities;
  }
}

export function useDashboardFilters(cities: MergedCity[]) {
  const [keyword, setKeyword] = useState('');
  const [metric, setMetric] = useState<MetricKey>('daily_ridership_wan');
  const [topN, setTopN] = useState(10);
  const [cityFilter, setCityFilter] = useState<CityFilterTag>('all');

  const filteredCities = useMemo(() => {
    let base = cities.filter((c) => c.operating_stations > 0 || c.has_stats);
    if (keyword) {
      const kw = keyword.toLowerCase();
      base = base.filter(
        (c) => c.city_cn.includes(kw) || c.city.toLowerCase().includes(kw)
      );
    }
    return base;
  }, [cities, keyword]);

  const allFilteredCities = useMemo(() => {
    let base = cities;
    if (keyword) {
      const kw = keyword.toLowerCase();
      base = base.filter(
        (c) => c.city_cn.includes(kw) || c.city.toLowerCase().includes(kw)
      );
    }
    return applyCityFilter(base, cityFilter);
  }, [cities, keyword, cityFilter]);

  const rankedCities = useMemo(() => {
    return [...filteredCities]
      .filter((d) => isMetricValid(d, metric))
      .sort((a, b) => (getMetricValue(b, metric) ?? 0) - (getMetricValue(a, metric) ?? 0))
      .slice(0, topN > 0 ? topN : undefined);
  }, [filteredCities, metric, topN]);

  return {
    keyword,
    setKeyword,
    metric,
    setMetric,
    topN,
    setTopN,
    cityFilter,
    setCityFilter,
    filteredCities,
    allFilteredCities,
    rankedCities,
  };
}
