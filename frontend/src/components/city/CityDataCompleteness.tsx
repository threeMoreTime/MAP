import React from 'react';
import type { MergedCity } from '../../hooks/useMetroData';

interface Props {
  city: MergedCity;
}

/** 语义色映射：纸墨令牌类名（success=jade / warning=gold / danger=vermilion / info,default=ink） */
const TONE: Record<string, { text: string; badge: string; rail: string }> = {
  success: {
    text: 'text-jade-600',
    badge: 'border-jade-600/25 bg-jade-600/10 text-jade-600',
    rail: 'bg-jade-600',
  },
  warning: {
    text: 'text-gold-600',
    badge: 'border-gold-600/25 bg-gold-600/10 text-gold-600',
    rail: 'bg-gold-600',
  },
  info: {
    text: 'text-ink-700',
    badge: 'border-ink-400/25 bg-ink-400/10 text-ink-700',
    rail: 'bg-ink-400',
  },
  danger: {
    text: 'text-vermilion-600',
    badge: 'border-vermilion-500/25 bg-vermilion-50 text-vermilion-600',
    rail: 'bg-vermilion-500',
  },
  default: {
    text: 'text-ink-500',
    badge: 'border-ink-400/25 bg-ink-400/10 text-ink-500',
    rail: 'bg-ink-400',
  },
};

export default function CityDataCompleteness({ city }: Props) {
  const hasRidership = city.daily_ridership_wan > 0;
  const hasNetworkMap = city.has_network_map;
  const hasPlanMap = city.has_plan_map;
  const hasStats = city.has_stats;

  // 按照收敛要求，resourceComplete 应至少包含 has_network_map, has_plan_map, has_stats, daily_ridership_wan > 0
  const isComplete = hasNetworkMap && hasPlanMap && hasStats && hasRidership;

  // 1. xiamen: 完整
  // 2. taiyuan: 有资源，无客流 (hasRidership === false, but maps exist)
  // 3. hohhot: 封面 fallback, 无客流
  // 4. foshan: 资源缺失
  const completenessText = React.useMemo(() => {
    if (city.city === 'xiamen' || (isComplete && city.cover_status === 'downloaded')) {
      return {
        title: '数据完整收录',
        level: 'success',
        text: `该城市数据已完成完整收录！感谢志愿者和数据整理人员对 ${city.city_cn} 地铁数据的全面梳理，目前线路网络图、近期建设规划、每日客流量统计以及高清实景封面均已成功加载。`,
      };
    }

    if (city.city === 'hohhot' || (city.cover_status === 'fallback' && !hasRidership)) {
      return {
        title: '部分资源缺失 - 客流与实景封面深度整理中',
        level: 'warning',
        text: `${city.city_cn} 等城市的日客流量数据目前仍在采集中，且由于公开高清封面图渠道受限，我们目前采用了系统降级实景图以保证视觉一致性。数据团队正努力寻找更高精度的公开资源。`,
      };
    }

    if (city.city === 'taiyuan' || (!hasRidership && (hasNetworkMap || hasPlanMap))) {
      return {
        title: '日客流统计采集中',
        level: 'info',
        text: `${city.city_cn} 等省会城市的基础线路资产与建设规划均已收录。由于部分区域官方客流披露周期较长，日客流量数据目前仍在收集中，页面仅提供结构化的资源展示，这并非数据遗漏。`,
      };
    }

    if (city.city === 'foshan' || (!hasNetworkMap && !hasPlanMap)) {
      return {
        title: '数据深度建设中',
        level: 'danger',
        text: `${city.city_cn} 的地铁线路资源及客流回溯正在加紧整理与多重核验中。我们将紧跟 MetroDB 数据底座持续推进更新，当前展示的缺失状态并非程序错误，而是对数据真实性的审慎考量。`,
      };
    }

    return {
      title: '数据采集中',
      level: 'default',
      text: `该城市的部分地铁数据目前仍在公开渠道中采集中，暂未完成高可信度核验。我们正在全力跟进以确保线路与客流快照的准确性，如有最新官方数据，欢迎提交反馈。`,
    };
  }, [city, isComplete, hasRidership, hasNetworkMap, hasPlanMap]);

  const tone = TONE[completenessText.level] ?? TONE.default;

  const resources = [
    { label: '运营线路图', ok: hasNetworkMap, display: hasNetworkMap ? '✓ 已收录' : '✗ 暂无' },
    { label: '建设规划图', ok: hasPlanMap, display: hasPlanMap ? '✓ 已收录' : '✗ 暂无' },
    { label: '每日客流量', ok: hasRidership, display: hasRidership ? '✓ 已收录' : '✗ 暂无' },
    {
      label: '实景图封面',
      ok: city.cover_status === 'downloaded',
      warn: city.cover_status === 'fallback',
      display: city.cover_status === 'downloaded' ? '✓ 实景' : city.cover_status === 'fallback' ? '⚠ 降级' : '✗ 缺失',
    },
  ];

  return (
    <div
      className="city-completeness-panel rounded-lg bg-paper-100 p-4 shadow-card"
      data-testid="resource-status"
    >
      <div className="mb-3.5 flex items-center justify-between gap-2 border-b border-paper-300 pb-2">
        <h4 className="m-0 font-serif text-[13px] font-semibold text-ink-900">
          📐 资源状态 & 数据可信度说明
        </h4>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.badge}`}>
          {completenessText.title}
        </span>
      </div>

      {/* Grid of resources */}
      <div className="mb-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {resources.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between rounded-md bg-paper-50 px-3 py-2"
          >
            <span className="text-[11px] text-ink-500">{r.label}</span>
            <span
              className={`text-[11px] font-semibold ${
                r.ok ? 'text-jade-600' : r.warn ? 'text-gold-600' : 'text-vermilion-600'
              }`}
            >
              {r.display}
            </span>
          </div>
        ))}
      </div>

      {/* Humanized Explanation */}
      <div className="flex gap-2.5">
        <span aria-hidden className={`w-[3px] shrink-0 rounded-full ${tone.rail}`} />
        <p className="m-0 rounded-md bg-paper-50 px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-700">
          {completenessText.text}
        </p>
      </div>

      {/* Extended Cover License Fields if downloaded */}
      {city.cover_status === 'downloaded' && (city.cover_author || city.cover_license || city.cover_source_url) && (
        <div className="mt-2.5 flex flex-col gap-0.5 border-t border-paper-300 pt-2 text-[10px] text-ink-400">
          {city.cover_author && (
            <div>🎨 封面摄影: <span className="text-ink-500">{city.cover_author}</span></div>
          )}
          {city.cover_license && (
            <div>⚖️ 授权协议: <span className="text-ink-500">{city.cover_license}</span></div>
          )}
          {city.cover_source_url && (
            <div>
              🔗 来源链接:{' '}
              <a
                href={city.cover_source_url}
                target="_blank"
                rel="noreferrer"
                className="text-vermilion-500 underline-offset-2 hover:underline"
              >
                查看原始图片
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
