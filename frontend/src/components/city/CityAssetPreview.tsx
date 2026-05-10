import { useState } from 'react';
import type { MergedCity } from '../../hooks/useMetroData';
import { withBaseUrl } from '../../utils/path';
import EmptyState from '../common/EmptyState';
import styles from './CityAssetPreview.module.css';

interface Props {
  city: MergedCity;
}

type TabKey = 'network' | 'plan';

function getActiveData(city: MergedCity, tab: TabKey) {
  if (tab === 'network') {
    return { has: city.has_network_map, mapPath: city.network_map_path, label: '线路图' };
  }
  return { has: city.has_plan_map, mapPath: city.plan_map_path, label: '规划图' };
}

export default function CityAssetPreview({ city }: Props) {
  const defaultTab: TabKey = city.has_network_map ? 'network' : city.has_plan_map ? 'plan' : 'network';
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  const [imageError, setImageError] = useState(false);

  const { has, mapPath, label } = getActiveData(city, activeTab);
  const imageUrl = has && mapPath ? withBaseUrl(mapPath) : null;
  const alt = `${city.city_cn}${label}`;

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setImageError(false);
  };

  const hasRealImage = has && imageUrl && !imageError;

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'network' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('network')}
        >
          线路图
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'plan' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('plan')}
        >
          规划图
        </button>
      </div>
      <div className={styles.content}>
        {hasRealImage ? (
          <div className={styles.imageArea}>
            <img
              src={imageUrl}
              alt={alt}
              loading="lazy"
              decoding="async"
              className={styles.image}
              onError={() => setImageError(true)}
            />
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.viewOriginal}
            >
              查看原图
            </a>
          </div>
        ) : (
          <div className={styles.empty}>
            <EmptyState
              icon="📁"
              title={`${label}资源正在收集整理中`}
              description={`暂无${label}资源`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
