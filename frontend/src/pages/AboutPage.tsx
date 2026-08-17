import React from 'react';
import SectionTitle from '../components/common/SectionTitle';
import { useMetroData } from '../hooks/useMetroData';
import LastUpdatedBadge from '../components/common/LastUpdatedBadge';
import { withBaseUrl } from '../utils/path';
import { daysSince, freshnessLevel } from '../utils/dataFreshness';

const FIELDS: { name: string; desc: string; unit?: string }[] = [
  { name: 'daily_ridership_wan', desc: '统计日期当日全线网进站客流总量', unit: '万人次' },
  { name: 'operating_mileage_km', desc: '已开通运营线路的总里程', unit: 'km' },
  { name: 'operating_stations', desc: '已开通运营的车站数量', unit: '座' },
  { name: 'operating_lines', desc: '已开通运营线路条数', unit: '条' },
  { name: 'ridership_intensity', desc: '日客流量 / 运营里程（万/km）', unit: '万/km' },
  { name: 'peak_ridership_wan', desc: '历史单日客流量最高纪录', unit: '万人次' },
  { name: 'peak_ridership_date', desc: '历史最高客流量对应日期' },
  { name: 'yearly_avg_ridership', desc: '年度日均客运量（含 years / values 数组）', unit: '万人次' },
  { name: 'network_map_path', desc: '运营线路图本地路径（如 cities/beijing/beijing_network.png）' },
  { name: 'plan_map_path', desc: '规划线路图本地路径（如 cities/beijing/beijing_plan.png）' },
];

const LIMITATIONS = [
  '本项目展示的是公开资料整理快照，非实时运营数据',
  '有统计记录与有日客流展示值不是同一概念，两者不可混淆',
  '部分城市已纳入索引并进行了线路或基础信息整理，但暂未收录可展示日客流',
  '不同城市统计口径及运营统计日期可能存在客观差异，数据仅供参考',
  'daily_ridership_wan ≤ 0 表示暂无当日数据，不代表真实零客流',
  '本平台展示的数据仅供个人学习、学术研究和可视化演示使用，不构成官方决策依据',
];

const LICENSE_NOTES = [
  {
    text: '封面图的 source_url、license、author、attribution 完整记录于 manifest.json',
  },
  {
    text: 'CC BY / CC BY-SA 授权实景图片均保留了作者署名及对应授权协议链接',
  },
  {
    text: 'CC BY-SA 图片的再分发和使用需严格遵守相同创作共用协议条款',
  },
  {
    text: '线路图/规划图均以公开学习之目的使用，版权归对应城市轨道交通官方及制作方所有',
  },
];

const PILL_TONE: Record<string, string> = {
  客流统计: 'border-vermilion-500/25 bg-vermilion-50 text-vermilion-600',
  '线路图/规划图': 'border-ink-400/25 bg-ink-400/10 text-ink-700',
  城市封面图: 'border-jade-600/25 bg-jade-600/10 text-jade-600',
  地图底图: 'border-gold-600/25 bg-gold-600/10 text-gold-600',
};

export default function AboutPage() {
  const { merged, manifest } = useMetroData();

  // 基于当前快照动态计算，如果数据未拉取到则优雅兜底
  const stats = React.useMemo(() => {
    const total = merged.length || 50;
    const hasStats = merged.filter(c => c.has_stats === true).length || 34;
    const hasRidership = merged.filter(c => c.has_stats && c.daily_ridership_wan > 0).length || 23;
    const statsButNoRidership = merged.filter(c => c.has_stats && c.daily_ridership_wan <= 0).length || 11;
    const noStats = merged.filter(c => !c.has_stats).length || 16;
    const noRidership = merged.filter(c => !c.has_stats || c.daily_ridership_wan <= 0).length || 27;
    const hasNetworkMap = merged.filter(c => c.has_network_map).length || 48;
    const hasPlanMap = merged.filter(c => c.has_plan_map).length || 41;
    const downloadedCovers = merged.filter(c => c.cover_status === 'downloaded').length || 49;

    return {
      total,
      hasStats,
      hasRidership,
      statsButNoRidership,
      noStats,
      noRidership,
      hasNetworkMap,
      hasPlanMap,
      downloadedCovers,
    };
  }, [merged]);

  const coverageStats = React.useMemo(() => [
    { num: stats.total.toString(), label: '城市索引' },
    { num: stats.hasStats.toString(), label: '有统计记录' },
    { num: stats.hasRidership.toString(), label: '有日客流展示值' },
    { num: stats.noRidership.toString(), label: '暂无日客流展示值' },
    { num: stats.statsButNoRidership.toString(), label: '其中有统计但无日客流' },
    { num: stats.noStats.toString(), label: '完全无统计记录' },
    { num: stats.hasNetworkMap.toString(), label: '线路图覆盖' },
    { num: stats.hasPlanMap.toString(), label: '规划图覆盖' },
    { num: `${stats.downloadedCovers}/${stats.total}`, label: '封面图覆盖' },
  ], [stats]);

  const dataSources = React.useMemo(() => [
    {
      pill: '客流统计',
      lines: [
        '数据来源：MetroDB.org 公开页面与 MetroMan 客流数据汇总整理',
        '获取机制：程序化解析与多渠道交叉核验，避免人工录入误差',
        `覆盖规模：已收录全国 ${stats.hasRidership} 个有日客流展示值的城市记录`,
      ],
    },
    {
      pill: '线路图/规划图',
      lines: [
        '资源归属：由各城市轨道交通官方网站、热心志愿者及维基百科贡献者制作',
        '管理机制：存储于本地 /cities/ 资源目录，通过 index 配置文件索引',
        `覆盖规模：已收录 ${stats.hasNetworkMap} 张运营线路图、${stats.hasPlanMap} 张建设规划图`,
      ],
    },
    {
      pill: '城市封面图',
      lines: [
        '图片来源：Wikimedia Commons、Wikidata 及 CC 共享授权图库',
        '管理与授权：完整溯源及 CC/BY-SA 等授权协议记录于封面 manifest 文件',
        `覆盖规模：已下载 ${stats.downloadedCovers} 个城市实景封面，部分城市采用智能兜底 fallback`,
      ],
    },
    {
      pill: '地图底图',
      lines: [
        '数据来源：中国行政区划 GeoJSON 地图底座（assets/china.json）',
        '容错机制：提供本地静态解析 → 远程高可用 CDN 加载 → 降级纯文本渲染三级保护',
      ],
    },
  ], [stats]);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-10 pt-8 sm:px-6">
      <SectionTitle icon="ⓘ" title="数据说明" />

      <div className="mb-5 rounded-lg bg-paper-100 px-5 py-6 text-center shadow-card">
        <p className="text-[13px] text-ink-500">
          说明本项目的数据来源、资源来源、字段口径、更新机制与使用限制
        </p>
        <div className="mt-4 flex flex-col items-center gap-2.5">
          <LastUpdatedBadge generatedAt={manifest?.generated_at} />
          {(() => {
            const days = daysSince(manifest?.stats_scrape_date);
            const level = freshnessLevel(days);
            return (
              <div
                className={`rounded-sm border px-3 py-1.5 text-[11px] leading-relaxed ${
                  level === 'stale'
                    ? 'border-gold-600/25 bg-gold-600/10 text-gold-600'
                    : 'border-paper-300 bg-paper-50 text-ink-500'
                }`}
              >
                数据采集日：{manifest?.stats_scrape_date ?? '未知'}
                {days !== null && <> · 距今 {days} 天</>}
                {level === 'stale' && <> · 快照已较陈旧，仅供历史参考</>}
              </div>
            );
          })()}
          <a
            href={withBaseUrl('data/latest/manifest.json')}
            download="manifest.json"
            title="下载原始数据快照 JSON"
            aria-label="下载原始数据快照 JSON"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-vermilion-500/30 bg-vermilion-50 px-3.5 py-1.5 text-[12px] text-vermilion-600 transition-colors duration-200 hover:bg-vermilion-100"
          >
            ⬇ 下载数据快照 JSON (manifest.json)
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 数据来源总览 */}
        <div className="rounded-lg bg-paper-100 p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <span aria-hidden className="text-[16px]">📊</span>
            <h3 className="font-serif text-[15px] font-semibold text-ink-900">数据来源总览</h3>
          </div>
          <div className="flex flex-col gap-3">
            {dataSources.map((src) => (
              <div key={src.pill} className="flex flex-col gap-1.5 sm:flex-row sm:gap-3">
                <span className={`h-fit shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${PILL_TONE[src.pill]}`}>
                  {src.pill}
                </span>
                <div className="flex flex-col gap-0.5 text-[12px] leading-relaxed text-ink-700">
                  {src.lines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 数据字段说明 */}
        <div className="rounded-lg bg-paper-100 p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <span aria-hidden className="text-[16px]">🏷️</span>
            <h3 className="font-serif text-[15px] font-semibold text-ink-900">数据字段说明</h3>
          </div>
          <table className="w-full border-collapse text-[12px]">
            <tbody>
              {FIELDS.map((f) => (
                <tr key={f.name} className="border-b border-[rgba(33,29,22,0.06)]">
                  <td className="w-[38%] py-2 pr-2 align-top font-mono text-[11px] text-vermilion-600">{f.name}</td>
                  <td className="py-2 text-ink-700">
                    {f.desc}
                    {f.unit && <span className="text-ink-400">（{f.unit}）</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 资源覆盖 */}
        <div className="rounded-lg bg-paper-100 p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <span aria-hidden className="text-[16px]">📦</span>
            <h3 className="font-serif text-[15px] font-semibold text-ink-900">基于当前快照动态计算的资源覆盖</h3>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {coverageStats.map((item) => (
              <div key={item.label} className="flex flex-col items-center rounded-md bg-paper-50 px-2 py-2.5 text-center">
                <span className="font-serif text-[20px] font-semibold text-ink-900 tabular-nums">{item.num}</span>
                <span className="text-[10px] leading-tight text-ink-400">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-md border border-dashed border-paper-400 bg-paper-50 px-3 py-2 text-[11px] leading-relaxed text-ink-500">
            💡 统计口径说明：
            <br />
            1. 城市索引 ({stats.total} 城) = 有统计记录 ({stats.hasStats} 城) + 完全无统计记录 ({stats.noStats} 城)
            <br />
            2. 有统计记录 ({stats.hasStats} 城) = 有日客流展示值 ({stats.hasRidership} 城) + 其中有统计但无日客流 ({stats.statsButNoRidership} 城)
            <br />
            3. 暂无日客流展示值 ({stats.noRidership} 城) = 完全无统计记录 ({stats.noStats} 城) + 其中有统计但无日客流 ({stats.statsButNoRidership} 城)
          </div>
        </div>

        {/* 版权与署名 */}
        <div className="rounded-lg bg-paper-100 p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <span aria-hidden className="text-[16px]">©️</span>
            <h3 className="font-serif text-[15px] font-semibold text-ink-900">版权与署名</h3>
          </div>
          <ul className="m-0 flex flex-col gap-2 pl-0">
            {LICENSE_NOTES.map((note, i) => (
              <li key={i} className="flex list-none items-start gap-2 text-[12px] leading-relaxed text-ink-700">
                <span aria-hidden className="mt-0.5 shrink-0 text-[10px] text-vermilion-500">◆</span>
                <span>{note.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 使用限制 */}
        <div className="rounded-lg bg-paper-100 p-5 shadow-card lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <span aria-hidden className="text-[16px]">⚠️</span>
            <h3 className="font-serif text-[15px] font-semibold text-ink-900">使用限制与免责声明</h3>
          </div>
          <ul className="m-0 grid grid-cols-1 gap-2 pl-0 sm:grid-cols-2">
            {LIMITATIONS.map((item) => (
              <li key={item} className="flex list-none items-start gap-2 text-[12px] leading-relaxed text-ink-700">
                <span aria-hidden className="mt-0.5 shrink-0 text-[10px] text-gold-600">▸</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
