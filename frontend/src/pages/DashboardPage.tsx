import { useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMetroData, type MergedCity } from '../hooks/useMetroData';
import { useDashboardFilters, hasValidDailyRidership } from '../hooks/useDashboardFilters';
import { METRIC_LABELS } from '../types/metro';
import SectionTitle from '../components/common/SectionTitle';
import StatCard from '../components/common/StatCard';
import FilterToolbar from '../components/common/FilterToolbar';
import ChartCard from '../components/common/ChartCard';
import HeroMap3D from '../components/charts/HeroMap3D';
import RankChart from '../components/charts/RankChart';
import MileageChart from '../components/charts/MileageChart';
import TrendChart from '../components/charts/TrendChart';
import IntensityChart from '../components/charts/IntensityChart';
import CityDetailPanel from '../components/charts/CityDetailPanel';
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
      {/* 全屏夜墨 3D 地图 hero（进入即全屏，点击城市节点查看详情） */}
      <section className="relative h-screen min-h-[560px] w-full overflow-hidden bg-[#0b1016]">
        <div className="absolute inset-0">
          <HeroMap3D
            data={filteredCities}
            metric={metric}
            selectedCity={selectedCityName}
            onCitySelect={handleCitySelect}
          />
        </div>

        {/* 标题叠加层（不拦截地图交互） */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center px-4 pt-16 text-center sm:pt-20">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              `${merged.length} 城市资源`,
              `${statsCount} 客流统计城市`,
            ].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#2b3a4e] bg-[#0b1016]/60 px-3 py-0.5 text-[11px] text-[#8a94a3] backdrop-blur-[2px]"
              >
                {tag}
              </span>
            ))}
          </div>
          <h1 className="mt-4 font-serif text-[28px] font-semibold leading-snug text-[#e8e4d8] [text-shadow:0_2px_18px_rgba(0,0,0,0.65)] sm:text-[38px]">
            全国城市地铁客流可视化平台
          </h1>
          <p className="mt-2.5 max-w-[560px] text-[13px] leading-relaxed text-[#8a94a3]">
            覆盖全国 {merged.length} 个城市地铁线路资源 · {statsCount} 个城市客流统计数据
            <br />
            <span className="text-[11px] text-[#8a94a3]/70">
              数据来源：MetroDB.org · 公开数据快照，非官方实时发布 · 飞线为视觉示意，非实际客流
            </span>
          </p>
        </div>

        {/* 城市详情浮层（点击 3D 节点弹出） */}
        {selectedCity && (
          <div className="absolute right-4 top-1/2 z-20 max-h-[72vh] w-[min(340px,calc(100vw-2rem))] -translate-y-1/2 overflow-y-auto rounded-lg bg-paper-100 p-4 shadow-card-hover">
            <button
              onClick={() => handleCitySelect('')}
              aria-label="关闭城市详情"
              className="absolute right-2.5 top-2.5 z-10 flex size-7 cursor-pointer items-center justify-center rounded-sm border border-paper-300 bg-paper-50 text-[13px] text-ink-500 hover:bg-paper-200"
            >
              ✕
            </button>
            <CityDetailPanel city={selectedCity} />
          </div>
        )}

        {/* 下滚锚点 */}
        <button
          onClick={scrollToOverview}
          className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 cursor-pointer rounded-full border border-[#2b3a4e] bg-[#0b1016]/60 px-4 py-1.5 text-[12px] text-[#8a94a3] backdrop-blur-[2px] transition-colors duration-200 hover:border-[#d0553f]/60 hover:text-[#e8e4d8] focus-visible:outline-2 focus-visible:outline-[#d0553f]"
        >
          ↓ 查看数据总览
        </button>

        {/* 底部渐变过渡到纸面 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-paper-50" />
      </section>

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
