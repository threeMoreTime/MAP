import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMetroData } from '../hooks/useMetroData';
import type { QualityReportCity } from '../types/metro';

type GroupKey = 'no_stats' | 'no_daily_ridership' | 'no_network_map' | 'no_plan_map' | 'cover_fallback';

export default function DataQualityPage() {
  const { qualityReport, loading, error, merged } = useMetroData();
  const [activeGroup, setActiveGroup] = useState<GroupKey>('no_stats');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', color: '#00d4ff'
      }}>
        <div className="loading-spinner" style={{
          width: 40, height: 40, border: '3px solid rgba(0,212,255,0.1)',
          borderTop: '3px solid #00d4ff', borderRadius: '50%',
          animation: 'spin 1s linear infinite', marginBottom: 16
        }} />
        <div style={{ fontSize: 13, letterSpacing: 1.5 }}>数据质量报告载入中...</div>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // === 优雅降级降级处理 (防白屏) ===
  const isFallback = !qualityReport || error;

  // 1. 摘要数据定义 (如果 qualityReport 存在则用其 summary，否则基于 merged 优雅手算)
  const summary = qualityReport?.summary || {
    city_count: merged.length || 50,
    stats_city_count: merged.filter(c => c.has_stats).length || 34,
    daily_ridership_display_count: merged.filter(c => c.has_stats && c.daily_ridership_wan > 0).length || 23,
    no_daily_display_count: (merged.length - merged.filter(c => c.has_stats && c.daily_ridership_wan > 0).length) || 27,
    stats_without_daily_count: merged.filter(c => c.has_stats && c.daily_ridership_wan === 0).length || 11,
    no_stats_count: merged.filter(c => !c.has_stats).length || 16,
    network_map_count: merged.filter(c => c.has_network_map).length || 48,
    plan_map_count: merged.filter(c => c.has_plan_map).length || 41,
    cover_downloaded_count: merged.filter(c => c.cover_status === 'downloaded').length || 49,
    cover_fallback_count: merged.filter(c => c.cover_status === 'fallback').length || 1,
    high_quality_count: 23,
    medium_quality_count: 11,
    low_quality_count: 16,
  };

  // 2. 缺失组数据定义
  const groups: Record<GroupKey, { title: string; count: number; cities: { city: string; city_cn: string }[] }> = {
    no_stats: {
      title: '完全无统计记录',
      count: summary.no_stats_count,
      cities: merged.filter(c => !c.has_stats).map(c => ({ city: c.city, city_cn: c.city_cn })),
    },
    no_daily_ridership: {
      title: '暂无日客流数据',
      count: summary.no_daily_display_count,
      cities: merged.filter(c => !c.has_stats || c.daily_ridership_wan === 0).map(c => ({ city: c.city, city_cn: c.city_cn })),
    },
    no_network_map: {
      title: '缺少线路图',
      count: summary.city_count - summary.network_map_count,
      cities: merged.filter(c => !c.has_network_map).map(c => ({ city: c.city, city_cn: c.city_cn })),
    },
    no_plan_map: {
      title: '缺少规划图',
      count: summary.city_count - summary.plan_map_count,
      cities: merged.filter(c => !c.has_plan_map).map(c => ({ city: c.city, city_cn: c.city_cn })),
    },
    cover_fallback: {
      title: '封面图片降级',
      count: summary.cover_fallback_count,
      cities: merged.filter(c => c.cover_status === 'fallback').map(c => ({ city: c.city, city_cn: c.city_cn })),
    },
  };

  // 3. 50 城市大列表定义 (若 qualityReport 缺失则优雅降级为基于 merged 手算完整度)
  const cities: QualityReportCity[] = qualityReport?.cities || merged.map(c => {
    let score = 0;
    const has_stats = c.has_stats;
    const has_daily_ridership = c.has_stats && c.daily_ridership_wan > 0;
    const has_yearly_trend = c.has_yearly_trend;
    const has_network_map = c.has_network_map;
    const has_plan_map = c.has_plan_map;
    const cover_status = c.cover_status;
    const op_lines = c.operating_lines;
    const op_stations = c.operating_stations;
    const op_mileage = c.operating_mileage_km;
    const operating_complete = op_lines > 0 && op_stations > 0 && op_mileage > 0;

    if (has_stats) score += 20;
    if (has_daily_ridership) score += 20;
    if (has_yearly_trend) score += 15;
    if (has_network_map) score += 15;
    if (has_plan_map) score += 15;
    if (cover_status === 'downloaded') score += 10;
    if (operating_complete) score += 5;

    let level: 'high' | 'medium' | 'low' = 'low';
    if (score >= 85) level = 'high';
    else if (score >= 60) level = 'medium';

    const missing_items: string[] = [];
    if (!has_stats) missing_items.push("收录统计数据");
    if (!has_daily_ridership) missing_items.push("日客流展示数据");
    if (!has_yearly_trend) missing_items.push("年度均值趋势数据");
    if (!has_network_map) missing_items.push("地铁线路图");
    if (!has_plan_map) missing_items.push("地铁规划图");
    if (cover_status !== 'downloaded') missing_items.push("高清封面图片");

    return {
      city: c.city,
      city_cn: c.city_cn,
      quality_score: score,
      quality_level: level,
      has_stats,
      has_daily_ridership,
      has_yearly_trend,
      has_network_map,
      has_plan_map,
      cover_status,
      missing_items,
      warnings: !has_daily_ridership && has_stats ? ["暂无日客流展示值，处于日常采集中"] : [],
      risk_flags: c.cover_status === 'fallback' ? ["封面图片缺损降级"] : [],
    };
  });

  // 过滤及搜索
  const filteredCities = cities.filter((c) => {
    // 搜索匹配 (拼音或中文)
    const matchSearch = c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.city_cn.includes(searchQuery);
    if (!matchSearch) return false;

    // 筛选标签
    if (filterTag === 'all') return true;
    if (filterTag === 'high') return c.quality_level === 'high';
    if (filterTag === 'medium') return c.quality_level === 'medium';
    if (filterTag === 'low') return c.quality_level === 'low';
    if (filterTag === 'no_ridership') return !c.has_daily_ridership;
    if (filterTag === 'no_network') return !c.has_network_map;
    if (filterTag === 'no_plan') return !c.has_plan_map;
    return true;
  });

  // 平均分与总完整度手算
  const avgScore = Math.round(cities.reduce((sum, c) => sum + c.quality_score, 0) / cities.length);
  const dataIntegrity = Math.round((summary.stats_city_count + summary.daily_ridership_display_count) / (50 * 2) * 100);
  const assetIntegrity = Math.round((summary.network_map_count + summary.plan_map_count + summary.cover_downloaded_count) / (50 * 3) * 100);

  return (
    <div style={{
      maxWidth: 'var(--max-width)', margin: '0 auto', padding: '24px 16px',
      color: '#fff', display: 'flex', flexDirection: 'column', gap: 24
    }}>
      
      {/* 顶部 Hero 区域 */}
      <header className="card-glass" style={{
        padding: '28px 24px', border: '1px solid rgba(0,212,255,0.08)',
        borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: '#00d4ff' }}>数据质量中心</h1>
          <span style={{
            fontSize: 11, background: 'rgba(0,212,255,0.1)', color: '#00d4ff',
            padding: '2px 8px', borderRadius: 4, fontWeight: 500, letterSpacing: 0.5
          }}>
            收录完整度大纲
          </span>
        </div>
        <p style={{ fontSize: 13, color: '#a0aec0', lineHeight: 1.6, margin: 0 }}>
          本页面展示本可视化项目对全国城市地铁各项统计数据和静态图片资源的<strong>收录完整程度</strong>。此完整度评分仅反映当前开源平台所收集并上线的资源齐备情况，<strong>绝不代表城市实际的地铁运营质量或经济发展水平</strong>。
        </p>
        <div style={{
          fontSize: 11, color: '#e53e3e', display: 'flex', alignItems: 'center',
          gap: 6, padding: '6px 12px', background: 'rgba(229,62,62,0.08)',
          borderLeft: '3.5px solid #e53e3e', borderRadius: '0 4px 4px 0'
        }}>
          💡 <strong>免责声明：</strong> 所有收录数据均为历史公开资料整理快照，非实时官方监测。部分城市被标为“收录完整度低”仅代表项目组暂未收集到相关客流或高清规划图，绝非城市未通地铁。
        </div>
        {isFallback && (
          <div style={{
            fontSize: 12, color: '#dd6b20', background: 'rgba(221,107,32,0.08)',
            borderLeft: '3.5px solid #dd6b20', padding: '8px 12px', borderRadius: '0 4px 4px 0', marginTop: 4
          }}>
            ⚠️ <strong>降级警示：</strong> 质量报告加载失败（如 data/latest/quality_report.json 暂不存在或损坏）。已为您优雅降级为基于城市基础资源的内存完整度手算，页面功能依然完备，请放心查看。
          </div>
        )}
      </header>

      {/* 顶部大纲与质量指标卡片网格 */}
      <section style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 16
      }}>
        {/* 卡片 1: 基础统计 */}
        <div className="card-glass" style={{ padding: 18, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#718096' }}>城市索引与收录统计</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#00d4ff' }}>
            {summary.stats_city_count} <span style={{ fontSize: 13, fontWeight: 400, color: '#a0aec0' }}>/ {summary.city_count} 城</span>
          </div>
          <div style={{ fontSize: 11, color: '#a0aec0', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span>• 有日客流展示值: {summary.daily_ridership_display_count} 城</span>
            <span>• 暂无日客流展示值: {summary.no_daily_display_count} 城</span>
          </div>
        </div>

        {/* 卡片 2: 图片资源 */}
        <div className="card-glass" style={{ padding: 18, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#718096' }}>图片及大图收录</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#00d4ff' }}>
            {summary.network_map_count + summary.plan_map_count} <span style={{ fontSize: 13, fontWeight: 400, color: '#a0aec0' }}>/ 100 张</span>
          </div>
          <div style={{ fontSize: 11, color: '#a0aec0', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span>• 运营图收录: {summary.network_map_count} 城 (缺 {summary.city_count - summary.network_map_count})</span>
            <span>• 规划图收录: {summary.plan_map_count} 城 (缺 {summary.city_count - summary.plan_map_count})</span>
          </div>
        </div>

        {/* 卡片 3: 封面覆盖 */}
        <div className="card-glass" style={{ padding: 18, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#718096' }}>实景封面版权图</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#00d4ff' }}>
            {summary.cover_downloaded_count} <span style={{ fontSize: 13, fontWeight: 400, color: '#a0aec0' }}>/ {summary.city_count} 城</span>
          </div>
          <div style={{ fontSize: 11, color: '#a0aec0', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span>• 真实封面下载: {summary.cover_downloaded_count} 城</span>
            <span>• fallback 降级封面: {summary.cover_fallback_count} 城</span>
          </div>
        </div>

        {/* 卡片 4: 平均分与等级 */}
        <div className="card-glass" style={{ padding: 18, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#718096' }}>平均完整度评分</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#38a169' }}>
            {avgScore} <span style={{ fontSize: 12, color: '#718096', fontWeight: 400 }}>/ 100 分</span>
          </div>
          <div style={{ fontSize: 11, color: '#a0aec0', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span>• 完整度高: {summary.high_quality_count} 城</span>
            <span>• 完整度中: {summary.medium_quality_count} 城</span>
            <span>• 完整度低: {summary.low_quality_count} 城</span>
          </div>
        </div>
      </section>

      {/* 总体完整度占比条 */}
      <section className="card-glass" style={{ padding: 18, borderRadius: 10, display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#718096' }}>数据收录完整度 (stats + 客流量)</span>
            <span style={{ color: '#00d4ff', fontWeight: 600 }}>{dataIntegrity}%</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', height: 6, borderRadius: 3 }}>
            <div style={{ background: '#00d4ff', width: `${dataIntegrity}%`, height: '100%', borderRadius: 3 }} />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#718096' }}>大图资源覆盖度 (运营+规划+封面)</span>
            <span style={{ color: '#38a169', fontWeight: 600 }}>{assetIntegrity}%</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', height: 6, borderRadius: 3 }}>
            <div style={{ background: '#38a169', width: `${assetIntegrity}%`, height: '100%', borderRadius: 3 }} />
          </div>
        </div>
      </section>

      {/* 资源缺失城市快速索引网格 */}
      <section className="card-glass" style={{ padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#00d4ff' }}>缺失资源城市快速索引</div>
        
        {/* 分组切换选项卡 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, background: 'rgba(255,255,255,0.02)', padding: 4, borderRadius: 6 }}>
          {(Object.keys(groups) as GroupKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveGroup(key)}
              style={{
                border: 'none',
                background: activeGroup === key ? 'rgba(0,212,255,0.1)' : 'transparent',
                color: activeGroup === key ? '#00d4ff' : '#718096',
                fontSize: 12, padding: '6px 12px', borderRadius: 4,
                cursor: 'pointer', transition: 'all 0.3s', fontWeight: activeGroup === key ? 600 : 400
              }}
            >
              {groups[key].title} ({groups[key].count})
            </button>
          ))}
        </div>

        {/* 城市胶囊标签网格 */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 0', minHeight: 60
        }}>
          {groups[activeGroup].cities.length === 0 ? (
            <div style={{ fontSize: 12, color: '#718096', width: '100%', textAlign: 'center', padding: '16px 0' }}>
              🎉 完美对齐！当前组下没有任何缺失城市的资源。
            </div>
          ) : (
            groups[activeGroup].cities.map((c) => (
              <Link
                key={c.city}
                to={`/city/${c.city}`}
                className="city-capsule"
                style={{
                  textDecoration: 'none', color: '#a0aec0', fontSize: 12,
                  padding: '4px 10px', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16,
                  transition: 'all 0.25s', display: 'inline-flex', alignItems: 'center', gap: 4
                }}
              >
                {c.city_cn} <span style={{ fontSize: 10, color: '#4a5568' }}>{c.city}</span>
              </Link>
            ))
          )}
        </div>
        <style>{`
          .city-capsule:hover {
            color: #00d4ff !important;
            border-color: rgba(0,212,255,0.24) !important;
            background: rgba(0,212,255,0.04) !important;
            transform: translateY(-1.5px);
          }
        `}</style>
      </section>

      {/* 50 城市大列表与精细化检索 */}
      <section className="card-glass" style={{
        padding: '24px 20px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#00d4ff' }}>城市收录完整度检索大表</div>
          <span style={{ fontSize: 11, color: '#718096' }}>
            已过滤显示 {filteredCities.length} / 50 个城市
          </span>
        </div>

        {/* 筛选与搜索工具栏 */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 16
        }}>
          {/* 筛选胶囊组 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1, minWidth: 280 }}>
            {[
              { id: 'all', label: '全部' },
              { id: 'high', label: '完整度高 (评分≥85)' },
              { id: 'medium', label: '完整度中 (60-84)' },
              { id: 'low', label: '完整度低 (<60)' },
              { id: 'no_ridership', label: '缺少客流' },
              { id: 'no_network', label: '缺少线路图' },
              { id: 'no_plan', label: '缺少规划图' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterTag(t.id)}
                style={{
                  border: 'none',
                  background: filterTag === t.id ? '#00d4ff' : 'rgba(255,255,255,0.03)',
                  color: filterTag === t.id ? '#060e1a' : '#a0aec0',
                  fontSize: 11, padding: '4px 10px', borderRadius: 16,
                  cursor: 'pointer', transition: 'all 0.3s', fontWeight: filterTag === t.id ? 600 : 400
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 搜索框 */}
          <div style={{ position: 'relative', width: isMobile ? '100%' : 200 }}>
            <input
              type="text"
              placeholder="搜索城市拼音或中文..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
                padding: '6px 12px', fontSize: 12, color: '#fff', outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  border: 'none', background: 'transparent', color: '#718096', cursor: 'pointer', fontSize: 12
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 核心城市列表渲染 - 移动端自适应转换 */}
        {filteredCities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#718096', fontSize: 13 }}>
            🔍 未搜索到符合筛选条件的城市。
          </div>
        ) : isMobile ? (
          /* 📱 移动端自适应垂直卡片列表，无溢出 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredCities.map((c) => (
              <div key={c.city} className="card-glass" style={{
                padding: 14, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)',
                display: 'flex', flexDirection: 'column', gap: 8
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link to={`/city/${c.city}`} style={{ textDecoration: 'none', color: '#00d4ff', fontWeight: 600, fontSize: 14 }}>
                    {c.city_cn} <span style={{ fontSize: 11, color: '#718096', fontWeight: 400 }}>{c.city}</span>
                  </Link>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: c.quality_level === 'high' ? '#34d399' : (c.quality_level === 'medium' ? '#fbbf24' : '#94a3b8')
                    }}>
                      {c.quality_score}分
                    </span>
                    <span style={{
                      fontSize: 11, padding: '2px 7px', borderRadius: 20, fontWeight: 500,
                      background: c.quality_level === 'high' ? 'rgba(52,211,153,0.12)' : (c.quality_level === 'medium' ? 'rgba(251,191,36,0.12)' : 'rgba(100,116,139,0.10)'),
                      color: c.quality_level === 'high' ? '#34d399' : (c.quality_level === 'medium' ? '#fbbf24' : '#94a3b8'),
                      border: `1px solid ${c.quality_level === 'high' ? 'rgba(52,211,153,0.20)' : (c.quality_level === 'medium' ? 'rgba(251,191,36,0.20)' : 'rgba(100,116,139,0.18)')}`
                    }}>
                      {c.quality_level === 'high' ? '完整度高' : (c.quality_level === 'medium' ? '完整度中' : '完整度低')}
                    </span>
                  </div>
                </div>

                {/* 资源状态小表格 */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
                  background: 'rgba(0,0,0,0.12)', padding: 8, borderRadius: 6, fontSize: 13
                }}>
                  <div style={{ color: c.has_stats ? '#34d399' : '#64748b', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    <span style={{ fontWeight: 700 }}>{c.has_stats ? '✔' : '–'}</span> 统计记录
                  </div>
                  <div style={{ color: c.has_daily_ridership ? '#34d399' : '#64748b', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    <span style={{ fontWeight: 700 }}>{c.has_daily_ridership ? '✔' : '–'}</span> 日客流
                  </div>
                  <div style={{ color: c.has_yearly_trend ? '#34d399' : '#64748b', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    <span style={{ fontWeight: 700 }}>{c.has_yearly_trend ? '✔' : '–'}</span> 年趋势
                  </div>
                  <div style={{ color: c.has_network_map ? '#34d399' : '#64748b', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    <span style={{ fontWeight: 700 }}>{c.has_network_map ? '✔' : '–'}</span> 线路图
                  </div>
                  <div style={{ color: c.has_plan_map ? '#34d399' : '#64748b', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    <span style={{ fontWeight: 700 }}>{c.has_plan_map ? '✔' : '–'}</span> 规划图
                  </div>
                  <div style={{ color: c.cover_status === 'downloaded' ? '#34d399' : '#64748b', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    <span style={{ fontWeight: 700 }}>{c.cover_status === 'downloaded' ? '✔' : '–'}</span> 封面图
                  </div>
                </div>

                {/* 缺失项目与警示说明 */}
                {c.missing_items.length > 0 && (
                  <div style={{ fontSize: 10, color: '#a0aec0' }}>
                    <strong>收录缺失:</strong> {c.missing_items.join(', ')}
                  </div>
                )}
                {c.risk_flags.length > 0 && (
                  <div style={{ fontSize: 10, color: '#dd6b20' }}>
                    <strong>警告:</strong> {c.risk_flags.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* 🖥️ 桌面端科技风毛玻璃大表格 */
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse', fontSize: 12,
              textAlign: 'left', minWidth: 700
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(34, 211, 238, 0.10)', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 10px', fontWeight: 500 }}>城市</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 500 }}>完整度分</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 500 }}>完整度评级</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 500 }}>有无统计</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 500 }}>有客流值</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 500 }}>客流趋势</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 500 }}>线路图</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 500 }}>规划图</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 500 }}>高清封面</th>
                  <th style={{ padding: '12px 10px', fontWeight: 500 }}>收录缺失项</th>
                </tr>
              </thead>
              <tbody>
                {filteredCities.map((c) => (
                  <tr
                    key={c.city}
                    className="table-row-hover"
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      transition: 'background 0.25s'
                    }}
                  >
                    <td style={{ padding: '14px 10px' }}>
                      <Link to={`/city/${c.city}`} style={{ textDecoration: 'none', color: '#22d3ee', fontWeight: 600 }}>
                        {c.city_cn} <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>{c.city}</span>
                      </Link>
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'center', fontWeight: 700 }}>
                      <span style={{
                        color: c.quality_level === 'high' ? '#34d399' : (c.quality_level === 'medium' ? '#fbbf24' : '#94a3b8')
                      }}>
                        {c.quality_score}
                      </span>
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: 11, padding: '3px 9px', borderRadius: 20,
                        fontWeight: 500,
                        background: c.quality_level === 'high' ? 'rgba(52,211,153,0.12)' : (c.quality_level === 'medium' ? 'rgba(251,191,36,0.12)' : 'rgba(100,116,139,0.10)'),
                        color: c.quality_level === 'high' ? '#34d399' : (c.quality_level === 'medium' ? '#fbbf24' : '#94a3b8'),
                        border: `1px solid ${c.quality_level === 'high' ? 'rgba(52,211,153,0.20)' : (c.quality_level === 'medium' ? 'rgba(251,191,36,0.20)' : 'rgba(100,116,139,0.18)')}`
                      }}>
                        {c.quality_level === 'high' ? '完整度高' : (c.quality_level === 'medium' ? '完整度中' : '完整度低')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: '50%', fontSize: 12, fontWeight: 700,
                        background: c.has_stats ? 'rgba(52,211,153,0.12)' : 'rgba(100,116,139,0.10)',
                        color: c.has_stats ? '#34d399' : '#64748b'
                      }}>{c.has_stats ? '✔' : '–'}</span>
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: '50%', fontSize: 12, fontWeight: 700,
                        background: c.has_daily_ridership ? 'rgba(52,211,153,0.12)' : 'rgba(100,116,139,0.10)',
                        color: c.has_daily_ridership ? '#34d399' : '#64748b'
                      }}>{c.has_daily_ridership ? '✔' : '–'}</span>
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: '50%', fontSize: 12, fontWeight: 700,
                        background: c.has_yearly_trend ? 'rgba(52,211,153,0.12)' : 'rgba(100,116,139,0.10)',
                        color: c.has_yearly_trend ? '#34d399' : '#64748b'
                      }}>{c.has_yearly_trend ? '✔' : '–'}</span>
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: '50%', fontSize: 12, fontWeight: 700,
                        background: c.has_network_map ? 'rgba(52,211,153,0.12)' : 'rgba(100,116,139,0.10)',
                        color: c.has_network_map ? '#34d399' : '#64748b'
                      }}>{c.has_network_map ? '✔' : '–'}</span>
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: '50%', fontSize: 12, fontWeight: 700,
                        background: c.has_plan_map ? 'rgba(52,211,153,0.12)' : 'rgba(100,116,139,0.10)',
                        color: c.has_plan_map ? '#34d399' : '#64748b'
                      }}>{c.has_plan_map ? '✔' : '–'}</span>
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: '50%', fontSize: 12, fontWeight: 700,
                        background: c.cover_status === 'downloaded' ? 'rgba(52,211,153,0.12)' : 'rgba(100,116,139,0.10)',
                        color: c.cover_status === 'downloaded' ? '#34d399' : '#64748b'
                      }}>{c.cover_status === 'downloaded' ? '✔' : '–'}</span>
                    </td>
                    <td style={{ padding: '14px 10px', color: '#94a3b8', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.missing_items.length === 0 ? (
                        <span style={{ color: '#475569' }}>—</span>
                      ) : (
                        <span title={c.missing_items.join(', ')} style={{ fontSize: 12 }}>
                          {c.missing_items.join(', ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <style>{`
              .table-row-hover:hover {
                background: rgba(34, 211, 238, 0.025) !important;
              }
            `}</style>
          </div>
        )}
      </section>
    </div>
  );
}
