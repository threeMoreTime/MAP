import type { MetricKey } from '../../types/metro';
import { METRIC_LABELS } from '../../types/metro';

interface Props {
  keyword: string;
  onKeywordChange: (v: string) => void;
  metric: MetricKey;
  onMetricChange: (v: MetricKey) => void;
  topN: number;
  onTopNChange: (v: number) => void;
  /** 当前关键词匹配的城市数（用于输入反馈与空态警示） */
  matchCount: number;
}

const DEFAULT_METRIC: MetricKey = 'daily_ridership_wan';
const DEFAULT_TOP_N = 10;

const pillBase =
  'cursor-pointer rounded-full border px-2.5 py-1 text-[12px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-vermilion-500';
const pillActive = 'border-vermilion-600 bg-vermilion-600 font-medium text-paper-50';
const pillIdle = 'border-paper-300 bg-paper-50 text-ink-500 hover:text-ink-900';

export default function FilterToolbar({
  keyword, onKeywordChange, metric, onMetricChange, topN, onTopNChange, matchCount,
}: Props) {
  const isModified = keyword !== '' || metric !== DEFAULT_METRIC || topN !== DEFAULT_TOP_N;

  const reset = () => {
    onKeywordChange('');
    onMetricChange(DEFAULT_METRIC);
    onTopNChange(DEFAULT_TOP_N);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg bg-paper-100 p-3.5 shadow-card">
      {/* 搜索 + 匹配计数反馈 */}
      <div className="flex items-center gap-2">
        <label className="text-[13px] text-ink-500" htmlFor="filter-keyword">搜索城市</label>
        <div className="relative">
          <input
            id="filter-keyword"
            type="text"
            className="h-9 rounded-sm border border-paper-300 bg-paper-50 px-2.5 pr-7 text-[13px] text-ink-900 placeholder-ink-300 focus:border-vermilion-500 focus:outline-none"
            placeholder="输入城市名..."
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            style={{ width: 150 }}
            aria-label="搜索城市"
          />
          {keyword && (
            <button
              onClick={() => onKeywordChange('')}
              aria-label="清空搜索"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer px-1 text-[13px] leading-none text-ink-400 hover:text-ink-700"
            >
              ×
            </button>
          )}
        </div>
        {keyword && (
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] leading-5 tabular-nums ${
              matchCount === 0
                ? 'border-vermilion-600/30 bg-vermilion-50 text-vermilion-600'
                : 'border-paper-300 bg-paper-50 text-ink-500'
            }`}
            aria-live="polite"
          >
            {matchCount === 0 ? '0 城 · 无匹配' : `${matchCount} 城`}
          </span>
        )}
      </div>

      {/* 主指标分段控件 */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-ink-500">主指标</span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="选择主指标">
          {(Object.keys(METRIC_LABELS) as MetricKey[]).map((key) => (
            <button
              key={key}
              className={`${pillBase} ${metric === key ? pillActive : pillIdle}`}
              onClick={() => onMetricChange(key)}
              aria-pressed={metric === key}
            >
              {METRIC_LABELS[key].name}
            </button>
          ))}
        </div>
      </div>

      {/* 排行分段控件 */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-ink-500">排行</span>
        <div className="flex gap-1.5" role="group" aria-label="选择排行范围">
          {[
            { v: 10, label: 'Top 10' },
            { v: 20, label: 'Top 20' },
            { v: 0, label: '全部' },
          ].map((o) => (
            <button
              key={o.v}
              className={`${pillBase} ${topN === o.v ? pillActive : pillIdle}`}
              onClick={() => onTopNChange(o.v)}
              aria-pressed={topN === o.v}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* 条件重置：仅当偏离默认态时出现 */}
      {isModified && (
        <button
          onClick={reset}
          className="ml-auto cursor-pointer rounded-full border border-vermilion-600/40 bg-paper-50 px-3 py-1 text-[12px] text-vermilion-600 transition-colors duration-150 hover:bg-vermilion-50 focus-visible:outline-2 focus-visible:outline-vermilion-500"
          aria-label="重置筛选"
        >
          ↺ 重置
        </button>
      )}
    </div>
  );
}
