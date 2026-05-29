import { useState, useEffect } from 'react';
import { useCompareCities } from '../hooks/useCompareCities';
import CityCompareSelector from '../components/compare/CityCompareSelector';
import CompareMetricCards from '../components/compare/CompareMetricCards';
import CompareCharts from '../components/compare/CompareCharts';
import CompareQualitySection from '../components/compare/CompareQualitySection';
import CompareTable from '../components/compare/CompareTable';
import CompareEmptyState from '../components/compare/CompareEmptyState';

export default function ComparePage() {
  const {
    allCities, selectedCities, selectedSlugs,
    loading, error, insufficientSelection, maxReached,
    addCity, removeCity,
  } = useCompareCities();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', color: '#00d4ff',
      }}>
        <div className="loading-spinner" style={{
          width: 40, height: 40, border: '3px solid rgba(0,212,255,0.1)',
          borderTop: '3px solid #00d4ff', borderRadius: '50%',
          animation: 'spin 1s linear infinite', marginBottom: 16,
        }} />
        <div style={{ fontSize: 13, letterSpacing: 1.5 }}>城市对比数据载入中...</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        maxWidth: 'var(--max-width)', margin: '0 auto', padding: '24px 16px',
        color: '#fff', display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div className="card-glass" style={{ padding: 24, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: '#e53e3e', marginBottom: 12 }}>数据加载失败</div>
          <div style={{ fontSize: 13, color: '#a0aec0', marginBottom: 16 }}>{error}</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <a href="#/dashboard" style={{ color: '#00d4ff', fontSize: 13 }}>返回数据大屏</a>
            <a href="#/data-quality" style={{ color: '#00d4ff', fontSize: 13 }}>数据质量中心</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 'var(--max-width)', margin: '0 auto', padding: '24px 16px',
      color: '#fff', display: 'flex', flexDirection: 'column', gap: 24,
    }}>
      {/* Hero */}
      <header className="card-glass" style={{
        padding: '28px 24px', border: '1px solid rgba(0,212,255,0.08)',
        borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: '#00d4ff' }}>城市对比</h1>
        <p style={{ fontSize: 13, color: '#a0aec0', lineHeight: 1.6, margin: 0 }}>
          选择 2-5 个城市，横向比较<strong>公开资料整理快照</strong>中的地铁运营指标与数据完整度。
        </p>
        <div style={{
          fontSize: 11, color: '#718096', display: 'flex', alignItems: 'center',
          gap: 6, padding: '6px 12px', background: 'rgba(0,212,255,0.04)',
          borderLeft: '3px solid #00d4ff', borderRadius: '0 4px 4px 0',
        }}>
          💡 本页面展示的是项目收录数据完整度与公开资料整理结果，<strong>非实时运营数据，不构成官方排名</strong>。
        </div>
      </header>

      {/* City selector */}
      <section className="card-glass" style={{
        padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#00d4ff' }}>选择对比城市</div>
        <CityCompareSelector
          allCities={allCities}
          selectedSlugs={selectedSlugs}
          maxReached={maxReached}
          onAdd={addCity}
          onRemove={removeCity}
        />
      </section>

      {/* Main content */}
      {insufficientSelection ? (
        <CompareEmptyState />
      ) : (
        <>
          <CompareMetricCards cities={selectedCities} isMobile={isMobile} />
          <CompareCharts cities={selectedCities} />
          <CompareQualitySection cities={selectedCities} isMobile={isMobile} />
          <CompareTable cities={selectedCities} isMobile={isMobile} />
        </>
      )}
    </div>
  );
}
