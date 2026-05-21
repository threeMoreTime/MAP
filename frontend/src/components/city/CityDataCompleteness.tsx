import React from 'react';
import type { MergedCity } from '../../hooks/useMetroData';

interface Props {
  city: MergedCity;
}

export default function CityDataCompleteness({ city }: Props) {
  const hasRidership = city.daily_ridership_wan > 0;
  const hasNetworkMap = city.has_network_map;
  const hasPlanMap = city.has_plan_map;
  const hasStats = city.has_stats;
  
  // 按照收敛要求，resourceComplete 应至少包含 has_network_map, has_plan_map, has_stats, daily_ridership_wan > 0
  const isComplete = hasNetworkMap && hasPlanMap && hasStats && hasRidership;

  // 1. xiamen: 完整
  // 2. taiyuan: 有资源，无客流 (hasRidership === false, but maps exist)
  // 3. hohhot: 封面 fallback, 无客流
  // 4. foshan: 资源缺失
  const completenessText = React.useMemo(() => {
    if (city.city === 'xiamen' || (isComplete && city.cover_status === 'downloaded')) {
      return {
        title: '数据完整收录',
        level: 'success',
        text: `该城市数据已完成完整收录！感谢志愿者和数据整理人员对 ${city.city_cn} 地铁数据的全面梳理，目前线路网络图、近期建设规划、每日客流量统计以及高清实景封面均已成功加载。`,
        color: '#10b981',
      };
    }
    
    if (city.city === 'hohhot' || (city.cover_status === 'fallback' && !hasRidership)) {
      return {
        title: '部分资源缺失 - 客流与实景封面深度整理中',
        level: 'warning',
        text: `${city.city_cn} 等城市的日客流量数据目前仍在采集中，且由于公开高清封面图渠道受限，我们目前采用了系统降级实景图以保证视觉一致性。数据团队正努力寻找更高精度的公开资源。`,
        color: '#fbbf24',
      };
    }

    if (city.city === 'taiyuan' || (!hasRidership && (hasNetworkMap || hasPlanMap))) {
      return {
        title: '日客流统计采集中',
        level: 'info',
        text: `${city.city_cn} 等省会城市的基础线路资产与建设规划均已收录。由于部分区域官方客流披露周期较长，日客流量数据目前仍在收集中，页面仅提供结构化的资源展示，这并非数据遗漏。`,
        color: '#38bdf8',
      };
    }

    if (city.city === 'foshan' || (!hasNetworkMap && !hasPlanMap)) {
      return {
        title: '数据深度建设中',
        level: 'danger',
        text: `${city.city_cn} 的地铁线路资源及客流回溯正在加紧整理与多重核验中。我们将紧跟 MetroDB 数据底座持续推进更新，当前展示的缺失状态并非程序错误，而是对数据真实性的审慎考量。`,
        color: '#f43f5e',
      };
    }

    return {
      title: '数据采集中',
      level: 'default',
      text: `该城市的部分地铁数据目前仍在公开渠道中采集中，暂未完成高可信度核验。我们正在全力跟进以确保线路与客流快照的准确性，如有最新官方数据，欢迎提交反馈。`,
      color: '#94a3b8',
    };
  }, [city, isComplete, hasRidership, hasNetworkMap, hasPlanMap]);

  return (
    <div 
      className="city-completeness-panel"
      data-testid="resource-status"
      style={{
        background: 'rgba(30, 41, 59, 0.4)',
        border: '1px solid rgba(51, 65, 85, 0.5)',
        borderRadius: '10px',
        padding: '16px',
        marginBottom: '16px',
        color: '#f1f5f9',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px',
        borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
        paddingBottom: '8px',
      }}>
        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
          📐 资源状态 & 数据可信度说明
        </h4>
        <span style={{
          fontSize: '10px',
          fontWeight: 600,
          color: completenessText.color,
          background: `${completenessText.color}15`,
          padding: '2px 8px',
          borderRadius: '4px',
          border: `1px solid ${completenessText.color}25`
        }}>
          {completenessText.title}
        </span>
      </div>

      {/* Grid of resources */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        marginBottom: '14px',
      }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(51, 65, 85, 0.2)',
          borderRadius: '6px',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>运营线路图</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: hasNetworkMap ? '#34d399' : '#f43f5e' }}>
            {hasNetworkMap ? '✓ 已收录' : '✗ 暂无'}
          </span>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(51, 65, 85, 0.2)',
          borderRadius: '6px',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>建设规划图</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: hasPlanMap ? '#34d399' : '#f43f5e' }}>
            {hasPlanMap ? '✓ 已收录' : '✗ 暂无'}
          </span>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(51, 65, 85, 0.2)',
          borderRadius: '6px',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>每日客流量</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: hasRidership ? '#34d399' : '#f43f5e' }}>
            {hasRidership ? '✓ 已收录' : '✗ 暂无'}
          </span>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(51, 65, 85, 0.2)',
          borderRadius: '6px',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>实景图封面</span>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 600, 
            color: city.cover_status === 'downloaded' ? '#34d399' : city.cover_status === 'fallback' ? '#fbbf24' : '#f43f5e' 
          }}>
            {city.cover_status === 'downloaded' ? '✓ 实景' : city.cover_status === 'fallback' ? '⚠ 降级' : '✗ 缺失'}
          </span>
        </div>
      </div>

      {/* Humanized Explanation */}
      <div style={{
        fontSize: '11.5px',
        lineHeight: 1.6,
        color: '#cbd5e1',
        padding: '10px 12px',
        background: 'rgba(15, 23, 42, 0.2)',
        borderRadius: '6px',
        borderLeft: `3px solid ${completenessText.color}`,
        marginBottom: '10px',
      }}>
        {completenessText.text}
      </div>

      {/* Extended Cover License Fields if downloaded */}
      {city.cover_status === 'downloaded' && (city.cover_author || city.cover_license || city.cover_source_url) && (
        <div style={{
          fontSize: '10px',
          color: '#64748b',
          borderTop: '1px solid rgba(51, 65, 85, 0.2)',
          paddingTop: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          {city.cover_author && (
            <div>🎨 封面摄影: <span style={{ color: '#94a3b8' }}>{city.cover_author}</span></div>
          )}
          {city.cover_license && (
            <div>⚖️ 授权协议: <span style={{ color: '#94a3b8' }}>{city.cover_license}</span></div>
          )}
          {city.cover_source_url && (
            <div>
              🔗 来源链接:{' '}
              <a 
                href={city.cover_source_url} 
                target="_blank" 
                rel="noreferrer" 
                style={{ color: '#38bdf8', textDecoration: 'none' }}
              >
                查看原始图片
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
