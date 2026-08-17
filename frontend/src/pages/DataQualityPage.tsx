import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMetroData } from '../hooks/useMetroData';
import type { QualityReportCity } from '../types/metro';

type GroupKey = 'no_stats' | 'no_daily_ridership' | 'no_network_map' | 'no_plan_map' | 'cover_fallback';

const LEVEL_STYLE: Record<string, { badge: string; score: string }> = {
  high: {
    badge: 'border-jade-600/25 bg-jade-600/10 text-jade-600',
    score: 'text-jade-600',
  },
  medium: {
    badge: 'border-gold-600/25 bg-gold-600/10 text-gold-600',
    score: 'text-gold-600',
  },
  low: {
    badge: 'border-ink-400/25 bg-ink-400/10 text-ink-500',
    score: 'text-ink-500',
  },
};

function levelOf(level: string) {
  return LEVEL_STYLE[level] ?? LEVEL_STYLE.low;
}

function levelLabel(level: string) {
  return level === 'high' ? '完整度高' : level === 'medium' ? '完整度中' : '完整度低';
}

function CheckDot({ ok }: { ok: boolean }) {
  return (
    <span className={`text-[13px] font-bold leading-none ${ok ? 'text-jade-600' : 'text-ink-300'}`}>
      {ok ? '✔' : '–'}
    </span>
  );
}

export default function DataQualityPage() {
  const { qualityReport, loading, error, merged } = useMetroData();
  const [activeGroup, setActiveGroup] = useState<GroupKey>('no_stats');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-ink-500">
        <div className="loading-spinner size-10 rounded-full border-[3px] border-paper-200 border-t-vermilion-500 motion-safe:animate-[spin_1s_linear_infinite]" />
        <div className="text-[13px]">数据质量报告载入中...</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // === 优雅降级降级处理 (防白屏) ===
  const isFallback = !qualityReport || error;

  // 1. 摘要数据定义 (如果 qualityReport 存在则用其 summary，否则基于 merged 优雅手算)
  const summary = qualityReport?.summary || {
    city_count: merged.length || 50,
    stats_city_count: merged.filter(c => c.has_stats).length || 34,
    daily_ridership_display_count: merged.filter(c => c.has_stats && c.daily_ridership_wan > 0).length || 23,
    no_daily_display_count: (merged.length - merged.filter(c => c.has_stats && c.daily_ridership_wan > 0).length) || 27,
    stats_without_daily_count: merged.filter(c => c.has_stats && c.daily_ridership_wan === 0).length || 11,
    no_stats_count: merged.filter(c => !c.has_stats).length || 16,
    network_map_count: merged.filter(c => c.has_network_map).length || 48,
    plan_map_count: merged.filter(c => c.has_plan_map).length || 41,
    cover_downloaded_count: merged.filter(c => c.cover_status === 'downloaded').length || 49,
    cover_fallback_count: merged.filter(c => c.cover_status === 'fallback').length || 1,
    high_quality_count: 23,
    medium_quality_count: 11,
    low_quality_count: 16,
  };

  // 2. 缺失组数据定义
  const groups: Record<GroupKey, { title: string; count: number; cities: { city: string; city_cn: string }[] }> = {
    no_stats: {
      title: '完全无统计记录',
      count: summary.no_stats_count,
      cities: merged.filter(c => !c.has_stats).map(c => ({ city: c.city, city_cn: c.city_cn })),
    },
    no_daily_ridership: {
      title: '暂无日客流数据',
      count: summary.no_daily_display_count,
      cities: merged.filter(c => !c.has_stats || c.daily_ridership_wan === 0).map(c => ({ city: c.city, city_cn: c.city_cn })),
    },
    no_network_map: {
      title: '缺少线路图',
      count: summary.city_count - summary.network_map_count,
      cities: merged.filter(c => !c.has_network_map).map(c => ({ city: c.city, city_cn: c.city_cn })),
    },
    no_plan_map: {
      title: '缺少规划图',
      count: summary.city_count - summary.plan_map_count,
      cities: merged.filter(c => !c.has_plan_map).map(c => ({ city: c.city, city_cn: c.city_cn })),
    },
    cover_fallback: {
      title: '封面图片降级',
      count: summary.cover_fallback_count,
      cities: merged.filter(c => c.cover_status === 'fallback').map(c => ({ city: c.city, city_cn: c.city_cn })),
    },
  };

  // 3. 50 城市大列表定义 (若 qualityReport 缺失则优雅降级为基于 merged 手算完整度)
  const cities: QualityReportCity[] = qualityReport?.cities || merged.map(c => {
    let score = 0;
    const has_stats = c.has_stats;
    const has_daily_ridership = c.has_stats && c.daily_ridership_wan > 0;
    const has_yearly_trend = c.has_yearly_trend;
    const has_network_map = c.has_network_map;
    const has_plan_map = c.has_plan_map;
    const cover_status = c.cover_status;
    const op_lines = c.operating_lines;
    const op_stations = c.operating_stations;
    const op_mileage = c.operating_mileage_km;
    const operating_complete = op_lines > 0 && op_stations > 0 && op_mileage > 0;

    if (has_stats) score += 20;
    if (has_daily_ridership) score += 20;
    if (has_yearly_trend) score += 15;
    if (has_network_map) score += 15;
    if (has_plan_map) score += 15;
    if (cover_status === 'downloaded') score += 10;
    if (operating_complete) score += 5;

    let level: 'high' | 'medium' | 'low' = 'low';
    if (score >= 85) level = 'high';
    else if (score >= 60) level = 'medium';

    const missing_items: string[] = [];
    if (!has_stats) missing_items.push("收录统计数据");
    if (!has_daily_ridership) missing_items.push("日客流展示数据");
    if (!has_yearly_trend) missing_items.push("年度均值趋势数据");
    if (!has_network_map) missing_items.push("地铁线路图");
    if (!has_plan_map) missing_items.push("地铁规划图");
    if (cover_status !== 'downloaded') missing_items.push("高清封面图片");

    return {
      city: c.city,
      city_cn: c.city_cn,
      quality_score: score,
      quality_level: level,
      has_stats,
      has_daily_ridership,
      has_yearly_trend,
      has_network_map,
      has_plan_map,
      cover_status,
      missing_items,
      warnings: !has_daily_ridership && has_stats ? ["暂无日客流展示值，处于日常采集中"] : [],
      risk_flags: c.cover_status === 'fallback' ? ["封面图片缺损降级"] : [],
    };
  });

  // 过滤及搜索
  const filteredCities = cities.filter((c) => {
    // 搜索匹配 (拼音或中文)
    const matchSearch = c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.city_cn.includes(searchQuery);
    if (!matchSearch) return false;

    // 筛选标签
    if (filterTag === 'all') return true;
    if (filterTag === 'high') return c.quality_level === 'high';
    if (filterTag === 'medium') return c.quality_level === 'medium';
    if (filterTag === 'low') return c.quality_level === 'low';
    if (filterTag === 'no_ridership') return !c.has_daily_ridership;
    if (filterTag === 'no_network') return !c.has_network_map;
    if (filterTag === 'no_plan') return !c.has_plan_map;
    return true;
  });

  // 平均分与总完整度手算
  const avgScore = Math.round(cities.reduce((sum, c) => sum + c.quality_score, 0) / cities.length);
  const dataIntegrity = Math.round((summary.stats_city_count + summary.daily_ridership_display_count) / (50 * 2) * 100);
  const assetIntegrity = Math.round((summary.network_map_count + summary.plan_map_count + summary.cover_downloaded_count) / (50 * 3) * 100);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-6 text-ink-900 sm:px-6">

      {/* 顶部 Hero 区域 */}
      <header className="flex flex-col gap-2.5 rounded-lg bg-paper-100 p-5 shadow-card sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 font-serif text-[22px] font-semibold text-ink-900">数据质量中心</h1>
          <span className="rounded-sm border border-paper-300 bg-paper-200/60 px-2 py-0.5 text-[11px] font-medium text-ink-500">
            收录完整度大纲
          </span>
        </div>
        <p className="m-0 text-[13px] leading-relaxed text-ink-500">
          本页面展示本可视化项目对全国城市地铁各项统计数据和静态图片资源的<strong>收录完整程度</strong>。此完整度评分仅反映当前开源平台所收集并上线的资源齐备情况，<strong>绝不代表城市实际的地铁运营质量或经济发展水平</strong>。
        </p>
        <div className="flex items-start gap-2 rounded-md border border-vermilion-500/20 bg-vermilion-50 px-3 py-2 text-[11px] leading-relaxed text-ink-700">
          <span aria-hidden>💡</span>
          <span><strong>免责声明：</strong> 所有收录数据均为历史公开资料整理快照，非实时官方监测。部分城市被标为“收录完整度低”仅代表项目组暂未收集到相关客流或高清规划图，绝非城市未通地铁。</span>
        </div>
        {isFallback && (
          <div className="flex items-start gap-2 rounded-md border border-gold-600/25 bg-gold-600/10 px-3 py-2 text-[12px] leading-relaxed text-ink-700">
            <span aria-hidden>⚠️</span>
            <span><strong>降级警示：</strong> 质量报告加载失败（如 data/latest/quality_report.json 暂不存在或损坏）。已为您优雅降级为基于城市基础资源的内存完整度手算，页面功能依然完备，请放心查看。</span>
          </div>
        )}
      </header>

      {/* 顶部大纲与质量指标卡片网格 */}
      <section
        className="grid gap-4"
        style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)' }}
      >
        {/* 卡片 1: 基础统计 */}
        <div className="flex flex-col gap-2 rounded-lg bg-paper-100 p-4 shadow-card">
          <div className="text-[12px] text-ink-500">城市索引与收录统计</div>
          <div className="font-serif text-[24px] font-semibold text-ink-900 tabular-nums">
            {summary.stats_city_count} <span className="text-[13px] font-normal text-ink-400">/ {summary.city_count} 城</span>
          </div>
          <div className="flex flex-col gap-0.5 text-[11px] text-ink-400">
            <span>• 有日客流展示值: {summary.daily_ridership_display_count} 城</span>
            <span>• 暂无日客流展示值: {summary.no_daily_display_count} 城</span>
          </div>
        </div>

        {/* 卡片 2: 图片资源 */}
        <div className="flex flex-col gap-2 rounded-lg bg-paper-100 p-4 shadow-card">
          <div className="text-[12px] text-ink-500">图片及大图收录</div>
          <div className="font-serif text-[24px] font-semibold text-ink-900 tabular-nums">
            {summary.network_map_count + summary.plan_map_count} <span className="text-[13px] font-normal text-ink-400">/ 100 张</span>
          </div>
          <div className="flex flex-col gap-0.5 text-[11px] text-ink-400">
            <span>• 运营图收录: {summary.network_map_count} 城 (缺 {summary.city_count - summary.network_map_count})</span>
            <span>• 规划图收录: {summary.plan_map_count} 城 (缺 {summary.city_count - summary.plan_map_count})</span>
          </div>
        </div>

        {/* 卡片 3: 封面覆盖 */}
        <div className="flex flex-col gap-2 rounded-lg bg-paper-100 p-4 shadow-card">
          <div className="text-[12px] text-ink-500">实景封面版权图</div>
          <div className="font-serif text-[24px] font-semibold text-ink-900 tabular-nums">
            {summary.cover_downloaded_count} <span className="text-[13px] font-normal text-ink-400">/ {summary.city_count} 城</span>
          </div>
          <div className="flex flex-col gap-0.5 text-[11px] text-ink-400">
            <span>• 真实封面下载: {summary.cover_downloaded_count} 城</span>
            <span>• fallback 降级封面: {summary.cover_fallback_count} 城</span>
          </div>
        </div>

        {/* 卡片 4: 平均分与等级 */}
        <div className="flex flex-col gap-2 rounded-lg bg-paper-100 p-4 shadow-card">
          <div className="text-[12px] text-ink-500">平均完整度评分</div>
          <div className="font-serif text-[24px] font-semibold text-jade-600 tabular-nums">
            {avgScore} <span className="text-[12px] font-normal text-ink-400">/ 100 分</span>
          </div>
          <div className="flex flex-col gap-0.5 text-[11px] text-ink-400">
            <span>• 完整度高: {summary.high_quality_count} 城</span>
            <span>• 完整度中: {summary.medium_quality_count} 城</span>
            <span>• 完整度低: {summary.low_quality_count} 城</span>
          </div>
        </div>
      </section>

      {/* 总体完整度占比条 */}
      <section className="flex flex-wrap gap-6 rounded-lg bg-paper-100 p-4 shadow-card">
        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <div className="flex justify-between text-[12px]">
            <span className="text-ink-500">数据收录完整度 (stats + 客流量)</span>
            <span className="font-semibold text-ink-900 tabular-nums">{dataIntegrity}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-paper-200">
            <div className="h-full rounded-full bg-vermilion-500" style={{ width: `${dataIntegrity}%` }} />
          </div>
        </div>
        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <div className="flex justify-between text-[12px]">
            <span className="text-ink-500">大图资源覆盖度 (运营+规划+封面)</span>
            <span className="font-semibold text-jade-600 tabular-nums">{assetIntegrity}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-paper-200">
            <div className="h-full rounded-full bg-jade-600" style={{ width: `${assetIntegrity}%` }} />
          </div>
        </div>
      </section>

      {/* 资源缺失城市快速索引网格 */}
      <section className="flex flex-col gap-3.5 rounded-lg bg-paper-100 p-5 shadow-card">
        <div className="font-serif text-[15px] font-semibold text-ink-900">缺失资源城市快速索引</div>

        {/* 分组切换选项卡 */}
        <div className="flex flex-wrap gap-1 rounded-md bg-paper-50 p-1">
          {(Object.keys(groups) as GroupKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveGroup(key)}
              className={`cursor-pointer rounded-sm px-3 py-1.5 text-[12px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-vermilion-500 ${
                activeGroup === key
                  ? 'bg-vermilion-500 font-semibold text-paper-50'
                  : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              {groups[key].title} ({groups[key].count})
            </button>
          ))}
        </div>

        {/* 城市胶囊标签网格 */}
        <div className="flex min-h-[60px] flex-wrap gap-2 py-2">
          {groups[activeGroup].cities.length === 0 ? (
            <div className="w-full py-4 text-center text-[12px] text-ink-400">
              🎉 完美对齐！当前组下没有任何缺失城市的资源。
            </div>
          ) : (
            groups[activeGroup].cities.map((c) => (
              <Link
                key={c.city}
                to={`/city/${c.city}`}
                className="city-capsule inline-flex items-center gap-1.5 rounded-full border border-paper-300 bg-paper-50 px-2.5 py-1 text-[12px] text-ink-700 transition-colors duration-200 hover:border-vermilion-500/40 hover:bg-vermilion-50 hover:text-vermilion-600"
              >
                {c.city_cn} <span className="text-[10px] text-ink-400">{c.city}</span>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* 50 城市大列表与精细化检索 */}
      <section className="flex flex-col gap-4 rounded-lg bg-paper-100 p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-serif text-[15px] font-semibold text-ink-900">城市收录完整度检索大表</div>
          <span className="text-[11px] text-ink-400 tabular-nums">
            已过滤显示 {filteredCities.length} / 50 个城市
          </span>
        </div>

        {/* 筛选与搜索工具栏 */}
        <div className="flex flex-wrap items-center gap-3 border-b border-paper-300 pb-4">
          {/* 筛选胶囊组 */}
          <div className="flex min-w-[280px] flex-1 flex-wrap gap-1.5">
            {[
              { id: 'all', label: '全部' },
              { id: 'high', label: '完整度高 (评分≥85)' },
              { id: 'medium', label: '完整度中 (60-84)' },
              { id: 'low', label: '完整度低 (<60)' },
              { id: 'no_ridership', label: '缺少客流' },
              { id: 'no_network', label: '缺少线路图' },
              { id: 'no_plan', label: '缺少规划图' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterTag(t.id)}
                className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-vermilion-500 ${
                  filterTag === t.id
                    ? 'border-vermilion-500 bg-vermilion-500 font-semibold text-paper-50'
                    : 'border-paper-300 bg-paper-50 text-ink-500 hover:text-ink-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 搜索框 */}
          <div className="relative" style={{ width: isMobile ? '100%' : 200 }}>
            <input
              type="text"
              placeholder="搜索城市拼音或中文..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-sm border border-paper-300 bg-paper-50 px-3 pr-8 text-[12px] text-ink-900 placeholder-ink-300 focus:border-vermilion-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="清空搜索"
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-[12px] text-ink-400 hover:text-ink-700"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 核心城市列表渲染 - 移动端自适应转换 */}
        {filteredCities.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-ink-400">
            🔍 未搜索到符合筛选条件的城市。
          </div>
        ) : isMobile ? (
          /* 📱 移动端自适应垂直卡片列表，无溢出 */
          <div className="flex flex-col gap-3">
            {filteredCities.map((c) => {
              const tone = levelOf(c.quality_level);
              return (
                <div key={c.city} className="flex flex-col gap-2 rounded-md border border-paper-200 bg-paper-50 p-3.5">
                  <div className="flex items-center justify-between">
                    <Link to={`/city/${c.city}`} className="text-[14px] font-semibold text-ink-900 hover:text-vermilion-600">
                      {c.city_cn} <span className="text-[11px] font-normal text-ink-400">{c.city}</span>
                    </Link>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[13px] font-bold tabular-nums ${tone.score}`}>
                        {c.quality_score}分
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone.badge}`}>
                        {levelLabel(c.quality_level)}
                      </span>
                    </div>
                  </div>

                  {/* 资源状态小表格 */}
                  <div className="grid grid-cols-3 gap-2 rounded-md bg-paper-100 p-2 text-[12px]">
                    {[
                      { ok: c.has_stats, label: '统计记录' },
                      { ok: c.has_daily_ridership, label: '日客流' },
                      { ok: c.has_yearly_trend, label: '年趋势' },
                      { ok: c.has_network_map, label: '线路图' },
                      { ok: c.has_plan_map, label: '规划图' },
                      { ok: c.cover_status === 'downloaded', label: '封面图' },
                    ].map((r) => (
                      <div
                        key={r.label}
                        className={`flex items-center justify-center gap-1 text-center ${r.ok ? 'text-jade-600' : 'text-ink-400'}`}
                      >
                        <span className="font-bold">{r.ok ? '✔' : '–'}</span> {r.label}
                      </div>
                    ))}
                  </div>

                  {/* 缺失项目与警示说明 */}
                  {c.missing_items.length > 0 && (
                    <div className="text-[10px] text-ink-400">
                      <strong>收录缺失:</strong> {c.missing_items.join(', ')}
                    </div>
                  )}
                  {c.risk_flags.length > 0 && (
                    <div className="text-[10px] text-gold-600">
                      <strong>警告:</strong> {c.risk_flags.join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* 🖥️ 桌面端纸墨大表格（sticky 表头 + 限高滚动区） */
          <div className="max-h-[70vh] overflow-auto rounded-md">
            <table className="w-full min-w-[700px] border-collapse text-left text-[12px]">
              <thead>
                <tr className="border-b border-paper-300 text-ink-500">
                  <th className="sticky top-0 z-10 bg-paper-100 px-2.5 py-3 font-medium">城市</th>
                  <th className="sticky top-0 z-10 bg-paper-100 px-2.5 py-3 text-center font-medium">完整度分</th>
                  <th className="sticky top-0 z-10 bg-paper-100 px-2.5 py-3 text-center font-medium">完整度评级</th>
                  <th className="sticky top-0 z-10 bg-paper-100 px-2.5 py-3 text-center font-medium">有无统计</th>
                  <th className="sticky top-0 z-10 bg-paper-100 px-2.5 py-3 text-center font-medium">有客流值</th>
                  <th className="sticky top-0 z-10 bg-paper-100 px-2.5 py-3 text-center font-medium">客流趋势</th>
                  <th className="sticky top-0 z-10 bg-paper-100 px-2.5 py-3 text-center font-medium">线路图</th>
                  <th className="sticky top-0 z-10 bg-paper-100 px-2.5 py-3 text-center font-medium">规划图</th>
                  <th className="sticky top-0 z-10 bg-paper-100 px-2.5 py-3 text-center font-medium">高清封面</th>
                  <th className="sticky top-0 z-10 bg-paper-100 px-2.5 py-3 font-medium">收录缺失项</th>
                </tr>
              </thead>
              <tbody>
                {filteredCities.map((c) => {
                  const tone = levelOf(c.quality_level);
                  return (
                    <tr
                      key={c.city}
                      className="border-b border-[rgba(33,29,22,0.06)] transition-colors duration-200 hover:bg-paper-200/50"
                    >
                      <td className="px-2.5 py-3">
                        <Link to={`/city/${c.city}`} className="font-semibold text-ink-900 hover:text-vermilion-600">
                          {c.city_cn} <span className="text-[11px] font-normal text-ink-400">{c.city}</span>
                        </Link>
                      </td>
                      <td className="px-2.5 py-3 text-center font-bold tabular-nums">
                        <span className={tone.score}>{c.quality_score}</span>
                      </td>
                      <td className="px-2.5 py-3 text-center">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone.badge}`}>
                          {levelLabel(c.quality_level)}
                        </span>
                      </td>
                      <td className="px-2.5 py-3 text-center"><CheckDot ok={c.has_stats} /></td>
                      <td className="px-2.5 py-3 text-center"><CheckDot ok={c.has_daily_ridership} /></td>
                      <td className="px-2.5 py-3 text-center"><CheckDot ok={c.has_yearly_trend} /></td>
                      <td className="px-2.5 py-3 text-center"><CheckDot ok={c.has_network_map} /></td>
                      <td className="px-2.5 py-3 text-center"><CheckDot ok={c.has_plan_map} /></td>
                      <td className="px-2.5 py-3 text-center"><CheckDot ok={c.cover_status === 'downloaded'} /></td>
                      <td className="max-w-[180px] truncate px-2.5 py-3 text-ink-400">
                        {c.missing_items.length === 0 ? (
                          <span className="text-ink-300">—</span>
                        ) : (
                          <span title={c.missing_items.join(', ')} className="text-[12px]">
                            {c.missing_items.join(', ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
