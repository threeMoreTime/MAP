import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMetroData } from '../hooks/useMetroData';
import type { MergedCity } from '../hooks/useMetroData';
import CityTrendAreaChart from '../components/charts/CityTrendAreaChart';
import CityAssetPreview from '../components/city/CityAssetPreview';
import CitySourceInfo from '../components/city/CitySourceInfo';
import EmptyState from '../components/common/EmptyState';
import CityDataCompleteness from '../components/city/CityDataCompleteness';

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
    <div className="rounded-lg bg-paper-100 shadow-card">
      <button
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-vermilion-500"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="font-serif text-[14px] font-semibold text-ink-900">数据说明</span>
        <span
          aria-hidden
          className={`text-[12px] text-ink-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >▾</span>
      </button>
      {open && (
        <div className="border-t border-paper-300 px-4 py-3">
          <ul className="ml-5 list-disc space-y-1.5 text-[13px] leading-relaxed text-ink-700">
            <li>日客流量数据来源于公开数据页面，统计口径可能因城市与来源页面不同存在差异。</li>
            <li>客流强度 = 日客流量 / 运营里程，用于粗略比较单位里程承载客流能力。</li>
            <li>峰值客流为该城市历史最高单日客流量记录，具体口径以数据来源页面为准。</li>
          </ul>
          {!hasValidRidership && (
            <div className="mt-2.5 rounded-sm border border-gold-600/25 bg-gold-600/10 px-3 py-2 text-[12px] text-gold-600">
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

  // 查看器当前标签（与 CityAssetPreview 双向同步，驱动"当前资源信息"展示）
  const [viewerTab, setViewerTab] = useState<'network' | 'plan'>('network');
  const viewerTabInitialized = useRef(false);

  const city = useMemo(
    () => merged.find((c) => c.city === id) ?? null,
    [merged, id],
  );

  // 首次数据就绪后对齐查看器的缺省标签（有线路图选线路图，否则规划图）
  useEffect(() => {
    if (city && !viewerTabInitialized.current) {
      viewerTabInitialized.current = true;
      setViewerTab(city.has_network_map ? 'network' : 'plan');
    }
  }, [city]);

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
      <div className="city-detail-page mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6">
        <EmptyState icon="🔍" title="未找到城市" description={`未找到城市 "${id}" 的数据`} />
      </div>
    );
  }

  const cityEn = CITY_EN_NAMES[city.city] || city.city;
  const cityDesc = CITY_DESCRIPTIONS[city.city] || `${city.city_cn}城市轨道交通网络`;
  const hasRidership = city.daily_ridership_wan > 0;

  // 跟随查看器标签派生当前资源信息（修复：切换规划图后信息面板仍显示线路图）
  const activeMapAvailable = viewerTab === 'network' ? city.has_network_map : city.has_plan_map;
  const currentMapType = activeMapAvailable ? (viewerTab === 'network' ? '线路图' : '规划图') : null;
  const currentMapPath = activeMapAvailable
    ? (viewerTab === 'network' ? city.network_map_path : city.plan_map_path)
    : null;

  const pillBase = 'rounded-full border px-2.5 py-0.5 text-[11px]';

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 py-4 text-[12px] text-ink-500" aria-label="面包屑">
        <Link to="/" className="hover:text-vermilion-500">首页</Link>
        <span aria-hidden className="text-ink-300">/</span>
        <Link to="/cities" className="hover:text-vermilion-500">城市资源</Link>
        <span aria-hidden className="text-ink-300">/</span>
        <span className="text-ink-900">{city.city_cn}地铁</span>
      </nav>

      {/* Hero Section */}
      <section className="rounded-lg bg-paper-100 px-5 py-6 shadow-card sm:px-7">
        <div>
          <h1 className="font-serif text-[26px] font-semibold text-ink-900">{city.city_cn}地铁</h1>
          <p className="mt-0.5 text-[12px] tracking-[0.08em] text-ink-400">{cityEn} Metro</p>
          <p className="mt-2 text-[13px] text-ink-500">{cityDesc}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`${pillBase} border-jade-600/25 bg-jade-600/10 text-jade-600`}>运营中</span>
            <span className={`${pillBase} border-paper-300 bg-paper-50 text-ink-700 tabular-nums`}>
              {city.operating_lines} 条线路
            </span>
            <span className={`${pillBase} border-paper-300 bg-paper-50 text-ink-700 tabular-nums`}>
              {city.operating_stations} 座站点
            </span>
            {hasRidership ? (
              <span className={`${pillBase} border-paper-300 bg-paper-50 text-ink-700`}>有客流数据</span>
            ) : (
              <span className={`${pillBase} border-gold-600/25 bg-gold-600/10 text-gold-600`}>暂无客流</span>
            )}
          </div>
        </div>
      </section>

      {/* 6 Metrics Cards */}
      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-testid="metrics-grid">
        {[
          { icon: '🛤️', value: city.operating_lines, unit: '条', label: '运营线路', show: true },
          { icon: '🏪', value: city.operating_stations, unit: '座', label: '运营站点', show: true },
          { icon: '📏', value: city.operating_mileage_km, unit: '公里', label: '运营里程', show: true },
          { icon: '👥', value: formatDaily(city), unit: '万人次', label: '日客流量', show: hasRidership },
          { icon: '📊', value: formatIntensity(city), unit: '', label: '客流强度', show: true },
          { icon: '📈', value: formatPeak(city), unit: '万人次', label: '峰值客流', show: city.peak_ridership_wan > 0 },
        ].map((m) => (
          <div key={m.label} className="flex flex-col items-center justify-center gap-1 rounded-lg bg-paper-100 px-3 py-4 text-center shadow-card">
            <span aria-hidden className="text-[18px] leading-none opacity-80">{m.icon}</span>
            <div className="font-serif text-[24px] font-semibold leading-tight text-ink-900 tabular-nums">
              {m.value}{m.show && m.unit && <span className="ml-0.5 text-[11px] font-normal text-ink-400">{m.unit}</span>}
            </div>
            <div className="text-[11px] text-ink-500">{m.label}</div>
          </div>
        ))}
      </section>

      {/* Main Content — 2 Column */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        {/* Left: Map Viewer */}
        <div className="min-w-0">
          <h2 className="mb-2.5 border-b border-paper-300 pb-2 font-serif text-lg font-semibold text-ink-900">线路网络</h2>
          <CityAssetPreview city={city} initialTab={viewerTab} onTabChange={setViewerTab} />
        </div>

        {/* Right: Info Panel */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* Resource Status */}
          <CityDataCompleteness city={city} />

          {/* Usage Tips */}
          <div className="rounded-lg bg-paper-100 p-4 shadow-card" data-testid="usage-tips">
            <h4 className="mb-2.5 font-serif text-[14px] font-semibold text-ink-900">使用提示</h4>
            {[
              ['滚轮', '以当前图中心缩放'],
              ['拖拽', '按住左键移动地图'],
              ['单击', '放大一档'],
              ['全屏', '获得更大查看区域'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center gap-2.5 py-1 text-[12px] text-ink-700">
                <span className="rounded-sm border border-paper-300 bg-paper-50 px-1.5 py-0.5 font-medium text-ink-900">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>

          {/* Current Resource Info */}
          <div className="rounded-lg bg-paper-100 p-4 shadow-card" data-testid="current-resource-info">
            <h4 className="mb-2.5 font-serif text-[14px] font-semibold text-ink-900">当前资源信息</h4>
            <div className="flex justify-between gap-3 border-b border-[rgba(33,29,22,0.06)] py-2 text-[12px]">
              <span className="shrink-0 text-ink-500">图名</span>
              <span className="text-right text-ink-900">
                {currentMapType ? `${city.city_cn}地铁${currentMapType}` : '--'}
              </span>
            </div>
            <div className="flex justify-between gap-3 border-b border-[rgba(33,29,22,0.06)] py-2 text-[12px]">
              <span className="shrink-0 text-ink-500">类型</span>
              <span className="text-right text-ink-900">{currentMapType || '--'}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-[rgba(33,29,22,0.06)] py-2 text-[12px]">
              <span className="shrink-0 text-ink-500">路径</span>
              <span className="break-all text-right text-[11px] text-ink-700">
                {currentMapPath || '--'}
              </span>
            </div>
            <div className="flex justify-between gap-3 border-b border-[rgba(33,29,22,0.06)] py-2 text-[12px]">
              <span className="shrink-0 text-ink-500">来源</span>
              <span className="text-right text-ink-900">本地资源目录</span>
            </div>
            <button
              className="mt-2 cursor-pointer rounded-sm border border-paper-300 bg-paper-50 px-3 py-1.5 text-[12px] text-vermilion-600 transition-colors duration-200 hover:bg-vermilion-50 hover:border-vermilion-500/40 focus-visible:outline-2 focus-visible:outline-vermilion-500"
              onClick={scrollToSource}
            >
              查看资源详情 ↓
            </button>
          </div>
        </div>
      </section>

      {/* Bottom Section — 2 Column */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: Trend Chart（flex 拉伸与右侧来源卡等高） */}
        <div className="flex flex-col rounded-lg bg-paper-100 p-4 shadow-card">
          <div className="mb-2.5 flex items-baseline justify-between border-b border-paper-300 pb-2">
            <h2 className="font-serif text-lg font-semibold text-ink-900">年度客流趋势</h2>
            {yearRange && <span className="text-[11px] text-ink-400 tabular-nums">{yearRange}</span>}
          </div>
          <div className="min-h-[320px] flex-1">
            {yearly && yearly.years.length > 0 ? (
              <CityTrendAreaChart yearly={yearly} />
            ) : (
              <EmptyState icon="📊" title="该城市暂无客流趋势数据" description="仅展示基础运营信息" />
            )}
          </div>
        </div>

        {/* Right: Source Info */}
        <div className="rounded-lg bg-paper-100 p-4 shadow-card" ref={sourceInfoRef}>
          <h2 className="mb-2.5 border-b border-paper-300 pb-2 font-serif text-lg font-semibold text-ink-900">数据来源</h2>
          <CitySourceInfo city={city} />
        </div>
      </section>

      {/* Data Note */}
      <div className="mt-4">
        <CityDataNote city={city} />
      </div>
    </div>
  );
}
