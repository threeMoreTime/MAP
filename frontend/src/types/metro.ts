export interface YearlyAvgRidership {
  years: number[];
  values: number[];
}

export interface MetroCity {
  city: string;
  city_cn: string;
  scrape_date: string;
  operating_lines: number;
  lines_under_construction: number;
  operating_stations: number;
  operating_mileage_km: number;
  daily_ridership_wan: number;
  ridership_intensity: number;
  peak_ridership_wan: number;
  peak_ridership_date: string;
  yearly_avg_ridership: YearlyAvgRidership;
}

export interface CityAsset {
  city: string;
  city_cn: string;
  dir: string;
  has_network_map: boolean;
  network_map_path: string | null;
  has_plan_map: boolean;
  plan_map_path: string | null;
  has_stats: boolean;
  stats_path: string | null;
  has_yearly_trend: boolean;
  yearly_trend_path: string | null;
}

export interface Manifest {
  generated_at: string;
  version: string;
  stats_city_count: number;
  asset_city_count: number;
  network_map_count: number;
  plan_map_count: number;
  yearly_trend_count: number;
  no_daily_data_count: number;
  no_daily_data_cities: string[];
  dashboard_file: string;
  data_files: string[];
}

export interface MetroStats {
  generated_at: string;
  source: string;
  city_count: number;
  no_daily_data_cities: string[];
  items: MetroCity[];
}

export interface CityAssetsIndex {
  generated_at: string;
  city_count: number;
  items: CityAsset[];
}

export type MetricKey = 'daily_ridership_wan' | 'operating_mileage_km' | 'operating_stations' | 'ridership_intensity';

export interface MetricMeta {
  name: string;
  unit: string;
  decimals: number;
}

export const METRIC_LABELS: Record<MetricKey, MetricMeta> = {
  daily_ridership_wan: { name: '日客流量', unit: '万人次', decimals: 1 },
  operating_mileage_km: { name: '运营里程', unit: 'km', decimals: 0 },
  operating_stations: { name: '运营站点', unit: '座', decimals: 0 },
  ridership_intensity: { name: '客流强度', unit: '', decimals: 2 },
};

export type CityFilterTag = 'all' | 'hasRidership' | 'noRidership' | 'hasNetworkMap' | 'hasPlanMap';
