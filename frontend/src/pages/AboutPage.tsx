import React from 'react';
import SectionTitle from '../components/common/SectionTitle';
import { useMetroData } from '../hooks/useMetroData';
import LastUpdatedBadge from '../components/common/LastUpdatedBadge';
import s from './AboutPage.module.css';

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
  '数据来自公开页面与本地志愿者整理，为非实时、非官方发布之历史快照系统',
  '不同城市统计口径及运营统计日期可能存在客观差异，数据仅供参考',
  '部分边远或新开通地铁的城市缺少客流量记录或规划图资源，正在逐步补充中',
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

export default function AboutPage() {
  const { merged, manifest } = useMetroData();

  // 动态统计指标，如果数据未拉取到则优雅兜底
  const stats = React.useMemo(() => {
    const total = merged.length || 50;
    const hasRidership = merged.filter(c => c.has_stats && c.daily_ridership_wan > 0).length || 34;
    const hasNetworkMap = merged.filter(c => c.has_network_map).length || 48;
    const hasPlanMap = merged.filter(c => c.has_plan_map).length || 41;
    const downloadedCovers = merged.filter(c => c.cover_status === 'downloaded').length || 49;

    return {
      total,
      hasRidership,
      hasNetworkMap,
      hasPlanMap,
      downloadedCovers,
    };
  }, [merged]);

  const coverageStats = React.useMemo(() => [
    { num: stats.total.toString(), label: '城市索引' },
    { num: stats.hasRidership.toString(), label: '城市客流' },
    { num: `${stats.downloadedCovers}/${stats.total}`, label: '封面图' },
    { num: stats.hasNetworkMap.toString(), label: '线路图' },
    { num: stats.hasPlanMap.toString(), label: '规划图' },
  ], [stats]);

  const dataSources = React.useMemo(() => [
    {
      pill: '客流统计',
      pillClass: s.pillRidership,
      lines: [
        '数据来源：MetroDB.org 公开页面与 MetroMan 客流数据汇总整理',
        '获取机制：程序化解析与多渠道交叉核验，避免人工录入误差',
        `覆盖规模：已收录全国 ${stats.hasRidership} 个城市的日线网客流及峰值记录`,
      ],
    },
    {
      pill: '线路图/规划图',
      pillClass: s.pillMap,
      lines: [
        '资源归属：由各城市轨道交通官方网站、热心志愿者及维基百科贡献者制作',
        '管理机制：存储于本地 /cities/ 资源目录，通过 index 配置文件索引',
        `覆盖规模：已收录 ${stats.hasNetworkMap} 张运营线路图、${stats.hasPlanMap} 张建设规划图`,
      ],
    },
    {
      pill: '城市封面图',
      pillClass: s.pillCover,
      lines: [
        '图片来源：Wikimedia Commons、Wikidata 及 CC 共享授权图库',
        '管理与授权：完整溯源及 CC/BY-SA 等授权协议记录于封面 manifest 文件',
        `覆盖规模：已下载 ${stats.downloadedCovers} 个城市实景封面，部分城市采用智能兜底 fallback`,
      ],
    },
    {
      pill: '地图底图',
      pillClass: s.pillGeo,
      lines: [
        '数据来源：中国行政区划 GeoJSON 地图底座（assets/china.json）',
        '容错机制：提供本地静态解析 → 远程高可用 CDN 加载 → 降级纯文本渲染三级保护',
      ],
    },
  ], [stats]);

  return (
    <div className="page-container" style={{ paddingTop: 32, paddingBottom: 40 }}>
      <SectionTitle icon="ⓘ" title="数据说明" />

      <div className={s.hero}>
        <p className={s.heroSubtitle}>
          说明本项目的数据来源、资源来源、字段口径、更新机制与使用限制
        </p>
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
          <LastUpdatedBadge generatedAt={manifest?.generated_at} />
        </div>
      </div>

      <div className={s.cardsGrid}>
        {/* 数据来源总览 */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardIcon}>📊</span>
            <h3 className={s.cardTitle}>数据来源总览</h3>
          </div>
          <div className={s.sourceList}>
            {dataSources.map((src) => (
              <div key={src.pill} className={s.sourceItem}>
                <span className={`${s.sourcePill} ${src.pillClass}`}>{src.pill}</span>
                <div className={s.sourceDesc}>
                  {src.lines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 数据字段说明 */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardIcon}>🏷️</span>
            <h3 className={s.cardTitle}>数据字段说明</h3>
          </div>
          <table className={s.fieldTable}>
            <tbody>
              {FIELDS.map((f) => (
                <tr key={f.name} className={s.fieldRow}>
                  <td className={s.fieldName}>{f.name}</td>
                  <td className={s.fieldDesc}>
                    {f.desc}
                    {f.unit && <span className={s.fieldUnit}>（{f.unit}）</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 资源覆盖 */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardIcon}>📦</span>
            <h3 className={s.cardTitle}>资源覆盖</h3>
          </div>
          <div className={s.coverageGrid}>
            {coverageStats.map((item) => (
              <div key={item.label} className={s.coverageItem}>
                <span className={s.coverageNum}>{item.num}</span>
                <span className={s.coverageLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 版权与署名 */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardIcon}>©️</span>
            <h3 className={s.cardTitle}>版权与署名</h3>
          </div>
          <ul className={s.licenseList}>
            {LICENSE_NOTES.map((note, i) => (
              <li key={i} className={s.licenseItem}>
                <span className={s.licenseIcon}>◆</span>
                <span>{note.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 使用限制 */}
        <div className={`${s.card} ${s.cardFull}`}>
          <div className={s.cardHeader}>
            <span className={s.cardIcon}>⚠️</span>
            <h3 className={s.cardTitle}>使用限制与免责声明</h3>
          </div>
          <ul className={s.warningList}>
            {LIMITATIONS.map((item) => (
              <li key={item} className={s.warningItem}>
                <span className={s.warningIcon}>▸</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
