import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMetroData } from '../hooks/useMetroData';
import type { MergedCity } from '../hooks/useMetroData';
import CityTrendAreaChart from '../components/charts/CityTrendAreaChart';
import EmptyState from '../components/common/EmptyState';

function formatDaily(d: MergedCity): string {
  return d.daily_ridership_wan > 0 ? `${d.daily_ridership_wan.toFixed(1)}` : '暂无数据';
}

function formatIntensity(d: MergedCity): string {
  return d.ridership_intensity > 0 ? d.ridership_intensity.toFixed(2) : '--';
}

function formatPeak(d: MergedCity): string {
  return d.peak_ridership_wan > 0 ? `${d.peak_ridership_wan.toFixed(1)}` : '暂无数据';
}

function MetricCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="city-metric-card">
      <div className="city-metric-card-value">{value}{unit && <span className="city-metric-card-unit">{unit}</span>}</div>
      <div className="city-metric-card-label">{label}</div>
    </div>
  );
}

function CityAssetPreview({ city }: { city: MergedCity }) {
  const defaultTab = city.has_network_map ? 'network' : city.has_plan_map ? 'plan' : 'network';
  const [activeTab, setActiveTab] = useState<'network' | 'plan'>(defaultTab);

  const tabs = [
    { key: 'network' as const, label: '线路图', has: city.has_network_map },
    { key: 'plan' as const, label: '规划图', has: city.has_plan_map },
  ];

  const currentHas = activeTab === 'network' ? city.has_network_map : city.has_plan_map;
  const currentLabel = activeTab === 'network' ? '线路图' : '规划图';

  return (
    <div className="city-asset-preview">
      <div className="city-asset-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`city-asset-tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="city-asset-content">
        {currentHas ? (
          <div className="city-asset-placeholder">
            <div className="city-asset-placeholder-icon">{activeTab === 'network' ? '🗺' : '📐'}</div>
            <div className="city-asset-placeholder-title">高清{currentLabel}资源整理中</div>
            <div className="city-asset-placeholder-desc">
              {currentLabel}资源来源于 MetroMan 资源页面，正在整理中
            </div>
          </div>
        ) : (
          <div className="city-asset-placeholder">
            <div className="city-asset-placeholder-icon" style={{ opacity: 0.4 }}>📁</div>
            <div className="city-asset-placeholder-title">
              {currentLabel}资源正在收集整理中
            </div>
            <div className="city-asset-placeholder-desc">暂无{currentLabel}或规划图资源</div>
          </div>
        )}
      </div>
    </div>
  );
}

function CityDataNote({ city }: { city: MergedCity }) {
  const [open, setOpen] = useState(false);
  const hasValidRidership = city.daily_ridership_wan > 0;

  return (
    <div className="city-note-card">
      <button
        className="city-note-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>数据说明</span>
        <span className={`city-note-arrow${open ? ' open' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="city-note-content">
          <ul>
            <li>日客流量数据来源于公开数据页面，统计口径可能因城市与来源页面不同存在差异。</li>
            <li>客流强度 = 日客流量 / 运营里程，用于粗略比较单位里程承载客流能力。</li>
            <li>峰值客流为该城市历史最高单日客流量记录，具体口径以数据来源页面为准。</li>
          </ul>
          {!hasValidRidership && (
            <div className="city-note-warning">
              该城市暂无当日客流统计数据，页面仅展示基础运营信息和资源状态。
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { merged, loading, error } = useMetroData();

  const city = useMemo(
    () => merged.find((c) => c.city === id) ?? null,
    [merged, id],
  );

  const yearly = city?.stats?.yearly_avg_ridership;
  const yearRange = yearly && yearly.years.length > 0
    ? `${yearly.years[0]}-${yearly.years[yearly.years.length - 1]}`
    : '';

  if (loading) return <div className="state-message state-message--loading">加载数据中...</div>;
  if (error) return <div className="state-message state-message--error">加载失败：{error}</div>;

  if (!city) {
    return (
      <div className="page-container city-detail-page">
        <EmptyState icon="🔍" title="未找到城市" description={`未找到城市 "${id}" 的数据`} />
      </div>
    );
  }

  return (
    <div className="page-container city-detail-page">
      {/* Breadcrumb */}
      <div className="city-breadcrumb">
        <button className="city-back-button" onClick={() => navigate('/cities')}>
          ← 返回城市总览
        </button>
        <span className="city-breadcrumb-sep">/</span>
        <span className="city-breadcrumb-city">{city.city_cn}</span>
      </div>

      {/* Title area */}
      <div className="city-detail-header">
        <div className="city-detail-icon">🚇</div>
        <div className="city-detail-title-area">
          <h1 className="city-detail-name">{city.city_cn}</h1>
          <p className="city-detail-subtitle">
            {city.operating_lines} 条运营线路 · {city.operating_stations} 座站点 · {city.operating_mileage_km} km 运营里程
          </p>
        </div>
      </div>

      {/* 6 Stat Cards Grid */}
      <div className="city-metric-grid">
        <MetricCard label="运营线路" value={`${city.operating_lines}`} unit="条" />
        <MetricCard label="运营站点" value={`${city.operating_stations}`} unit="座" />
        <MetricCard label="运营里程" value={`${city.operating_mileage_km}`} unit="km" />
        <MetricCard label="日客流量" value={formatDaily(city)} unit={city.daily_ridership_wan > 0 ? '万人次' : undefined} />
        <MetricCard label="客流强度" value={formatIntensity(city)} />
        <MetricCard label="峰值客流" value={formatPeak(city)} unit={city.peak_ridership_wan > 0 ? '万人次' : undefined} />
      </div>

      {/* Yearly Trend Area Chart */}
      <div className="city-trend-section">
        <div className="city-trend-header">
          <h3 className="city-trend-title">年度客流趋势</h3>
          {yearRange && <span className="city-trend-range">{yearRange}</span>}
        </div>
        {yearly && yearly.years.length > 0 ? (
          <CityTrendAreaChart yearly={yearly} />
        ) : (
          <EmptyState icon="📊" title="该城市暂无客流趋势数据" description="仅展示基础运营信息" />
        )}
      </div>

      {/* Asset Preview Tabs */}
      <div className="city-section-title">
        <h3>资源预览</h3>
      </div>
      <CityAssetPreview city={city} />

      {/* Data Note Accordion */}
      <CityDataNote city={city} />
    </div>
  );
}
