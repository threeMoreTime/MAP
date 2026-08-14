import { useState, useRef, useEffect } from 'react';
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
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedSet = new Set(selectedSlugs);

  const results = query.trim()
    ? allCities.filter(c =>
        c.city_cn.includes(query.trim()) ||
        c.city.toLowerCase().includes(query.trim().toLowerCase()),
      ).slice(0, 12)
    : [];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setQuery('');
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (slug: string) => {
    if (selectedSet.has(slug) || maxReached) return;
    onAdd(slug);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative flex flex-col gap-2.5">
      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="搜索城市中文名或拼音..."
          aria-label="搜索城市"
          disabled={maxReached}
          className="h-9 w-full max-w-[360px] rounded-sm border border-paper-300 bg-paper-50 px-3 pr-9 text-[13px] text-ink-900 placeholder-ink-300 outline-none focus:border-vermilion-500 disabled:opacity-50"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); }}
            aria-label="清空搜索"
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-[12px] text-ink-400 hover:text-ink-700"
          >✕</button>
        )}
      </div>

      {/* Search results dropdown */}
      {open && results.length > 0 && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute left-0 top-full z-50 min-w-[260px] overflow-y-auto rounded-sm border border-paper-300 bg-paper-50 shadow-card-hover"
          style={{ maxHeight: 220 }}
        >
          {results.map(c => {
            const isSelected = selectedSet.has(c.city);
            const disabled = isSelected || maxReached;
            return (
              <button
                key={c.city}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(c.city)}
                disabled={disabled}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] ${
                  disabled
                    ? 'cursor-default text-ink-300 opacity-60'
                    : 'cursor-pointer text-ink-900 hover:bg-paper-100'
                }`}
              >
                <span>{c.city_cn} <span className="text-[11px] text-ink-400">{c.city}</span></span>
                {isSelected && <span className="text-[12px] text-ink-400">已选</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected city tags */}
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
    </div>
  );
}
