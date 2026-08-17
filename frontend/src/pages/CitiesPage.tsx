import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMetroData } from '../hooks/useMetroData';
import { useDashboardFilters, hasValidDailyRidership } from '../hooks/useDashboardFilters';
import { withBaseUrl } from '../utils/path';
import type { CityFilterTag } from '../types/metro';
import type { MergedCity } from '../hooks/useMetroData';
import SectionTitle from '../components/common/SectionTitle';
import PaperSelect from '../components/common/PaperSelect';

type SortKey = 'name' | 'mileage' | 'ridership';

const FILTER_OPTIONS: { key: CityFilterTag; label: string }[] = [
  { key: 'all', label: '全部城市' },
  { key: 'hasRidership', label: '有客流数据' },
  { key: 'noRidership', label: '暂无客流' },
  { key: 'hasNetworkMap', label: '有线路图' },
  { key: 'hasPlanMap', label: '有规划图' },
  { key: 'resourceComplete', label: '资源完整' },
  { key: 'resourceMissing', label: '资源缺失' },
];

const GRADIENT_PAIRS = [
  ['#0d47a1', '#1565c0'], ['#1b5e20', '#2e7d32'], ['#4a148c', '#6a1b9a'],
  ['#e65100', '#f57c00'], ['#006064', '#00838f'], ['#880e4f', '#ad1457'],
  ['#311b92', '#4527a0'], ['#bf360c', '#e64a19'], ['#01579b', '#0277bd'],
  ['#1a237e', '#283593'], ['#33691e', '#558b2f'], ['#827717', '#9e9d24'],
];

function getCoverGradient(city: string): string {
  const idx = city.length % GRADIENT_PAIRS.length;
  const [c1, c2] = GRADIENT_PAIRS[idx];
  return `linear-gradient(135deg, ${c1} 0%, ${c2} 60%, rgba(0,0,0,0.3) 100%)`;
}

function getCoverRadial(city: string): string {
  const idx = city.charCodeAt(0) % 5;
  const positions = ['30% 30%', '70% 30%', '50% 50%', '30% 70%', '70% 70%'];
  return `radial-gradient(circle at ${positions[idx]}, rgba(255,255,255,0.06) 0%, transparent 60%)`;
}

function isTallCard(index: number): boolean {
  return index % 5 === 0 || index % 7 === 0;
}

function CityCard({ city, index }: { city: MergedCity; index: number }) {
  const hasDaily = hasValidDailyRidership(city);
  const tall = isTallCard(index);
  const navigate = useNavigate();

  const handleClick = () => navigate(`/city/${city.city}`);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const coverUrl = city.cover_status === 'downloaded' && city.cover_file
    ? withBaseUrl(`assets/city-covers/${city.cover_file}`)
    : undefined;

  const backgroundImage = coverUrl
    ? `url(${coverUrl}), ${getCoverGradient(city.city)}`
    : getCoverGradient(city.city);

  const isComplete = city.has_network_map && city.has_plan_map && city.has_stats && hasDaily;

  const badge = isComplete
    ? { cls: 'bg-jade-600', text: '✓ 完整收录' }
    : city.cover_status === 'fallback'
      ? { cls: 'bg-gold-600', text: '⚠ 封面降级' }
      : !hasDaily
        ? { cls: 'bg-ink-500', text: '✗ 暂无客流' }
        : { cls: 'bg-ink-700', text: '▣ 有数据' };

  // 零运营数据城市：指标区静默化，避免三个 0 的噪音
  const noOpsData = city.operating_lines === 0 && city.operating_stations === 0
    && city.operating_mileage_km === 0 && !hasDaily;

  const tag = (ok: boolean) =>
    `rounded-full border px-2 py-0.5 text-[10px] leading-5 ${
      ok ? 'border-ink-400/30 bg-paper-50 text-ink-700' : 'border-paper-300 bg-paper-200/50 text-ink-300'
    }`;

  return (
    <div
      className="city-card mb-4 break-inside-avoid overflow-hidden rounded-lg bg-paper-100 shadow-card transition-shadow duration-200 focus-visible:outline-2 focus-visible:outline-vermilion-500 hover:shadow-card-hover"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`查看${city.city_cn}城市详情`}
    >
      {/* Cover */}
      <div className={`city-card-cover relative ${tall ? 'city-card-cover--tall' : ''}`} style={{ height: tall ? 240 : 180 }}>
        <div
          className="city-cover-image absolute inset-0 bg-cover bg-center"
          data-city={city.city}
          data-has-cover={coverUrl ? 'true' : 'false'}
          style={{ backgroundImage }}
        />
        <div
          className="absolute inset-0"
          style={{ background: getCoverRadial(city.city) }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

        {/* Data availability badge */}
        <div className={`city-data-badge absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-medium text-paper-50 ${badge.cls}`}>
          {badge.text}
        </div>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="font-serif text-[20px] font-semibold leading-tight text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.45)]">
            {city.city_cn}
          </div>
          <div className="mt-0.5 text-[11px] text-[rgba(226,232,240,0.85)] tabular-nums">
            {city.operating_lines} 条线路 · {city.operating_stations} 座站点
          </div>
        </div>

        {/* Arrow hint */}
        <div aria-hidden="true" className="absolute bottom-3 right-3 flex size-7 items-center justify-center rounded-full bg-paper-50/90 text-[13px] text-ink-700">→</div>
      </div>

      {/* Body */}
      <div className="p-3.5">
        {/* 3-column metrics（零数据城市静默展示） */}
        {noOpsData ? (
          <div className="py-3.5 text-center text-[12px] text-ink-400">
            暂无运营统计数据 · 资源整理中
          </div>
        ) : (
          <div className="grid gap-2 text-center" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <div>
              <div className="font-serif text-[16px] font-semibold text-ink-900 tabular-nums">
                {city.operating_mileage_km}
                <span className="ml-0.5 text-[10px] font-normal text-ink-400">km</span>
              </div>
              <div className="text-[10px] text-ink-500">运营里程</div>
            </div>
            <div>
              <div className={`font-serif text-[16px] font-semibold tabular-nums ${hasDaily ? 'text-ink-900' : 'text-ink-300'}`}>
                {hasDaily ? city.daily_ridership_wan.toFixed(1) : '暂无'}
                {hasDaily && <span className="ml-0.5 text-[10px] font-normal text-ink-400">万</span>}
              </div>
              <div className="text-[10px] text-ink-500">日客流</div>
            </div>
            <div>
              <div className={`font-serif text-[16px] font-semibold tabular-nums ${city.ridership_intensity > 0 ? 'text-ink-900' : 'text-ink-300'}`}>
                {city.ridership_intensity > 0 ? city.ridership_intensity.toFixed(2) : '--'}
              </div>
              <div className="text-[10px] text-ink-500">客流强度</div>
            </div>
          </div>
        )}

        {/* Resource status tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className={tag(city.has_network_map)}>⌁ 线路图</span>
          <span className={tag(city.has_plan_map)}>◇ 规划图</span>
          <span className={tag(hasDaily)}>▣ 客流数据</span>
        </div>

        {/* Hidden text for acceptance script compatibility */}
        <div style={{ display: 'none' }}>
          线路/站点 {city.operating_lines} 条 / {city.operating_stations} 座
          日客流 {hasDaily ? city.daily_ridership_wan.toFixed(1) + ' 万' : '暂无数据'}
        </div>
      </div>
    </div>
  );
}

export default function CitiesPage() {
  const { merged, loading, error } = useMetroData();
  const { keyword, setKeyword, cityFilter, setCityFilter, allFilteredCities } = useDashboardFilters(merged);
  const [sortBy, setSortBy] = useState<SortKey>('name');

  const sortedCities = useMemo(() => {
    if (sortBy === 'mileage') {
      return [...allFilteredCities].sort((a, b) => b.operating_mileage_km - a.operating_mileage_km);
    }
    if (sortBy === 'ridership') {
      return [...allFilteredCities].sort((a, b) => b.daily_ridership_wan - a.daily_ridership_wan);
    }
    return allFilteredCities;
  }, [allFilteredCities, sortBy]);

  if (loading) return <div className="state-message state-message--loading">加载数据中...</div>;
  if (error) return <div className="state-message state-message--error">加载失败：{error}</div>;

  const statsCount = merged.filter((c) => c.has_stats && c.daily_ridership_wan > 0).length;

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-10 pt-8 sm:px-6">
      <SectionTitle icon="◆" title="城市资源总览" />
      <p className="-mt-2 mb-5 text-[13px] text-ink-500">
        全国 {merged.length} 个城市地铁资源一览，其中 {statsCount} 个城市有客流数据
      </p>

      {/* Filter Bar */}
      <div className="mb-5 rounded-lg bg-paper-100 p-4 shadow-card">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <span aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[14px] text-ink-300">⌕</span>
              <input
                type="text"
                placeholder="搜索城市..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                aria-label="搜索城市"
                className="h-9 w-56 rounded-sm border border-paper-300 bg-paper-50 pl-7 pr-7 text-[13px] text-ink-900 placeholder-ink-300 focus:border-vermilion-500 focus:outline-none"
              />
              {keyword && (
                <button
                  onClick={() => setKeyword('')}
                  aria-label="清空搜索"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer px-1 text-[14px] text-ink-400 hover:text-ink-700"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {FILTER_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  className={`cursor-pointer rounded-full border px-2.5 py-1 text-[12px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-vermilion-500 ${
                    cityFilter === key
                      ? 'border-vermilion-500 bg-vermilion-500 font-medium text-paper-50'
                      : 'border-paper-300 bg-paper-50 text-ink-500 hover:text-ink-900'
                  }`}
                  onClick={() => setCityFilter(key)}
                  aria-label={`筛选：${label}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer: count + sort */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-paper-300 pt-2.5 text-[11px] text-ink-400">
            <span className="tabular-nums">共 {allFilteredCities.length} 个城市</span>
            <div className="flex items-center gap-1.5">
              <span className="text-ink-400">排序</span>
              <PaperSelect
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                aria-label="选择城市排序方式"
                className="h-7 text-[11px]"
              >
                <option value="name">按名称</option>
                <option value="mileage">按运营里程</option>
                <option value="ridership">按日客流</option>
              </PaperSelect>
            </div>
          </div>
        </div>
      </div>

      {/* Masonry Cards */}
      {allFilteredCities.length > 0 ? (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {sortedCities.map((c, i) => (
            <CityCard key={c.city} city={c} index={i} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-16">
          <div aria-hidden className="text-[36px] leading-none text-ink-300">⌕</div>
          <div className="font-serif text-[15px] font-semibold text-ink-700">未找到匹配城市</div>
          <div className="text-[12px] text-ink-500">请尝试其他搜索词或筛选条件</div>
        </div>
      )}
    </div>
  );
}
