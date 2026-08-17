import { useState, useMemo } from 'react';
import type { ComparableCity } from '../../types/metro';

interface Props {
  allCities: ComparableCity[];
  selectedSlugs: string[];
  maxReached: boolean;
  onAdd: (slug: string) => void;
  onRemove: (slug: string) => void;
}

export default function CityCompareSelector({
  allCities, selectedSlugs, maxReached, onAdd, onRemove,
}: Props) {
  const [query, setQuery] = useState('');

  const selectedSet = new Set(selectedSlugs);

  // 搜索框兼作 chips 过滤器：直接点选或输入过滤后点选
  const visibleCities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCities;
    return allCities.filter(c =>
      c.city_cn.includes(query.trim()) || c.city.toLowerCase().includes(q)
    );
  }, [allCities, query]);

  const chip = (city: string) => {
    const isSelected = selectedSet.has(city);
    const disabled = isSelected || maxReached;
    return { isSelected, disabled };
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* 过滤输入 + 已选标签 */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') setQuery(''); }}
          placeholder="输入城市名过滤，或直接点选下方城市..."
          aria-label="搜索城市"
          disabled={maxReached}
          className="h-9 w-full max-w-[360px] rounded-sm border border-paper-300 bg-paper-50 px-3 pr-9 text-[13px] text-ink-900 placeholder-ink-300 outline-none focus:border-vermilion-500 disabled:opacity-50"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="清空过滤"
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-[12px] text-ink-400 hover:text-ink-700"
          >✕</button>
        )}
      </div>

      {/* 已选城市标签 */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-[12px] font-semibold tabular-nums ${
            maxReached
              ? 'border-gold-600/30 bg-gold-600/10 text-gold-600'
              : 'border-vermilion-500/25 bg-vermilion-50 text-vermilion-600'
          }`}
        >
          {selectedSlugs.length} / 5 城
        </span>

        {selectedSlugs.map(slug => {
          const c = allCities.find(x => x.city === slug);
          if (!c) return null;
          return (
            <span
              key={slug}
              className="inline-flex items-center gap-1.5 rounded-full border border-vermilion-500/25 bg-vermilion-50 px-3 py-1 text-[13px] text-vermilion-600"
            >
              {c.city_cn}
              <button
                onClick={() => onRemove(slug)}
                aria-label={`移除${c.city_cn}`}
                className="cursor-pointer p-0 text-[12px] leading-none text-ink-400 hover:text-vermilion-600"
              >✕</button>
            </span>
          );
        })}
        {maxReached && (
          <span className="inline-flex items-center gap-1 rounded-sm border border-gold-600/25 bg-gold-600/10 px-2.5 py-1 text-[12px] text-gold-600">
            ⚠️ 已达到 5 个城市对比上限，移除旧城市后可继续添加
          </span>
        )}
        {!maxReached && selectedSlugs.length < 2 && (
          <span className="text-[12px] text-ink-400">请至少选择 2 个城市开始对比</span>
        )}
      </div>

      {/* 全量城市点选墙（搜索过滤） */}
      <div
        className="flex max-h-[132px] flex-wrap gap-1.5 overflow-y-auto rounded-md border border-paper-200 bg-paper-50 p-2"
        role="listbox"
        aria-label="可选城市列表"
      >
        {visibleCities.length === 0 ? (
          <span className="w-full py-2 text-center text-[12px] text-ink-400">没有匹配的城市</span>
        ) : (
          visibleCities.map(c => {
            const { isSelected, disabled } = chip(c.city);
            return (
              <button
                key={c.city}
                role="option"
                aria-selected={isSelected}
                disabled={disabled}
                onClick={() => onAdd(c.city)}
                className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-vermilion-500 ${
                  isSelected
                    ? 'cursor-default border-ink-400/25 bg-ink-400/10 text-ink-400'
                    : maxReached
                      ? 'cursor-default border-paper-200 bg-paper-50 text-ink-300'
                      : 'cursor-pointer border-paper-300 bg-paper-50 text-ink-700 hover:border-vermilion-500/50 hover:bg-vermilion-50 hover:text-vermilion-600'
                }`}
              >
                {c.city_cn}
                {isSelected && <span className="ml-1 text-[10px]">已选</span>}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
