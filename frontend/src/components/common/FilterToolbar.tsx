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

export default function FilterToolbar({ keyword, onKeywordChange, metric, onMetricChange, topN, onTopNChange }: Props) {
  return (
    <div className="filter-toolbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label>搜索城市</label>
        <input
          type="text"
          className="filter-input"
          placeholder="输入城市名..."
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          style={{ width: 160 }}
          aria-label="搜索城市"
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label>主指标</label>
        <select
          className="filter-input"
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label>排行</label>
        <select
          className="filter-input"
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
