import { useState, useEffect } from 'react';
import type { MergedCity } from '../../hooks/useMetroData';
import { withBaseUrl } from '../../utils/path';
import styles from './CitySourceInfo.module.css';

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

function StatusBadge({ type, children }: { type: 'ok' | 'warn' | 'info'; children: React.ReactNode }) {
  return <span className={`${styles.badge} ${styles[`badge-${type}`]}`}>{children}</span>;
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

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>数据来源与署名</h3>
      <div className={styles.grid}>
        {/* 客流统计来源 */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>客流统计来源</div>
          <div className={styles.row}>
            <span className={styles.field}>来源</span>
            <span>
              <a
                href="https://metrodb.org"
                target="_blank"
                rel="noreferrer"
                className={styles.link}
              >
                MetroDB.org
              </a>{' '}
              公开页面
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.field}>日客流数据</span>
            <StatusBadge type={hasRidership ? 'ok' : 'warn'}>
              {hasRidership ? '有客流统计' : '暂无日客流数据'}
            </StatusBadge>
          </div>
          <div className={styles.row}>
            <span className={styles.field}>年度趋势</span>
            <StatusBadge type={hasYearlyTrend ? 'ok' : 'warn'}>
              {hasYearlyTrend ? '有年度趋势数据' : '暂无年度趋势数据'}
            </StatusBadge>
          </div>
        </div>

        {/* 线路图/规划图资源 */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>线路图/规划图资源</div>
          <div className={styles.row}>
            <span className={styles.field}>线路图</span>
            <StatusBadge type={city.has_network_map ? 'ok' : 'warn'}>
              {city.has_network_map ? '已收录' : '暂无线路图'}
            </StatusBadge>
          </div>
          <div className={styles.row}>
            <span className={styles.field}>规划图</span>
            <StatusBadge type={city.has_plan_map ? 'ok' : 'warn'}>
              {city.has_plan_map ? '已收录' : '暂无规划图'}
            </StatusBadge>
          </div>
          <div className={styles.note}>
            线路图/规划图来自本地 cities/ 资源目录，路径由 city_assets_index.json 记录
          </div>
        </div>

        {/* 城市封面图署名 */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>城市封面图署名</div>
          {manifestError ? (
            <div className={styles.note}>封面图署名信息暂不可用</div>
          ) : !manifest ? (
            <div className={styles.note}>加载中...</div>
          ) : coverDownloaded ? (
            <>
              <div className={styles.row}>
                <span className={styles.field}>来源</span>
                <span>
                  {coverItem.source_url ? (
                    <a
                      href={coverItem.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.link}
                    >
                      查看来源
                    </a>
                  ) : (
                    'Wikimedia Commons / Wikidata'
                  )}
                </span>
              </div>
              {coverItem.author && (
                <div className={styles.row}>
                  <span className={styles.field}>作者</span>
                  <span>{coverItem.author}</span>
                </div>
              )}
              {coverItem.license && (
                <div className={styles.row}>
                  <span className={styles.field}>许可</span>
                  <StatusBadge type="info">{coverItem.license}</StatusBadge>
                </div>
              )}
              {coverItem.attribution && (
                <div className={styles.row}>
                  <span className={styles.field}>署名</span>
                  <span>{coverItem.attribution}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className={styles.row}>
                <span className={styles.field}>封面图</span>
                <StatusBadge type="warn">暂无合规封面图</StatusBadge>
              </div>
              {coverItem?.reason && (
                <div className={styles.note}>{coverItem.reason}</div>
              )}
              <div className={styles.note}>
                该城市使用 CSS 渐变色作为封面背景
              </div>
            </>
          )}
        </div>

        {/* 使用限制 */}
        <div className={`${styles.card} ${styles.cardSpan}`}>
          <div className={styles.cardTitle}>使用限制</div>
          <ul className={styles.limitList}>
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
