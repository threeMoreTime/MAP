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
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Search input */}
      <div style={{ position: 'relative' }}>
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
          style={{
            width: '100%', maxWidth: 360, boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6, padding: '8px 36px 8px 12px',
            fontSize: 13, color: '#fff', outline: 'none',
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); }}
            aria-label="清空搜索"
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              border: 'none', background: 'transparent', color: '#718096',
              cursor: 'pointer', fontSize: 12,
            }}
          >✕</button>
        )}
      </div>

      {/* Search results dropdown */}
      {open && results.length > 0 && (
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 50,
            background: '#0d1b2a', border: '1px solid rgba(0,212,255,0.12)',
            borderRadius: 6, maxHeight: 220, overflowY: 'auto',
            minWidth: 260, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
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
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', padding: '8px 12px', border: 'none',
                  background: 'transparent', cursor: disabled ? 'default' : 'pointer',
                  color: isSelected ? '#94a3b8' : maxReached ? '#4a5568' : '#e2e8f0',
                  fontSize: 13, textAlign: 'left',
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                <span>{c.city_cn} <span style={{ fontSize: 11, color: '#64748b' }}>{c.city}</span></span>
                {isSelected && <span style={{ color: '#22d3ee', fontSize: 12 }}>已选</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected city tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={{
          fontSize: 12, color: maxReached ? '#fbbf24' : '#00d4ff',
          padding: '2px 8px', borderRadius: 10,
          background: maxReached ? 'rgba(251,191,36,0.1)' : 'rgba(0,212,255,0.08)',
          border: `1px solid ${maxReached ? 'rgba(251,191,36,0.25)' : 'rgba(0,212,255,0.15)'}`,
          fontWeight: 600,
        }}>
          {selectedSlugs.length} / 5 城
        </span>

        {selectedSlugs.map(slug => {
          const c = allCities.find(x => x.city === slug);
          if (!c) return null;
          return (
            <span
              key={slug}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 16,
                background: 'rgba(0,212,255,0.08)',
                border: '1px solid rgba(0,212,255,0.18)',
                fontSize: 13, color: '#22d3ee',
              }}
            >
              {c.city_cn}
              <button
                onClick={() => onRemove(slug)}
                aria-label={`移除${c.city_cn}`}
                style={{
                  border: 'none', background: 'transparent',
                  color: '#94a3b8', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1,
                }}
              >✕</button>
            </span>
          );
        })}
        {maxReached && (
          <span style={{
            fontSize: 12, color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6,
          }}>
            ⚠️ 已达到 5 个城市对比上限，移除旧城市后可继续添加
          </span>
        )}
        {!maxReached && selectedSlugs.length < 2 && (
          <span style={{ fontSize: 12, color: '#94a3b8' }}>请至少选择 2 个城市开始对比</span>
        )}
      </div>
    </div>
  );
}
