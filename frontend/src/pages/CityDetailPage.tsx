import { useState, useMemo, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMetroData } from '../hooks/useMetroData';
import type { MergedCity } from '../hooks/useMetroData';
import CityTrendAreaChart from '../components/charts/CityTrendAreaChart';
import CityAssetPreview from '../components/city/CityAssetPreview';
import CitySourceInfo from '../components/city/CitySourceInfo';
import EmptyState from '../components/common/EmptyState';
import styles from './CityDetailPage.module.css';

const CITY_DESCRIPTIONS: Record<string, string> = {
  beijing: '首都轨道交通网络，全国规模最大的地铁系统',
  shanghai: '国际大都市轨道交通，全球里程最长的城市地铁之一',
  guangzhou: '华南核心城市轨道交通网络，粤港澳大湾区交通枢纽',
  shenzhen: '经济特区的现代化轨道交通系统',
  chengdu: '西南中心城市轨道交通网络',
  chongqing: '山城特色轨道交通，跨江穿楼的立体交通系统',
  wuhan: '九省通衢的轨道交通网络，中部枢纽城市',
  hangzhou: '数字经济之都的轨道交通网络',
  nanjing: '六朝古都的轨道交通网络',
  tianjin: '北方港口城市的轨道交通网络',
  xiamen: '滨海城市的轨道交通网络',
  suzhou: '园林城市的轨道交通网络',
  xian: '千年古都的轨道交通网络',
  changsha: '星城轨道交通网络',
  zhengzhou: '中原枢纽城市轨道交通网络',
  kunming: '春城轨道交通网络',
  qingdao: '海滨城市轨道交通网络',
  dalian: '北方滨海城市轨道交通网络',
  ningbo: '东海之滨城市轨道交通网络',
  shenyang: '东北中心城市轨道交通网络',
  harbin: '冰城轨道交通网络',
  changchun: '北国春城轨道交通网络',
  shijiazhuang: '燕赵大地轨道交通网络',
  taiyuan: '三晋大地轨道交通网络',
  hefei: '科教名城轨道交通网络',
  nanchang: '英雄城轨道交通网络',
  fuzhou: '榕城轨道交通网络',
  nanning: '绿城轨道交通网络',
  guiyang: '林城轨道交通网络',
  lanzhou: '黄河之滨城市轨道交通网络',
  urumqi: '西域明珠轨道交通网络',
  hohhot: '草原都市轨道交通网络',
  jinan: '泉城轨道交通网络',
  hongkong: '东方之珠轨道交通网络，港铁系统',
  taipei: '宝岛核心城市轨道交通网络',
  kaohsiung: '台湾南部港口城市轨道交通网络',
  taichung: '台湾中部城市轨道交通网络',
  macau: '澳门轻轨系统',
  wuxi: '太湖明珠轨道交通网络',
  foshan: '岭南制造业重镇轨道交通网络',
  dongguan: '世界工厂轨道交通网络',
  changzhou: '龙城轨道交通网络',
  xuzhou: '淮海经济区中心城市轨道交通网络',
  wenzhou: '瓯越之城轨道交通网络',
  nantong: '江海交汇之城轨道交通网络',
  luoyang: '千年帝都轨道交通网络',
  shaoxing: '越国故地轨道交通网络',
  jinhua: '婺州之城轨道交通网络',
  taizhou: '山海之城轨道交通网络',
  wuhu: '江城轨道交通网络',
};

const CITY_EN_NAMES: Record<string, string> = {
  beijing: 'Beijing',
  shanghai: 'Shanghai',
  guangzhou: 'Guangzhou',
  shenzhen: 'Shenzhen',
  chengdu: 'Chengdu',
  chongqing: 'Chongqing',
  wuhan: 'Wuhan',
  hangzhou: 'Hangzhou',
  nanjing: 'Nanjing',
  tianjin: 'Tianjin',
  xiamen: 'Xiamen',
  suzhou: 'Suzhou',
  xian: "Xi'an",
  changsha: 'Changsha',
  zhengzhou: 'Zhengzhou',
  kunming: 'Kunming',
  qingdao: 'Qingdao',
  dalian: 'Dalian',
  ningbo: 'Ningbo',
  shenyang: 'Shenyang',
  harbin: 'Harbin',
  changchun: 'Changchun',
  shijiazhuang: 'Shijiazhuang',
  taiyuan: 'Taiyuan',
  hefei: 'Hefei',
  nanchang: 'Nanchang',
  fuzhou: 'Fuzhou',
  nanning: 'Nanning',
  guiyang: 'Guiyang',
  lanzhou: 'Lanzhou',
  urumqi: 'Urumqi',
  hohhot: 'Hohhot',
  jinan: "Ji'nan",
  hongkong: 'Hong Kong',
  taipei: 'Taipei',
  kaohsiung: 'Kaohsiung',
  taichung: 'Taichung',
  macau: 'Macau',
  wuxi: 'Wuxi',
  foshan: 'Foshan',
  dongguan: 'Dongguan',
  changzhou: 'Changzhou',
  xuzhou: 'Xuzhou',
  wenzhou: 'Wenzhou',
  nantong: 'Nantong',
  luoyang: 'Luoyang',
  shaoxing: 'Shaoxing',
  jinhua: 'Jinhua',
  taizhou: 'Taizhou',
  wuhu: 'Wuhu',
};

function formatDaily(d: MergedCity): string {
  return d.daily_ridership_wan > 0 ? `${d.daily_ridership_wan.toFixed(1)}` : '--';
}

function formatIntensity(d: MergedCity): string {
  return d.ridership_intensity > 0 ? d.ridership_intensity.toFixed(2) : '--';
}

function formatPeak(d: MergedCity): string {
  return d.peak_ridership_wan > 0 ? `${d.peak_ridership_wan.toFixed(1)}` : '--';
}

function CityDataNote({ city }: { city: MergedCity }) {
  const [open, setOpen] = useState(false);
  const hasValidRidership = city.daily_ridership_wan > 0;

  return (
    <div className={styles.noteCard}>
      <button
        className={styles.noteToggle}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>数据说明</span>
        <span className={`${styles.noteArrow} ${open ? styles.noteArrowOpen : ''}`}>▾</span>
      </button>
      {open && (
        <div className={styles.noteContent}>
          <ul>
            <li>日客流量数据来源于公开数据页面，统计口径可能因城市与来源页面不同存在差异。</li>
            <li>客流强度 = 日客流量 / 运营里程，用于粗略比较单位里程承载客流能力。</li>
            <li>峰值客流为该城市历史最高单日客流量记录，具体口径以数据来源页面为准。</li>
          </ul>
          {!hasValidRidership && (
            <div className={styles.noteWarning}>
              该城市暂无当日客流统计数据，页面仅展示基础运营信息和资源状态。
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { merged, loading, error } = useMetroData();
  const sourceInfoRef = useRef<HTMLDivElement>(null);

  const city = useMemo(
    () => merged.find((c) => c.city === id) ?? null,
    [merged, id],
  );

  const yearly = city?.stats?.yearly_avg_ridership;
  const yearRange = yearly && yearly.years.length > 0
    ? `${yearly.years[0]}-${yearly.years[yearly.years.length - 1]}`
    : '';

  const scrollToSource = useCallback(() => {
    sourceInfoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (loading) return <div className="state-message state-message--loading">加载数据中...</div>;
  if (error) return <div className="state-message state-message--error">加载失败：{error}</div>;

  if (!city) {
    return (
      <div className="page-container city-detail-page">
        <EmptyState icon="🔍" title="未找到城市" description={`未找到城市 "${id}" 的数据`} />
      </div>
    );
  }

  const cityEn = CITY_EN_NAMES[city.city] || city.city;
  const cityDesc = CITY_DESCRIPTIONS[city.city] || `${city.city_cn}城市轨道交通网络`;
  const hasRidership = city.daily_ridership_wan > 0;
  const hasNetworkMap = city.has_network_map;
  const hasPlanMap = city.has_plan_map;
  const hasYearlyTrend = !!(yearly && yearly.years.length > 0);
  const allResourcesAvailable = hasNetworkMap && hasPlanMap && hasRidership;

  const currentMapType = hasNetworkMap ? '线路图' : hasPlanMap ? '规划图' : null;
  const currentMapPath = hasNetworkMap ? city.network_map_path : hasPlanMap ? city.plan_map_path : null;

  return (
    <div className={styles.detailPage}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link to="/">首页</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <Link to="/cities">城市资源</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>{city.city_cn}地铁</span>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{city.city_cn}地铁</h1>
          <p className={styles.heroEn}>{cityEn} Metro</p>
          <p className={styles.heroDesc}>{cityDesc}</p>
          <div className={styles.heroPills}>
            <span className={`${styles.pill} ${styles.pillOperating}`}>运营中</span>
            <span className={`${styles.pill} ${styles.pillLines}`}>
              {city.operating_lines} 条线路
            </span>
            <span className={`${styles.pill} ${styles.pillData}`}>
              {city.operating_stations} 座站点
            </span>
            {hasRidership ? (
              <span className={`${styles.pill} ${styles.pillData}`}>有客流数据</span>
            ) : (
              <span className={`${styles.pill} ${styles.pillWarning}`}>暂无客流</span>
            )}
          </div>
        </div>
      </section>

      {/* 6 Metrics Cards */}
      <section className={styles.metricsGrid} data-testid="metrics-grid">
        <div className={styles.metricCard}>
          <span className={styles.metricIcon}>🛤️</span>
          <div className={styles.metricValue}>
            {city.operating_lines}<span className={styles.metricUnit}>条</span>
          </div>
          <div className={styles.metricLabel}>运营线路</div>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricIcon}>🏪</span>
          <div className={styles.metricValue}>
            {city.operating_stations}<span className={styles.metricUnit}>座</span>
          </div>
          <div className={styles.metricLabel}>运营站点</div>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricIcon}>📏</span>
          <div className={styles.metricValue}>
            {city.operating_mileage_km}<span className={styles.metricUnit}>公里</span>
          </div>
          <div className={styles.metricLabel}>运营里程</div>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricIcon}>👥</span>
          <div className={styles.metricValue}>
            {formatDaily(city)}
            {hasRidership && <span className={styles.metricUnit}>万人次</span>}
          </div>
          <div className={styles.metricLabel}>日客流量</div>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricIcon}>📊</span>
          <div className={styles.metricValue}>{formatIntensity(city)}</div>
          <div className={styles.metricLabel}>客流强度</div>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricIcon}>📈</span>
          <div className={styles.metricValue}>
            {formatPeak(city)}
            {city.peak_ridership_wan > 0 && <span className={styles.metricUnit}>万人次</span>}
          </div>
          <div className={styles.metricLabel}>峰值客流</div>
        </div>
      </section>

      {/* Main Content — 2 Column */}
      <section className={styles.mainContent}>
        {/* Left: Map Viewer */}
        <div className={styles.mapSection}>
          <h2 className={styles.mapSectionTitle}>线路网络</h2>
          <CityAssetPreview city={city} />
        </div>

        {/* Right: Info Panel */}
        <div className={styles.infoPanel}>
          {/* Resource Status */}
          <div className={styles.infoCard} data-testid="resource-status">
            <h4 className={styles.infoCardTitle}>资源状态</h4>
            <div className={allResourcesAvailable ? `${styles.overallStatus} ${styles.overallOk}` : `${styles.overallStatus} ${styles.overallPartial}`}>
              {allResourcesAvailable ? '✓ 资源完整可用' : '⚠ 部分资源缺失'}
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoField}>线路图</span>
              <span className={hasNetworkMap ? styles.statusOk : styles.statusNo}>
                {hasNetworkMap ? '✓ 已收录' : '✗ 暂无'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoField}>规划图</span>
              <span className={hasPlanMap ? styles.statusOk : styles.statusNo}>
                {hasPlanMap ? '✓ 已收录' : '✗ 暂无'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoField}>客流数据</span>
              <span className={hasRidership ? styles.statusOk : styles.statusNo}>
                {hasRidership ? '✓ 有数据' : '✗ 暂无'}
              </span>
            </div>
          </div>

          {/* Usage Tips */}
          <div className={styles.infoCard} data-testid="usage-tips">
            <h4 className={styles.infoCardTitle}>使用提示</h4>
            <div className={styles.tipItem}>
              <span className={styles.tipKey}>滚轮</span>
              <span>以当前图中心缩放</span>
            </div>
            <div className={styles.tipItem}>
              <span className={styles.tipKey}>拖拽</span>
              <span>按住左键移动地图</span>
            </div>
            <div className={styles.tipItem}>
              <span className={styles.tipKey}>单击</span>
              <span>放大一档</span>
            </div>
            <div className={styles.tipItem}>
              <span className={styles.tipKey}>全屏</span>
              <span>获得更大查看区域</span>
            </div>
          </div>

          {/* Current Resource Info */}
          <div className={styles.infoCard} data-testid="current-resource-info">
            <h4 className={styles.infoCardTitle}>当前资源信息</h4>
            <div className={styles.infoRow}>
              <span className={styles.infoField}>图名</span>
              <span className={styles.infoValue}>
                {currentMapType ? `${city.city_cn}地铁${currentMapType}` : '--'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoField}>类型</span>
              <span className={styles.infoValue}>{currentMapType || '--'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoField}>路径</span>
              <span className={styles.infoValue} style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                {currentMapPath || '--'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoField}>来源</span>
              <span className={styles.infoValue}>本地资源目录</span>
            </div>
            <button className={styles.resourceLink} onClick={scrollToSource}>
              查看资源详情 ↓
            </button>
          </div>
        </div>
      </section>

      {/* Bottom Section — 2 Column */}
      <section className={styles.bottomSection}>
        {/* Left: Trend Chart */}
        <div className={styles.trendSection}>
          <div className={styles.trendHeader}>
            <h2 className={styles.trendTitle}>年度客流趋势</h2>
            {yearRange && <span className={styles.trendRange}>{yearRange}</span>}
          </div>
          {yearly && yearly.years.length > 0 ? (
            <CityTrendAreaChart yearly={yearly} />
          ) : (
            <EmptyState icon="📊" title="该城市暂无客流趋势数据" description="仅展示基础运营信息" />
          )}
        </div>

        {/* Right: Source Info */}
        <div className={styles.sourceSection} ref={sourceInfoRef}>
          <h2 className={styles.sourceTitle}>数据来源</h2>
          <CitySourceInfo city={city} />
        </div>
      </section>

      {/* Data Note */}
      <CityDataNote city={city} />
    </div>
  );
}
