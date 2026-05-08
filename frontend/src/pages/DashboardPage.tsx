import { useMemo, useState, useCallback } from 'react';
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

function HeroSection({ date, cityCount, statsCount }: { date: string; cityCount: number; statsCount: number }) {
  return (
    <section style={{
      textAlign: 'center', padding: '48px 24px 36px',
      background: 'linear-gradient(180deg, rgba(0,30,60,0.5) 0%, transparent 100%)',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(0,200,255,0.15), transparent)',
      }} />
      <div style={{
        display: 'inline-block', fontSize: 11, color: '#00d4ff', letterSpacing: 2,
        border: '1px solid rgba(0,200,255,0.2)', borderRadius: 20,
        padding: '4px 16px', marginBottom: 16, background: 'rgba(0,200,255,0.05)',
      }}>
        NATIONAL METRO DATA PLATFORM
      </div>
      <h1 className="gradient-text" style={{ fontSize: 32, fontWeight: 700, letterSpacing: 6, marginBottom: 12 }}>
        全国城市地铁客流可视化平台
      </h1>
      <p style={{ color: '#5a7a9a', fontSize: 14, maxWidth: 640, margin: '0 auto', lineHeight: 1.8 }}>
        覆盖全国 {cityCount} 个城市地铁线路资源，{statsCount} 个城市客流统计数据，数据可视化大屏
        <br />
        <span style={{ color: '#4a8aaa', fontSize: 12 }}>数据来源：MetroDB.org · 更新日期：{date}</span>
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
    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, padding: '18px 24px', flexWrap: 'wrap' }}>
      {cards.map((c) => (
        <StatCard key={c.label} {...c} />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { merged, manifest, loading, error } = useMetroData();
  const { keyword, setKeyword, metric, setMetric, topN, setTopN, filteredCities } = useDashboardFilters(merged);
  const [selectedCityName, setSelectedCityName] = useState<string | null>(null);

  const handleCitySelect = useCallback((city: string) => {
    setSelectedCityName(city);
  }, []);

  const selectedCity = useMemo(() => {
    if (!selectedCityName) return null;
    return merged.find((c) => c.city === selectedCityName) ?? null;
  }, [selectedCityName, merged]);

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#4a6a8a' }}>加载数据中...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: 80, color: '#ff5252' }}>加载失败：{error}</div>;

  const date = manifest?.generated_at?.split('T')[0] || '-';
  const statsCount = merged.filter((c) => c.has_stats).length;
  const noDataCount = filteredCities.filter((d) => !hasValidDailyRidership(d)).length;
  const ml = METRIC_LABELS[metric];
  const trendCount = Math.min(8, filteredCities.filter(hasValidDailyRidership).length);

  return (
    <>
      <HeroSection date={date} cityCount={merged.length} statsCount={statsCount} />

      <div className="page-container" style={{ paddingBottom: 32 }}>
        <SectionTitle icon="◎" title="数据总览" />
        <StatsRow cities={filteredCities} />
        {noDataCount > 0 && (
          <div style={{ textAlign: 'center', color: '#2a3a4a', fontSize: 11, padding: '0 32px 6px' }}>
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
        />

        {/* Row 1: Map + Detail Panel */}
        <div className="chart-map-row">
          <ChartCard title={`全国城市散点地图 — ${ml.name}`} style={{ flex: '3 1 0%' }}>
            <div className="chart-container chart-container--map">
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
            <div className="chart-container chart-container--detail">
              <CityDetailPanel city={selectedCity} />
            </div>
          </ChartCard>
        </div>

        {/* Row 2: Rank + Mileage */}
        <div className="chart-grid-2col">
          <ChartCard title={`${ml.name}排行榜（${ml.unit}）`}>
            <div className="chart-container">
              <RankChart data={filteredCities} metric={metric} topN={topN} />
            </div>
          </ChartCard>
          <ChartCard title="运营里程排行榜（km）">
            <div className="chart-container">
              <MileageChart data={filteredCities} topN={topN} />
            </div>
          </ChartCard>
        </div>

        {/* Row 3: Trend + Intensity */}
        <div className="chart-grid-2col">
          <ChartCard title={`Top ${trendCount} 城市年度客流趋势`}>
            <div className="chart-container">
              <TrendChart data={filteredCities} />
            </div>
          </ChartCard>
          <ChartCard title="客流强度对比">
            <div className="chart-container">
              <IntensityChart data={filteredCities} topN={topN} />
            </div>
          </ChartCard>
        </div>
      </div>
    </>
  );
}
