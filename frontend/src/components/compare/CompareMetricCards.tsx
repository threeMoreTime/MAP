import type { ComparableCity } from '../../types/metro';

interface Props {
  cities: ComparableCity[];
  isMobile: boolean;
}

function MetricValue({ value, unit, fallback }: { value: number | null; unit: string; fallback: string }) {
  if (value === null) {
    return <span className="text-[13px] text-ink-400">{fallback}</span>;
  }
  const formatted = value >= 100 ? value.toFixed(0) : value.toFixed(1);
  return (
    <span className="text-[13px] text-ink-700">
      <span className="font-serif text-[15px] font-semibold text-ink-900 tabular-nums">{formatted}</span>
      {' '}{unit}
    </span>
  );
}

function QualityBadge({ level }: { level: 'high' | 'medium' | 'low' | null }) {
  if (!level) return <span className="text-[11px] text-ink-400">暂未收录</span>;
  const config = {
    high: 'border-jade-600/25 bg-jade-600/10 text-jade-600',
    medium: 'border-gold-600/25 bg-gold-600/10 text-gold-600',
    low: 'border-ink-400/25 bg-ink-400/10 text-ink-500',
  }[level];
  const label = { high: '完整度高', medium: '完整度中', low: '完整度低' }[level];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${config}`}>{label}</span>
  );
}

export default function CompareMetricCards({ cities, isMobile }: Props) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: isMobile ? '1fr' : `repeat(${Math.min(cities.length, 5)}, 1fr)` }}
    >
      {cities.map(c => (
        <div key={c.city} className="flex flex-col gap-2.5 rounded-lg bg-paper-100 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[16px] font-semibold text-ink-900">{c.city_cn}</span>
            <QualityBadge level={c.qualityLevel} />
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
            <div>
              <div className="mb-0.5 text-[11px] text-ink-500">日客流</div>
              <MetricValue value={c.dailyRidershipWan} unit="万人次" fallback={c.hasStats ? '暂无日客流展示值' : '暂未收录'} />
            </div>
            <div>
              <div className="mb-0.5 text-[11px] text-ink-500">运营里程</div>
              <MetricValue value={c.operatingMileageKm} unit="km" fallback="暂未收录" />
            </div>
            <div>
              <div className="mb-0.5 text-[11px] text-ink-500">运营站点</div>
              <MetricValue value={c.operatingStations} unit="座" fallback="暂未收录" />
            </div>
            <div>
              <div className="mb-0.5 text-[11px] text-ink-500">运营线路</div>
              <MetricValue value={c.operatingLines} unit="条" fallback="暂未收录" />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-paper-300 pt-2">
            <span className="text-[12px] text-ink-500">
              完整度 <span className="font-bold text-ink-900 tabular-nums">{c.qualityScore ?? '–'}</span> 分
            </span>
            <span className={`text-[11px] ${c.missingItems.length === 0 ? 'text-jade-600' : 'text-ink-400'}`}>
              缺失 {c.missingItems.length} 项
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
