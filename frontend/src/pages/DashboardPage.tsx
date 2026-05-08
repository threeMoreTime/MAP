import { useMemo } from 'react';
import { useMetroData, type MergedCity } from '../hooks/useMetroData';
import { useDashboardFilters, hasValidDailyRidership } from '../hooks/useDashboardFilters';
import SectionTitle from '../components/common/SectionTitle';
import StatCard from '../components/common/StatCard';
import FilterToolbar from '../components/common/FilterToolbar';
import ChartCard from '../components/common/ChartCard';

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

function ChartPlaceholder({ label }: { label: string }) {
  return (
    <div style={{
      height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#2a4a6a', fontSize: 13, border: '1px dashed rgba(0,180,255,0.1)', borderRadius: 6,
    }}>
      {label} — Phase 4.2 迁移 ECharts
    </div>
  );
}

export default function DashboardPage() {
  const { merged, manifest, loading, error } = useMetroData();
  const { keyword, setKeyword, metric, setMetric, topN, setTopN, filteredCities, rankedCities } = useDashboardFilters(merged);

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#4a6a8a' }}>加载数据中...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: 80, color: '#ff5252' }}>加载失败：{error}</div>;

  const date = manifest?.generated_at?.split('T')[0] || '-';
  const statsCount = merged.filter((c) => c.has_stats).length;
  const noDataCount = filteredCities.filter((d) => !hasValidDailyRidership(d)).length;

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

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 16 }}>
          <ChartCard title="全国城市地铁散点地图">
            <ChartPlaceholder label="MetroMapChart" />
          </ChartCard>
          <ChartCard title="城市详情">
            <div style={{
              height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#2a3a4a', fontSize: 14,
            }}>
              点击地图上的城市查看详细指标
            </div>
          </ChartCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <ChartCard title={`${rankedCities.length} 城市日客流排行榜（万）`}>
            <ChartPlaceholder label="RankChart" />
          </ChartCard>
          <ChartCard title="运营里程排行榜（km）">
            <ChartPlaceholder label="MileageChart" />
          </ChartCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <ChartCard title={`Top ${Math.min(8, filteredCities.filter(hasValidDailyRidership).length)} 城市年度客流趋势`}>
            <ChartPlaceholder label="TrendChart" />
          </ChartCard>
          <ChartCard title="客流强度对比">
            <ChartPlaceholder label="IntensityChart" />
          </ChartCard>
        </div>
      </div>
    </>
  );
}
