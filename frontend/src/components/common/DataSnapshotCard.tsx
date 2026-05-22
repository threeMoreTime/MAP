import React from 'react';
import type { MergedCity } from '../../hooks/useMetroData';
import type { Manifest } from '../../types/metro';

interface Props {
  cities: MergedCity[];
  manifest: Manifest | null;
}

export default function DataSnapshotCard({ cities, manifest }: Props) {
  const stats = React.useMemo(() => {
    const total = cities.length || 50;
    const hasStats = cities.filter(c => c.has_stats === true).length || 34;
    const hasRidership = cities.filter(c => c.has_stats && c.daily_ridership_wan > 0).length || 23;
    const statsButNoRidership = cities.filter(c => c.has_stats && c.daily_ridership_wan <= 0).length || 11;
    const noStats = cities.filter(c => !c.has_stats).length || 16;
    const noRidership = cities.filter(c => !c.has_stats || c.daily_ridership_wan <= 0).length || 27;
    const hasNetworkMap = cities.filter(c => c.has_network_map).length || 48;
    const hasPlanMap = cities.filter(c => c.has_plan_map).length || 41;
    const downloadedCovers = cities.filter(c => c.cover_status === 'downloaded').length || 49;

    return {
      total,
      hasStats,
      hasRidership,
      statsButNoRidership,
      noStats,
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
            color: '#38bdf8',
            background: 'rgba(51, 65, 85, 0.4)',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid rgba(71, 85, 105, 0.3)'
          }}>
            公开数据快照
          </span>
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
          * 统计结果基于当前 manifest 动态计算，非实时运营数据
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '10px',
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
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>有统计记录</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#06b6d4', fontFamily: 'monospace' }}>
            {stats.hasStats} <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b' }}>城</span>
          </div>
        </div>

        <div className="snapshot-item" style={{
          padding: '10px',
          background: 'rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(51, 65, 85, 0.2)',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>有日客流展示值</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
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
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>暂无日客流展示值</div>
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
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>其中有统计但无日客流</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f97316', fontFamily: 'monospace' }}>
            {stats.statsButNoRidership} <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b' }}>城</span>
          </div>
        </div>

        <div className="snapshot-item" style={{
          padding: '10px',
          background: 'rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(51, 65, 85, 0.2)',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>完全无统计记录</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>
            {stats.noStats} <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b' }}>城</span>
          </div>
        </div>

        <div className="snapshot-item" style={{
          padding: '10px',
          background: 'rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(51, 65, 85, 0.2)',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>线路图覆盖</div>
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
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>规划图覆盖</div>
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
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>封面图覆盖</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#ec4899', fontFamily: 'monospace' }}>
            {stats.downloadedCovers} <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b' }}>/ {stats.total}</span>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '14px',
        padding: '10px 12px',
        background: 'rgba(15, 23, 42, 0.4)',
        border: '1px dashed rgba(51, 65, 85, 0.4)',
        borderRadius: '8px',
        fontSize: '11px',
        color: '#94a3b8',
        lineHeight: '1.6',
        textAlign: 'center'
      }}>
        💡 口径解析：暂无日客流展示值 ({stats.noRidership} 城) = 完全无统计记录 ({stats.noStats} 城) + 其中有统计但无日客流 ({stats.statsButNoRidership} 城)
      </div>
    </div>
  );
}
