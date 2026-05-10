import SectionTitle from '../components/common/SectionTitle';
import s from './AboutPage.module.css';

const DATA_SOURCES = [
  {
    pill: '客流统计',
    pillClass: s.pillRidership,
    lines: [
      '来源：MetroDB.org 公开页面',
      '字段通过解析 HTML 内嵌 rollNum() 函数提取',
      '覆盖 34 个城市，日客流量为历史统计值',
    ],
  },
  {
    pill: '线路图/规划图',
    pillClass: s.pillMap,
    lines: [
      '来源：本地 cities/ 资源目录',
      '资源路径由 city_assets_index.json 记录',
      '覆盖 48 个线路图、41 个规划图',
    ],
  },
  {
    pill: '城市封面图',
    pillClass: s.pillCover,
    lines: [
      '来源：Wikimedia Commons / Wikidata',
      '溯源信息记录于 city-covers/manifest.json',
      '许可证：CC0 / CC BY / CC BY-SA',
    ],
  },
  {
    pill: '地图底图',
    pillClass: s.pillGeo,
    lines: [
      '来源：assets/china.json（中国行政区划 GeoJSON）',
      '支持本地 → 远程 CDN → 城市列表三级降级',
    ],
  },
];

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

const COVERAGE_STATS = [
  { num: '50', label: '城市索引' },
  { num: '34', label: '城市客流' },
  { num: '49/50', label: '封面图' },
  { num: '48', label: '线路图' },
  { num: '41', label: '规划图' },
];

const LIMITATIONS = [
  '数据来自公开页面与本地整理，非实时系统',
  '不同城市统计口径可能存在差异',
  '部分城市缺少客流数据或规划图资源',
  '仅供学习、研究和可视化演示使用',
  '不构成官方数据发布或决策依据',
  'daily_ridership_wan ≤ 0 表示暂无当日数据，不代表真实零客流',
];

const LICENSE_NOTES = [
  {
    text: '封面图的 source_url、license、author、attribution 记录于 manifest.json',
  },
  {
    text: 'CC BY / CC BY-SA 授权图片需保留署名信息',
  },
  {
    text: 'CC BY-SA 图片的再分发需遵守相同协议条款',
  },
  {
    text: '线路图/规划图按原始资源说明使用，版权归原网站及制作方所有',
  },
];

export default function AboutPage() {
  return (
    <div className="page-container" style={{ paddingTop: 32, paddingBottom: 40 }}>
      <SectionTitle icon="ⓘ" title="数据说明" />

      <div className={s.hero}>
        <p className={s.heroSubtitle}>
          说明本项目的数据来源、资源来源、字段口径、更新机制与使用限制
        </p>
      </div>

      <div className={s.cardsGrid}>
        {/* 数据来源总览 */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardIcon}>📊</span>
            <h3 className={s.cardTitle}>数据来源总览</h3>
          </div>
          <div className={s.sourceList}>
            {DATA_SOURCES.map((src) => (
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
            {COVERAGE_STATS.map((item) => (
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
