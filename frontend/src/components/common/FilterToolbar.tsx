import type { MetricKey } from '../../types/metro';
import { METRIC_LABELS } from '../../types/metro';

interface Props {
  keyword: string;
  onKeywordChange: (v: string) => void;
  metric: MetricKey;
  onMetricChange: (v: MetricKey) => void;
  topN: number;
  onTopNChange: (v: number) => void;
}

const fieldClass =
  'h-9 rounded-sm border border-paper-300 bg-paper-50 px-2.5 text-[13px] text-ink-900 placeholder-ink-300 focus:border-vermilion-500 focus:outline-none';

export default function FilterToolbar({ keyword, onKeywordChange, metric, onMetricChange, topN, onTopNChange }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="flex items-center gap-2">
        <label className="text-[13px] text-ink-500" htmlFor="filter-keyword">搜索城市</label>
        <input
          id="filter-keyword"
          type="text"
          className={fieldClass}
          placeholder="输入城市名..."
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          style={{ width: 160 }}
          aria-label="搜索城市"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[13px] text-ink-500" htmlFor="filter-metric">主指标</label>
        <select
          id="filter-metric"
          className={fieldClass}
          value={metric}
          onChange={(e) => onMetricChange(e.target.value as MetricKey)}
          style={{ minWidth: 120 }}
          aria-label="选择主指标"
        >
          {Object.entries(METRIC_LABELS).map(([key, { name }]) => (
            <option key={key} value={key}>{name}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[13px] text-ink-500" htmlFor="filter-topn">排行</label>
        <select
          id="filter-topn"
          className={fieldClass}
          value={topN}
          onChange={(e) => onTopNChange(Number(e.target.value))}
          style={{ minWidth: 100 }}
          aria-label="选择排行范围"
        >
          <option value={10}>Top 10</option>
          <option value={20}>Top 20</option>
          <option value={0}>全部</option>
        </select>
      </div>
    </div>
  );
}
