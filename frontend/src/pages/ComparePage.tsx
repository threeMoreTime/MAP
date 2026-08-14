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
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-ink-500">
        <div
          className="loading-spinner size-10 rounded-full border-[3px] border-paper-200 border-t-vermilion-500 motion-safe:animate-[spin_1s_linear_infinite]"
        />
        <div className="text-[13px]">城市对比数据载入中...</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-4 py-6 text-ink-900 sm:px-6">
        <div className="rounded-lg bg-paper-100 p-6 text-center shadow-card">
          <div className="mb-3 text-[15px] font-semibold text-vermilion-600">数据加载失败</div>
          <div className="mb-4 text-[13px] text-ink-500">{error}</div>
          <div className="flex justify-center gap-6">
            <a href="#/dashboard" className="text-[13px] text-vermilion-500 underline-offset-4 hover:underline">返回数据大屏</a>
            <a href="#/data-quality" className="text-[13px] text-vermilion-500 underline-offset-4 hover:underline">数据质量中心</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-6 text-ink-900 sm:px-6">
      {/* Hero */}
      <header className="flex flex-col gap-2.5 rounded-lg bg-paper-100 p-5 shadow-card sm:p-7">
        <h1 className="m-0 font-serif text-[22px] font-semibold text-ink-900">城市对比</h1>
        <p className="m-0 text-[13px] leading-relaxed text-ink-500">
          选择 2-5 个城市，横向比较<strong>公开资料整理快照</strong>中的地铁运营指标与数据完整度。
        </p>
        <div className="flex items-center gap-2 rounded-sm bg-paper-200/60 px-3 py-1.5 text-[11px] text-ink-500">
          💡 本页面展示的是项目收录数据完整度与公开资料整理结果，<strong>非实时运营数据，不构成官方排名</strong>。
        </div>
      </header>

      {/* City selector */}
      <section className="flex flex-col gap-3.5 rounded-lg bg-paper-100 p-5 shadow-card">
        <div className="font-serif text-[15px] font-semibold text-ink-900">选择对比城市</div>
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
