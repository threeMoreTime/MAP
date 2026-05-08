import SectionTitle from '../components/common/SectionTitle';

interface AboutCardData {
  title: string;
  items: string[];
  extra?: React.ReactNode;
}

const CARDS: AboutCardData[] = [
  {
    title: '数据来源',
    items: [
      '客流数据来源于 MetroDB.org 公开数据页面',
      '线路图和规划图来源于 MetroMan.cn 公开资源',
      '覆盖 34 个有客流数据的城市，50 个城市线路资源',
      '日客流量为历史统计值（万人次），非实时数据',
    ],
  },
  {
    title: '字段说明',
    items: [],
    extra: (
      <dl style={{ margin: 0 }}>
        {[
          ['日客流量（万）', '统计日期当日全线网进站客流总量'],
          ['运营里程（km）', '已开通运营线路的总里程'],
          ['运营站点（座）', '已开通运营的车站数量'],
          ['客流强度', '日客流量 / 运营里程（万/km）'],
          ['历史最高', '单日客流量最高纪录'],
          ['daily_ridership_wan <= 0', '表示暂无当日客流数据，不代表真实零客流'],
        ].map(([dt, dd]) => (
          <div key={dt as string} style={{ marginBottom: 6 }}>
            <dt style={{ color: '#7aa0c0', fontSize: 12, fontWeight: 600 }}>{dt}</dt>
            <dd style={{ color: '#4a6a8a', fontSize: 11, marginLeft: 0 }}>{dd}</dd>
          </div>
        ))}
      </dl>
    ),
  },
  {
    title: '更新机制',
    items: [
      '数据通过 Python 爬虫脚本定期采集',
      '客流数据采集自 MetroDB.org，线路图采集自 MetroMan.cn',
      '数据为历史快照，更新频率取决于数据源发布',
      '本地数据索引由 scripts/build_data_index.py 生成',
    ],
  },
  {
    title: '已知限制',
    items: [
      '部分城市暂无日客流数据（标注"暂无数据"）',
      '客流强度为计算值，仅在有日客流时有效',
      '地图数据依赖 GeoJSON，离线需本地文件',
      '佛山、绍兴暂无线路图和规划图资源',
    ],
  },
  {
    title: '免责声明',
    items: [
      '本平台数据仅供学习研究使用，不构成正式决策依据',
      '数据来源于公开页面，准确性取决于数据源',
      '客流数据为历史快照，不代表当前实际情况',
      '使用本平台数据所产生的一切后果由使用者自行承担',
    ],
  },
];

function AboutCard({ data }: { data: AboutCardData }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(8,22,48,0.7), rgba(12,30,58,0.5))',
      border: '1px solid rgba(0,150,220,0.08)', borderRadius: 'var(--radius)',
      padding: 20,
    }}>
      <h3 style={{
        fontSize: 14, color: '#00b8ff', marginBottom: 10, fontWeight: 500,
        paddingLeft: 10, borderLeft: '3px solid #00b8ff',
      }}>
        {data.title}
      </h3>
      {data.items.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {data.items.map((item) => (
            <li key={item} style={{ fontSize: 12, color: '#5a7a9a', lineHeight: 1.8 }}>
              <span style={{ color: '#00b8ff', marginRight: 8 }}>›</span>
              {item}
            </li>
          ))}
        </ul>
      )}
      {data.extra}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="page-container" style={{ paddingTop: 32, paddingBottom: 40 }}>
      <SectionTitle icon="ⓘ" title="数据说明" />
      <p style={{ color: '#5a7a9a', fontSize: 13, marginBottom: 20, marginTop: -12 }}>
        了解本平台的数据来源、字段含义与使用须知
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 16,
      }}>
        {CARDS.map((card) => (
          <AboutCard key={card.title} data={card} />
        ))}
      </div>
    </div>
  );
}
