import type { ComparableCity } from '../../types/metro';

interface Props {
  cities: ComparableCity[];
  isMobile: boolean;
}

function CellValue({ value, unit, fallback }: { value: number | null; unit: string; fallback: string }) {
  if (value === null) {
    return <span className="text-[12px] text-ink-400">{fallback}</span>;
  }
  const formatted = value >= 100 ? value.toFixed(0) : value.toFixed(1);
  return <span className="text-[12px] text-ink-900 tabular-nums">{formatted} {unit}</span>;
}

function BoolCell({ ok }: { ok: boolean }) {
  return (
    <span className={`text-[12px] ${ok ? 'text-jade-600' : 'text-ink-400'}`}>
      {ok ? '✔' : '–'}
    </span>
  );
}

const ROWS: { key: string; label: string; unit: string; getVal: (c: ComparableCity) => number | null; getFallback: (c: ComparableCity) => string }[] = [
  { key: 'daily', label: '日客流', unit: '万人次', getVal: c => c.dailyRidershipWan, getFallback: c => c.hasStats ? '暂无日客流展示值' : '暂未收录' },
  { key: 'mileage', label: '运营里程', unit: 'km', getVal: c => c.operatingMileageKm, getFallback: () => '暂未收录' },
  { key: 'stations', label: '运营站点', unit: '座', getVal: c => c.operatingStations, getFallback: () => '暂未收录' },
  { key: 'lines', label: '运营线路', unit: '条', getVal: c => c.operatingLines, getFallback: () => '暂未收录' },
  { key: 'intensity', label: '客流强度', unit: '', getVal: c => c.ridershipIntensity, getFallback: () => '暂未收录' },
  { key: 'peak', label: '峰值客流', unit: '万人次', getVal: c => c.peakRidershipWan, getFallback: () => '暂未收录' },
];

const rowBorder = 'border-b border-[rgba(33,29,22,0.06)]';

export default function CompareTable({ cities, isMobile }: Props) {
  if (isMobile) {
    return (
      <section className="rounded-lg bg-paper-100 p-5 shadow-card">
        <div className="mb-4 font-serif text-[15px] font-semibold text-ink-900">
          详细对比
        </div>
        <div className="flex flex-col gap-4">
          {cities.map(c => (
            <div key={c.city} className="rounded-md border border-paper-200 bg-paper-50 p-3.5">
              <div className="mb-2.5 font-serif text-[15px] font-semibold text-vermilion-600">
                {c.city_cn}
              </div>
              <div className="flex flex-col gap-1.5">
                {ROWS.map(r => (
                  <div key={r.key} className="flex justify-between text-[12px]">
                    <span className="text-ink-500">{r.label}</span>
                    <CellValue value={r.getVal(c)} unit={r.unit} fallback={r.getFallback(c)} />
                  </div>
                ))}
                <div className="flex justify-between text-[12px]">
                  <span className="text-ink-500">年度趋势</span>
                  <BoolCell ok={c.hasYearlyTrend} />
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-ink-500">线路图</span>
                  <BoolCell ok={c.hasNetworkMap} />
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-ink-500">规划图</span>
                  <BoolCell ok={c.hasPlanMap} />
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-ink-500">封面状态</span>
                  <span className={`text-[12px] ${c.coverStatus === 'downloaded' ? 'text-jade-600' : 'text-ink-400'}`}>
                    {c.coverStatus === 'downloaded' ? '已收录' : '资源收集中'}
                  </span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-ink-500">完整度评分</span>
                  <span className="font-semibold text-ink-900 tabular-nums">{c.qualityScore ?? '–'}</span>
                </div>
                {c.missingItems.length > 0 && (
                  <div className="mt-1 text-[11px] text-ink-400">
                    缺失: {c.missingItems.join('、')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg bg-paper-100 p-5 shadow-card">
      <div className="mb-4 font-serif text-[15px] font-semibold text-ink-900">
        详细对比
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-paper-300 text-ink-500">
              <th className="px-2.5 py-2.5 text-left font-medium">指标</th>
              {cities.map(c => (
                <th key={c.city} className="px-2.5 py-2.5 text-center font-serif font-semibold text-ink-900">
                  {c.city_cn}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(r => (
              <tr key={r.key} className={rowBorder}>
                <td className="px-2.5 py-2.5 text-ink-500">{r.label}{r.unit ? `（${r.unit}）` : ''}</td>
                {cities.map(c => (
                  <td key={c.city} className="px-2.5 py-2.5 text-center">
                    <CellValue value={r.getVal(c)} unit="" fallback={r.getFallback(c)} />
                  </td>
                ))}
              </tr>
            ))}
            {/* Boolean rows */}
            {([
              { key: 'trend', label: '年度趋势', get: (c: ComparableCity) => c.hasYearlyTrend },
              { key: 'network', label: '线路图', get: (c: ComparableCity) => c.hasNetworkMap },
              { key: 'plan', label: '规划图', get: (c: ComparableCity) => c.hasPlanMap },
            ] as const).map(r => (
              <tr key={r.key} className={rowBorder}>
                <td className="px-2.5 py-2.5 text-ink-500">{r.label}</td>
                {cities.map(c => (
                  <td key={c.city} className="px-2.5 py-2.5 text-center">
                    <BoolCell ok={r.get(c)} />
                  </td>
                ))}
              </tr>
            ))}
            {/* Cover status */}
            <tr className={rowBorder}>
              <td className="px-2.5 py-2.5 text-ink-500">封面状态</td>
              {cities.map(c => (
                <td key={c.city} className="px-2.5 py-2.5 text-center text-[12px]">
                  <span className={c.coverStatus === 'downloaded' ? 'text-jade-600' : 'text-ink-400'}>
                    {c.coverStatus === 'downloaded' ? '已收录' : '资源收集中'}
                  </span>
                </td>
              ))}
            </tr>
            {/* Quality score */}
            <tr className={rowBorder}>
              <td className="px-2.5 py-2.5 text-ink-500">完整度评分</td>
              {cities.map(c => (
                <td key={c.city} className="px-2.5 py-2.5 text-center font-bold">
                  <span className="text-ink-900 tabular-nums">{c.qualityScore ?? '–'}</span>
                </td>
              ))}
            </tr>
            {/* Missing items */}
            <tr>
              <td className="px-2.5 py-2.5 text-ink-500">缺失项</td>
              {cities.map(c => (
                <td key={c.city} className="max-w-[160px] px-2.5 py-2.5 text-center text-[11px] text-ink-400">
                  {c.missingItems.length === 0 ? <span className="text-ink-300">—</span> : c.missingItems.join('、')}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
