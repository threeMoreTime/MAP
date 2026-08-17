import { NIGHT } from '../../lib/hero3d/palette';
import { formatMetricValue } from '../../hooks/useDashboardFilters';
import { METRIC_LABELS, type MetricKey } from '../../types/metro';
import type { RankedCity } from '../../lib/hero3d/types';

interface Props {
  ranked: RankedCity[];
  metric: MetricKey;
  hoveredCity: string | null;
  selectedCity: string | null;
  count: number;
  /** intro 完成后阶梯显影 */
  revealed: boolean;
  onHover: (city: string | null) => void;
  onSelect: (city: string) => void;
}

/**
 * Hero 右侧 Top 排行（桌面 lg+，移动端隐藏）。
 * 与地图共享 hovered/selected 状态实现双向联动；朱砂只给第一名与 hover/selected 行。
 * 键盘可达（行即 button），是键盘用户进入城市数据的入口。
 */
export default function HeroRanking({
  ranked,
  metric,
  hoveredCity,
  selectedCity,
  count,
  revealed,
  onHover,
  onSelect,
}: Props) {
  const ml = METRIC_LABELS[metric];
  const top = ranked.slice(0, count);
  if (top.length === 0) return null;

  return (
    <nav
      aria-label={`${ml.name} Top ${top.length}`}
      className={`absolute right-4 top-1/2 z-20 hidden w-[212px] -translate-y-1/2 flex-col rounded-lg border border-[#2b3a4e] bg-[#0b1016]/60 p-2.5 backdrop-blur-[2px] lg:flex ${
        revealed ? 'motion-safe:hero-fade-in' : 'opacity-0'
      }`}
      style={revealed ? { animationDelay: '260ms' } : undefined}
    >
      <div
        className="mb-1.5 px-1 font-serif text-[13px] font-semibold"
        style={{ color: NIGHT.text }}
      >
        {ml.name}
        <span className="ml-1.5 text-[10px] font-normal" style={{ color: NIGHT.textDim }}>
          Top {top.length}
        </span>
      </div>
      <ul className="flex flex-col">
        {top.map((r) => {
          const hovered = hoveredCity === r.city;
          const selected = selectedCity === r.city;
          const first = r.rank === 1;
          const highlighted = hovered || selected;
          return (
            <li key={r.city}>
              <button
                type="button"
                onMouseEnter={() => onHover(r.city)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(r.city)}
                onBlur={() => onHover(null)}
                onClick={() => onSelect(r.city)}
                aria-label={`第${r.rank}名 ${r.cityCn} ${formatMetricValue(r.raw, metric)}`}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-sm px-1.5 py-[5px] text-left text-[12px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#d0553f] ${
                  highlighted ? 'bg-[#d0553f]/15' : 'hover:bg-[#16202e]/80'
                }`}
              >
                <span
                  className="w-4 shrink-0 text-right font-serif text-[11px] tabular-nums"
                  style={{ color: first ? NIGHT.accent : NIGHT.textDim }}
                >
                  {r.rank}
                </span>
                <span
                  className="min-w-0 flex-1 truncate"
                  style={{
                    color: highlighted || first ? NIGHT.text : NIGHT.textDim,
                    fontWeight: highlighted || first ? 500 : 400,
                  }}
                >
                  {r.cityCn}
                </span>
                {/* 非仅颜色：hover/selected 行加 ▸ 前导符 */}
                {highlighted && (
                  <span className="shrink-0 text-[9px]" style={{ color: NIGHT.accent }}>
                    ▸
                  </span>
                )}
                <span
                  className="shrink-0 tabular-nums"
                  style={{ color: first ? NIGHT.accent : NIGHT.text }}
                >
                  {r.value.toFixed(ml.decimals)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 px-1 text-[9px] leading-relaxed" style={{ color: `${NIGHT.textDim}b3` }}>
        飞线为视觉示意，非实际客流流向
      </p>
    </nav>
  );
}
