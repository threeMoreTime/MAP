import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMetroData, type MergedCity } from '../hooks/useMetroData';
import { useDashboardFilters, hasValidDailyRidership } from '../hooks/useDashboardFilters';
import { METRIC_LABELS } from '../types/metro';
import SectionTitle from '../components/common/SectionTitle';
import StatCard from '../components/common/StatCard';
import FilterToolbar from '../components/common/FilterToolbar';
import ChartCard from '../components/common/ChartCard';
import MetroMapChart from '../components/charts/MetroMapChart';
import RankChart from '../components/charts/RankChart';
import MileageChart from '../components/charts/MileageChart';
import TrendChart from '../components/charts/TrendChart';
import IntensityChart from '../components/charts/IntensityChart';
import CityDetailPanel from '../components/charts/CityDetailPanel';
import LastUpdatedBadge from '../components/common/LastUpdatedBadge';
import DataSnapshotCard from '../components/common/DataSnapshotCard';

function HeroSection({ cityCount, statsCount, generatedAt }: { cityCount: number; statsCount: number; generatedAt?: string }) {
  return (
    <section className="relative px-4 pb-8 pt-10 text-center sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        {[
          `${cityCount} 城市资源`,
          `${statsCount} 客流统计城市`,
        ].map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-paper-300 bg-paper-100 px-3 py-0.5 text-[11px] text-ink-500"
          >
            {tag}
          </span>
        ))}
        <LastUpdatedBadge generatedAt={generatedAt} />
      </div>
      <h1 className="font-serif text-[26px] font-semibold leading-snug text-ink-900 sm:text-[30px]">
        全国城市地铁客流可视化平台
      </h1>
      <p className="mx-auto mt-2.5 max-w-[600px] text-[13px] leading-[1.8] text-ink-700">
        覆盖全国 {cityCount} 个城市地铁线路资源，{statsCount} 个城市客流统计数据
        <br />
        <span className="text-[11px] text-ink-400">
          数据来源：MetroDB.org · 声明：非官方实时发布，所有数据均为公开数据快照与整理汇总，仅供参考学习
        </span>
      </p>
    </section>
  );
}

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
  const { merged, manifest, loading, error } = useMetroData();
  const { keyword, setKeyword, metric, setMetric, topN, setTopN, filteredCities } = useDashboardFilters(merged);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCityName = searchParams.get('city');

  const handleCitySelect = useCallback((city: string) => {
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

  if (loading) return <div className="state-message state-message--loading">加载数据中...</div>;
  if (error) return <div className="state-message state-message--error">加载失败：{error}</div>;

  const statsCount = merged.filter((c) => c.has_stats).length;
  const noDataCount = filteredCities.filter((d) => !hasValidDailyRidership(d)).length;
  const ml = METRIC_LABELS[metric];
  const trendCount = Math.min(8, filteredCities.filter(hasValidDailyRidership).length);

  return (
    <>
      <HeroSection cityCount={merged.length} statsCount={statsCount} generatedAt={manifest?.generated_at} />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-8 sm:px-6">
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

        {/* Row 1: Map + Detail Panel */}
        <div className="mb-4 flex flex-col gap-4 lg:flex-row">
          <ChartCard title={`全国城市散点地图 — ${ml.name}`} style={{ flex: '3 1 0%' }}>
            <div className="chart-container h-[490px] w-full">
              <MetroMapChart
                data={filteredCities}
                metric={metric}
                selectedCity={selectedCityName}
                onCitySelect={handleCitySelect}
                keyword={keyword}
              />
            </div>
          </ChartCard>
          <ChartCard title="城市详情" style={{ flex: '2 1 0%' }}>
            <div className="chart-container h-[490px] w-full overflow-y-auto">
              <CityDetailPanel city={selectedCity} />
            </div>
          </ChartCard>
        </div>

        {/* Row 2: Rank + Mileage */}
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

        {/* Row 3: Trend + Intensity */}
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
