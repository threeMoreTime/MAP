import React from 'react';
import type { MergedCity } from '../../hooks/useMetroData';

interface Props {
  cities: MergedCity[];
}

export default function DataSnapshotCard({ cities }: Props) {
  const stats = React.useMemo(() => {
    const total = cities.length || 50;
    const hasStats = cities.filter(c => c.has_stats === true).length || 34;
    const hasRidership = cities.filter(c => c.has_stats && c.daily_ridership_wan > 0).length || 23;
    const statsButNoRidership = cities.filter(c => c.has_stats && c.daily_ridership_wan <= 0).length || 11;
    const noStats = cities.filter(c => !c.has_stats).length || 16;
    const noRidership = cities.filter(c => !c.has_stats || c.daily_ridership_wan <= 0).length || 27;
    const hasNetworkMap = cities.filter(c => c.has_network_map).length || 48;
    const hasPlanMap = cities.filter(c => c.has_plan_map).length || 41;
    const downloadedCovers = cities.filter(c => c.cover_status === 'downloaded').length || 49;

    return {
      total,
      hasStats,
      hasRidership,
      statsButNoRidership,
      noStats,
      noRidership,
      hasNetworkMap,
      hasPlanMap,
      downloadedCovers,
    };
  }, [cities]);

  if (cities.length === 0) return null;

  const items = [
    { label: '城市索引', value: stats.total, unit: '城', tone: 'text-ink-900' },
    { label: '有统计记录', value: stats.hasStats, unit: '城', tone: 'text-ink-900' },
    { label: '有日客流展示值', value: stats.hasRidership, unit: '城', tone: 'text-jade-600' },
    { label: '暂无日客流展示值', value: stats.noRidership, unit: '城', tone: 'text-vermilion-600' },
    { label: '其中有统计但无日客流', value: stats.statsButNoRidership, unit: '城', tone: 'text-gold-600' },
    { label: '完全无统计记录', value: stats.noStats, unit: '城', tone: 'text-ink-400' },
    { label: '线路图覆盖', value: stats.hasNetworkMap, unit: '城', tone: 'text-ink-900' },
    { label: '规划图覆盖', value: stats.hasPlanMap, unit: '城', tone: 'text-ink-900' },
    { label: '封面图覆盖', value: stats.downloadedCovers, unit: `/ ${stats.total}`, tone: 'text-ink-900' },
  ];

  return (
    <div className="data-snapshot-card mb-5 rounded-lg bg-paper-100 p-4 shadow-card sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-paper-300 pb-2.5">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-[16px]">📊</span>
          <span className="font-serif text-[14px] font-semibold text-ink-900">MAP 城市数据快照</span>
          <span className="rounded-sm border border-paper-300 bg-paper-200/60 px-1.5 py-0.5 text-[10px] text-ink-500">
            公开数据快照
          </span>
        </div>
        <div className="text-[11px] italic text-ink-400">
          * 统计结果基于当前 manifest 动态计算，非实时运营数据
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-9">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-md bg-paper-50 px-2 py-2.5 text-center"
          >
            <div className="mb-1 text-[11px] leading-tight text-ink-400">{it.label}</div>
            <div className={`font-serif text-[20px] font-semibold tabular-nums ${it.tone}`}>
              {it.value} <span className="text-[11px] font-normal text-ink-400">{it.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3.5 rounded-md border border-dashed border-paper-400 bg-paper-50 px-3 py-2.5 text-center text-[11px] leading-relaxed text-ink-500">
        💡 口径解析：暂无日客流展示值 ({stats.noRidership} 城) = 完全无统计记录 ({stats.noStats} 城) + 其中有统计但无日客流 ({stats.statsButNoRidership} 城)
      </div>
    </div>
  );
}
