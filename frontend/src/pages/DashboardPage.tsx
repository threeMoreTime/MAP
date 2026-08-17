import { useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMetroData, type MergedCity } from '../hooks/useMetroData';
import { useDashboardFilters, hasValidDailyRidership } from '../hooks/useDashboardFilters';
import { METRIC_LABELS } from '../types/metro';
import SectionTitle from '../components/common/SectionTitle';
import StatCard from '../components/common/StatCard';
import FilterToolbar from '../components/common/FilterToolbar';
import ChartCard from '../components/common/ChartCard';
import DashboardHero3D from '../components/dashboard3d/DashboardHero3D';
import RankChart from '../components/charts/RankChart';
import MileageChart from '../components/charts/MileageChart';
import TrendChart from '../components/charts/TrendChart';
import IntensityChart from '../components/charts/IntensityChart';
import DataSnapshotCard from '../components/common/DataSnapshotCard';

function StatsRow({ cities }: { cities: MergedCity[] }) {
  const cards = useMemo(() => {
    const withDaily = cities.filter(hasValidDailyRidership);
    return [
      { label: '覆盖城市', value: cities.length, unit: '座', icon: '🏙' },
      { label: '运营线路', value: cities.reduce((s, d) => s + d.operating_lines, 0), unit: '条', icon: '🚇' },
      { label: '运营站点', value: cities.reduce((s, d) => s + d.operating_stations, 0), unit: '座', icon: '📍' },
      { label: '总里程', value: cities.reduce((s, d) => s + d.operating_mileage_km, 0).toFixed(0), unit: 'km', icon: '📏' },
      { label: '日总客流', value: withDaily.reduce((s, d) => s + d.daily_ridership_wan, 0).toFixed(0), unit: '万', icon: '👥' },
    ];
  }, [cities]);

  return (
    <div className="grid grid-cols-2 gap-3 py-1 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <StatCard key={c.label} {...c} />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { merged, loading, error } = useMetroData();
  const { keyword, setKeyword, metric, setMetric, topN, setTopN, filteredCities } = useDashboardFilters(merged);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCityName = searchParams.get('city');

  const handleCitySelect = useCallback((city: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (city) {
        next.set('city', city);
      } else {
        next.delete('city');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const selectedCity = useMemo(() => {
    if (!selectedCityName) return null;
    return merged.find((c) => c.city === selectedCityName) ?? null;
  }, [selectedCityName, merged]);

  const overviewRef = useRef<HTMLDivElement>(null);
  const scrollToOverview = useCallback(() => {
    overviewRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  if (loading) return <div className="state-message state-message--loading">加载数据中...</div>;
  if (error) return <div className="state-message state-message--error">加载失败：{error}</div>;

  const statsCount = merged.filter((c) => c.has_stats).length;
  const noDataCount = filteredCities.filter((d) => !hasValidDailyRidership(d)).length;
  const ml = METRIC_LABELS[metric];
  const trendCount = Math.min(8, filteredCities.filter(hasValidDailyRidership).length);

  return (
    <>
      {/* 全屏夜墨 3D Hero（场景系统：状态机 / 镜头 / hover / 排行 / controls） */}
      <DashboardHero3D
        data={filteredCities}
        metric={metric}
        onMetricChange={setMetric}
        selectedCity={selectedCityName}
        onCitySelect={handleCitySelect}
        cityDetail={selectedCity}
        citiesCount={merged.length}
        statsCount={statsCount}
        onScrollToOverview={scrollToOverview}
      />

      <div ref={overviewRef} className="mx-auto w-full max-w-[1180px] scroll-mt-2 px-4 pb-8 pt-10 sm:px-6">
        <DataSnapshotCard cities={merged} />
        <SectionTitle icon="◎" title="数据总览" />
        <StatsRow cities={filteredCities} />
        {noDataCount > 0 && (
          <div className="px-8 pb-1.5 pt-2 text-center text-[11px] text-ink-400">
            日客流统计已排除 {noDataCount} 个暂无数据城市
          </div>
        )}

        <FilterToolbar
          keyword={keyword}
          onKeywordChange={setKeyword}
          metric={metric}
          onMetricChange={setMetric}
          topN={topN}
          onTopNChange={setTopN}
          matchCount={filteredCities.length}
        />

        {/* Rank + Mileage */}
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title={`${ml.name}排行榜（${ml.unit}）`}>
            <div className="chart-container h-[340px] w-full">
              <RankChart data={filteredCities} metric={metric} topN={topN} />
            </div>
          </ChartCard>
          <ChartCard title="运营里程排行榜（km）">
            <div className="chart-container h-[340px] w-full">
              <MileageChart data={filteredCities} topN={topN} />
            </div>
          </ChartCard>
        </div>

        {/* Trend + Intensity */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title={`Top ${trendCount} 城市年度客流趋势`}>
            <div className="chart-container h-[340px] w-full">
              <TrendChart data={filteredCities} />
            </div>
          </ChartCard>
          <ChartCard title="客流强度对比">
            <div className="chart-container h-[340px] w-full">
              <IntensityChart data={filteredCities} topN={topN} />
            </div>
          </ChartCard>
        </div>
      </div>
    </>
  );
}
