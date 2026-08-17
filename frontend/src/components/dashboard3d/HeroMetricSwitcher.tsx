import { METRIC_LABELS, type MetricKey } from '../../types/metro';

interface Props {
  metric: MetricKey;
  onMetricChange: (metric: MetricKey) => void;
}

const pillBase =
  'cursor-pointer rounded-full border px-3 py-1 text-[12px] leading-none transition-colors duration-200 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#d0553f]';
const pillActive = 'border-[#d0553f] bg-[#d0553f] font-medium text-paper-50';
const pillIdle = 'border-[#2b3a4e] bg-[#0b1016]/60 text-[#8a94a3] hover:text-[#e8e4d8]';

/**
 * Hero 主指标切换：沿用全站分段胶囊词汇（夜墨变体），
 * 与下方 FilterToolbar 共用同一 metric 状态（单一 source of truth 在页面层）。
 */
export default function HeroMetricSwitcher({ metric, onMetricChange }: Props) {
  return (
    <div
      role="group"
      aria-label="主指标切换"
      className="mt-4 flex flex-wrap items-center justify-center gap-2"
    >
      {(Object.keys(METRIC_LABELS) as MetricKey[]).map((key) => {
        const active = metric === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onMetricChange(key)}
            className={`${pillBase} ${active ? pillActive : pillIdle}`}
          >
            {METRIC_LABELS[key].name}
          </button>
        );
      })}
    </div>
  );
}
