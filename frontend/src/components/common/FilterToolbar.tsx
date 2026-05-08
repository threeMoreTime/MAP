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

const inputStyle: React.CSSProperties = {
  background: 'rgba(6,18,38,0.9)', border: '1px solid rgba(0,150,220,0.2)',
  color: '#c8d6e5', borderRadius: 6, padding: '7px 14px', fontSize: 13,
  outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.3s',
};

export default function FilterToolbar({ keyword, onKeywordChange, metric, onMetricChange, topN, onTopNChange }: Props) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 14, padding: '10px 24px 14px', flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ color: '#4a6a8a', fontSize: 13 }}>搜索城市</label>
        <input
          type="text"
          placeholder="输入城市名..."
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          style={{ ...inputStyle, width: 160 }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ color: '#4a6a8a', fontSize: 13 }}>主指标</label>
        <select
          value={metric}
          onChange={(e) => onMetricChange(e.target.value as MetricKey)}
          style={{ ...inputStyle, minWidth: 120 }}
        >
          {Object.entries(METRIC_LABELS).map(([key, { name }]) => (
            <option key={key} value={key}>{name}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ color: '#4a6a8a', fontSize: 13 }}>排行</label>
        <select
          value={topN}
          onChange={(e) => onTopNChange(Number(e.target.value))}
          style={{ ...inputStyle, minWidth: 100 }}
        >
          <option value={10}>Top 10</option>
          <option value={20}>Top 20</option>
          <option value={0}>全部</option>
        </select>
      </div>
    </div>
  );
}
