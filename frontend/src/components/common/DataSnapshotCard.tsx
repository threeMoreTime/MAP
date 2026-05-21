import React from 'react';
import type { MergedCity } from '../../hooks/useMetroData';
import type { Manifest } from '../../types/metro';

interface Props {
  cities: MergedCity[];
  manifest: Manifest | null;
}

export default function DataSnapshotCard({ cities, manifest }: Props) {
  const stats = React.useMemo(() => {
    const total = cities.length;
    const hasRidership = cities.filter(c => c.has_stats && c.daily_ridership_wan > 0).length;
    const noRidership = cities.filter(c => !c.has_stats || c.daily_ridership_wan <= 0).length;
    const hasNetworkMap = cities.filter(c => c.has_network_map).length;
    const hasPlanMap = cities.filter(c => c.has_plan_map).length;
    const downloadedCovers = cities.filter(c => c.cover_status === 'downloaded').length;

    return {
      total,
      hasRidership,
      noRidership,
      hasNetworkMap,
      hasPlanMap,
      downloadedCovers,
    };
  }, [cities]);

  if (cities.length === 0) return null;

  return (
    <div 
      className="data-snapshot-card"
      style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.7) 100%)',
        border: '1px solid rgba(51, 65, 85, 0.5)',
        borderRadius: '12px',
        padding: '16px 20px',
        backdropFilter: 'blur(8px)',
        marginBottom: '20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
        paddingBottom: '10px',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>📊</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', letterSpacing: '0.5px' }}>
            MAP 城市数据快照
          </span>
          <span style={{
            fontSize: '10px',
            color: '#94a3b8',
            background: 'rgba(51, 65, 85, 0.4)',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid rgba(71, 85, 105, 0.3)'
          }}>
            公开快照 / 整理中
          </span>
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
          * 统计结果基于本地数据，非实时官方发布
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
        gap: '12px',
      }}>
        <div className="snapshot-item" style={{
          padding: '10px',
          background: 'rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(51, 65, 85, 0.2)',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>城市索引</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
            {stats.total} <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b' }}>城</span>
          </div>
        </div>

        <div className="snapshot-item" style={{
          padding: '10px',
          background: 'rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(51, 65, 85, 0.2)',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>有客流数据</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#34d399', fontFamily: 'monospace' }}>
            {stats.hasRidership} <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b' }}>城</span>
          </div>
        </div>

        <div className="snapshot-item" style={{
          padding: '10px',
          background: 'rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(51, 65, 85, 0.2)',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>暂无日客流</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f43f5e', fontFamily: 'monospace' }}>
            {stats.noRidership} <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b' }}>城</span>
          </div>
        </div>

        <div className="snapshot-item" style={{
          padding: '10px',
          background: 'rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(51, 65, 85, 0.2)',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>运营线路图</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#fbbf24', fontFamily: 'monospace' }}>
            {stats.hasNetworkMap} <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b' }}>城</span>
          </div>
        </div>

        <div className="snapshot-item" style={{
          padding: '10px',
          background: 'rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(51, 65, 85, 0.2)',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>建设规划图</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#a78bfa', fontFamily: 'monospace' }}>
            {stats.hasPlanMap} <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b' }}>城</span>
          </div>
        </div>

        <div className="snapshot-item" style={{
          padding: '10px',
          background: 'rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(51, 65, 85, 0.2)',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>实景封面图</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#fb7185', fontFamily: 'monospace' }}>
            {stats.downloadedCovers} <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b' }}>/ {stats.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
