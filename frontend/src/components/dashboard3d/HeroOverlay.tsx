import HeroMetricSwitcher from './HeroMetricSwitcher';
import type { MetricKey } from '../../types/metro';

interface Props {
  citiesCount: number;
  statsCount: number;
  /** manifest.stats_scrape_date（数据实际采集日；null 时优雅降级） */
  dataDate: string | null;
  metric: MetricKey;
  onMetricChange: (metric: MetricKey) => void;
  /** intro 完成后阶梯显影 */
  revealed: boolean;
  /** focused 时弱化资源 tags 与覆盖说明（opacity 过渡，不跳动布局） */
  focused: boolean;
}

/** 显影阶梯类（intro 前隐藏，完成后按内联延迟淡入） */
function revealClass(revealed: boolean): string {
  return revealed ? 'motion-safe:hero-fade-in' : 'opacity-0';
}

/**
 * Hero 信息层。desktop lg+ 左锚定（clamp 24-64px / max-w 520 / 标题两行），
 * mobile/tablet 居中单列；地图中央区域不被大段文字覆盖。
 * 口径文案受 DESIGN.md 契约保护：数据日期 + 快照声明与飞线声明分行，不得合并删除。
 */
export default function HeroOverlay({
  citiesCount,
  statsCount,
  dataDate,
  metric,
  onMetricChange,
  revealed,
  focused,
}: Props) {
  // focused 信息减法：仅 opacity，不改 DOM 结构，避免布局跳动
  const dimInFocused =
    'transition-opacity duration-300 [transition-timing-function:var(--ease-paper)] ' +
    (focused ? 'opacity-0' : 'opacity-100');

  return (
    <div
      className={
        'pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col px-4 pt-16 text-center sm:pt-20 ' +
        // desktop 左锚定
        'lg:inset-x-auto lg:left-[clamp(24px,4vw,64px)] lg:top-[56px] lg:max-w-[520px] lg:items-start lg:px-0 lg:pt-0 lg:text-left'
      }
    >
      <div className={`flex flex-wrap items-center justify-center gap-2 lg:justify-start ${revealClass(revealed)} ${dimInFocused}`} style={revealed ? { animationDelay: '0ms' } : undefined}>
        {[`${citiesCount} 城市资源`, `${statsCount} 客流统计城市`].map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[#2b3a4e] bg-[#0b1016]/60 px-3 py-0.5 text-[11px] text-[#8a94a3] backdrop-blur-[2px]"
          >
            {tag}
          </span>
        ))}
      </div>
      <h1
        className={`mt-4 font-serif text-[28px] font-semibold leading-snug text-[#e8e4d8] [text-shadow:0_2px_18px_rgba(0,0,0,0.65)] sm:text-[38px] lg:mt-5 lg:text-[40px] lg:leading-[1.25] ${revealClass(revealed)}`}
        style={revealed ? { animationDelay: '60ms' } : undefined}
      >
        全国城市地铁
        <span className="lg:block">客流可视化平台</span>
      </h1>
      <p
        className={`mt-2.5 max-w-[520px] text-[13px] leading-relaxed text-[#8a94a3] ${revealClass(revealed)} ${dimInFocused}`}
        style={revealed ? { animationDelay: '130ms' } : undefined}
      >
        覆盖全国 {citiesCount} 个城市地铁线路资源 · {statsCount} 个城市客流统计数据
      </p>
      {/* 数据口径：日期 + 快照声明一行，飞线声明独立一行，不挤成长句 */}
      <p
        className={`mt-1.5 text-[11px] leading-relaxed text-[#8a94a3]/80 ${revealClass(revealed)}`}
        style={revealed ? { animationDelay: '160ms' } : undefined}
      >
        {dataDate ? `数据截至 ${dataDate} · ` : ''}公开数据快照 · 非实时数据
      </p>
      <p
        className={`text-[11px] leading-relaxed text-[#8a94a3]/60 ${revealClass(revealed)}`}
        style={revealed ? { animationDelay: '180ms' } : undefined}
      >
        飞线为视觉示意，不代表实际客流流向
      </p>
      <div
        className={`pointer-events-auto mt-1 ${revealClass(revealed)}`}
        style={revealed ? { animationDelay: '200ms' } : undefined}
      >
        <HeroMetricSwitcher metric={metric} onMetricChange={onMetricChange} />
      </div>
    </div>
  );
}
