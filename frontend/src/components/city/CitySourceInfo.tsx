import { useState, useEffect } from 'react';
import type { MergedCity } from '../../hooks/useMetroData';
import { withBaseUrl } from '../../utils/path';

interface Props {
  city: MergedCity;
}

type CoverManifestItem = {
  city: string;
  file: string | null;
  status: string;
  source_url?: string;
  image_url?: string;
  license?: string;
  author?: string;
  attribution?: string;
  reason?: string;
};

type CoverManifest = {
  generated_at?: string;
  source?: string;
  items: CoverManifestItem[];
};

const BADGE: Record<'ok' | 'warn' | 'info', string> = {
  ok: 'border-jade-600/25 bg-jade-600/10 text-jade-600',
  warn: 'border-gold-600/25 bg-gold-600/10 text-gold-600',
  info: 'border-paper-300 bg-paper-200/60 text-ink-500',
};

function StatusBadge({ type, children }: { type: 'ok' | 'warn' | 'info'; children: React.ReactNode }) {
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] leading-5 ${BADGE[type]}`}>{children}</span>;
}

export default function CitySourceInfo({ city }: Props) {
  const [manifest, setManifest] = useState<CoverManifest | null>(null);
  const [manifestError, setManifestError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(withBaseUrl('assets/city-covers/manifest.json'))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: CoverManifest) => {
        if (!cancelled) setManifest(data);
      })
      .catch(() => {
        if (!cancelled) setManifestError(true);
      });
    return () => { cancelled = true; };
  }, []);

  const coverItem = manifest?.items.find((item) => item.city === city.city);
  const hasRidership = city.daily_ridership_wan > 0;
  const hasYearlyTrend = city.stats?.yearly_avg_ridership && city.stats.yearly_avg_ridership.years.length > 0;
  const coverDownloaded = coverItem?.status === 'downloaded';

  const rowCls = 'flex items-center justify-between gap-3 border-b border-[rgba(33,29,22,0.06)] py-2 text-[12px]';
  const fieldCls = 'shrink-0 text-ink-500';
  const cardCls = 'rounded-md bg-paper-50 p-3';
  const cardTitleCls = 'mb-1 font-serif text-[13px] font-semibold text-ink-900';
  const noteCls = 'mt-1.5 text-[11px] leading-relaxed text-ink-400';
  const linkCls = 'text-vermilion-500 underline-offset-2 hover:underline';

  return (
    <div>
      <h3 className="sr-only">数据来源与署名</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* 客流统计来源 */}
        <div className={cardCls}>
          <div className={cardTitleCls}>客流统计来源</div>
          <div className={rowCls}>
            <span className={fieldCls}>来源</span>
            <span>
              <a
                href="https://metrodb.org"
                target="_blank"
                rel="noreferrer"
                className={linkCls}
              >
                MetroDB.org
              </a>{' '}
              公开页面
            </span>
          </div>
          <div className={rowCls}>
            <span className={fieldCls}>日客流数据</span>
            <StatusBadge type={hasRidership ? 'ok' : 'warn'}>
              {hasRidership ? '有客流统计' : '暂无日客流数据'}
            </StatusBadge>
          </div>
          <div className={rowCls}>
            <span className={fieldCls}>年度趋势</span>
            <StatusBadge type={hasYearlyTrend ? 'ok' : 'warn'}>
              {hasYearlyTrend ? '有年度趋势数据' : '暂无年度趋势数据'}
            </StatusBadge>
          </div>
        </div>

        {/* 线路图/规划图资源 */}
        <div className={cardCls}>
          <div className={cardTitleCls}>线路图/规划图资源</div>
          <div className={rowCls}>
            <span className={fieldCls}>线路图</span>
            <StatusBadge type={city.has_network_map ? 'ok' : 'warn'}>
              {city.has_network_map ? '已收录' : '暂无线路图'}
            </StatusBadge>
          </div>
          <div className={rowCls}>
            <span className={fieldCls}>规划图</span>
            <StatusBadge type={city.has_plan_map ? 'ok' : 'warn'}>
              {city.has_plan_map ? '已收录' : '暂无规划图'}
            </StatusBadge>
          </div>
          <div className={noteCls}>
            线路图/规划图来自本地 cities/ 资源目录，路径由 city_assets_index.json 记录
          </div>
        </div>

        {/* 城市封面图署名 */}
        <div className={cardCls}>
          <div className={cardTitleCls}>城市封面图署名</div>
          {manifestError ? (
            <div className={noteCls}>封面图署名信息暂不可用</div>
          ) : !manifest ? (
            <div className={noteCls}>加载中...</div>
          ) : coverDownloaded ? (
            <>
              <div className={rowCls}>
                <span className={fieldCls}>来源</span>
                <span>
                  {coverItem.source_url ? (
                    <a
                      href={coverItem.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className={linkCls}
                    >
                      查看来源
                    </a>
                  ) : (
                    'Wikimedia Commons / Wikidata'
                  )}
                </span>
              </div>
              {coverItem.author && (
                <div className={rowCls}>
                  <span className={fieldCls}>作者</span>
                  <span className="text-ink-900">{coverItem.author}</span>
                </div>
              )}
              {coverItem.license && (
                <div className={rowCls}>
                  <span className={fieldCls}>许可</span>
                  <StatusBadge type="info">{coverItem.license}</StatusBadge>
                </div>
              )}
              {coverItem.attribution && coverItem.attribution !== coverItem.author && (
                <div className={rowCls}>
                  <span className={fieldCls}>署名</span>
                  <span className="text-ink-900">{coverItem.attribution}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className={rowCls}>
                <span className={fieldCls}>封面图</span>
                <StatusBadge type="warn">暂无合规封面图</StatusBadge>
              </div>
              {coverItem?.reason && (
                <div className={noteCls}>{coverItem.reason}</div>
              )}
              <div className={noteCls}>
                该城市使用 CSS 渐变色作为封面背景
              </div>
            </>
          )}
        </div>

        {/* 使用限制 */}
        <div className={`${cardCls} sm:col-span-2`}>
          <div className={cardTitleCls}>使用限制</div>
          <ul className="ml-5 list-disc space-y-1 text-[12px] leading-relaxed text-ink-700">
            <li>数据来自公开页面和本地整理，仅供参考</li>
            <li>统计口径可能存在差异，具体以数据来源页面为准</li>
            <li>仅供学习、研究和可视化演示</li>
            <li>不构成官方数据发布或决策依据</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
