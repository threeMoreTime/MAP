import type { ComparableCity } from '../../types/metro';

interface Props {
  cities: ComparableCity[];
  isMobile: boolean;
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

export default function CompareQualitySection({ cities, isMobile }: Props) {
  return (
    <section className="rounded-lg bg-paper-100 p-5 shadow-card">
      <div className="mb-4 font-serif text-[15px] font-semibold text-ink-900">
        数据完整度对比
      </div>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: isMobile ? '1fr' : `repeat(${Math.min(cities.length, 5)}, 1fr)` }}
      >
        {cities.map(c => (
          <div key={c.city} className="flex flex-col gap-2.5 rounded-md bg-paper-50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-ink-900">{c.city_cn}</span>
              <QualityBadge level={c.qualityLevel} />
            </div>

            {/* Score bar */}
            <div>
              <div className="mb-1 flex justify-between text-[11px] text-ink-500">
                <span>数据完整度评分</span>
                <span className="font-bold text-ink-900 tabular-nums">{c.qualityScore ?? '–'} / 100</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-paper-200">
                <div
                  className={`h-full rounded-full transition-[width] duration-400 ${c.qualityScore !== null && c.qualityScore >= 60 ? 'bg-vermilion-500' : 'bg-ink-300'}`}
                  style={{ width: `${c.qualityScore ?? 0}%` }}
                />
              </div>
            </div>

            {/* Resource status grid */}
            <div className="grid grid-cols-3 gap-1 text-[12px]">
              {[
                { ok: c.hasNetworkMap, label: '线路图' },
                { ok: c.hasPlanMap, label: '规划图' },
                { ok: c.coverStatus === 'downloaded', label: '封面' },
              ].map(r => (
                <div
                  key={r.label}
                  className={`flex items-center justify-center gap-1 text-center ${r.ok ? 'text-jade-600' : 'text-ink-400'}`}
                >
                  <span className="font-bold">{r.ok ? '✔' : '–'}</span> {r.label}
                </div>
              ))}
            </div>

            {/* Missing items */}
            {c.missingItems.length > 0 && (
              <div className="text-[11px] text-ink-400">
                <strong>缺失:</strong> {c.missingItems.slice(0, 3).join('、')}{c.missingItems.length > 3 ? '...' : ''}
              </div>
            )}
            {c.warnings.length > 0 && (
              <div className="text-[11px] text-gold-600">
                {c.warnings[0]}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3.5 rounded-sm bg-paper-50 px-3 py-1.5 text-[11px] text-ink-500">
        数据完整度评分仅反映本项目当前收录资料的完整程度，不代表城市地铁运营水平。
      </div>
    </section>
  );
}
