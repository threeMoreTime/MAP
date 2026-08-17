import { useEffect, useRef } from 'react';
import { NIGHT } from '../../lib/hero3d/palette';

export interface HeroTooltipInfo {
  cityCn: string;
  metricName: string;
  value: string;
  unit: string;
}

interface Props {
  info: HeroTooltipInfo | null;
}

/**
 * 城市悬停 tooltip：position:fixed 跟随鼠标，位置更新走 RAF 直写 transform，
 * 不产生 React state 重渲染；pointer-events-none 不拦截地图交互。
 */
export default function HeroCityTooltip({ info }: Props) {
  const tipRef = useRef<HTMLDivElement>(null);
  const pending = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let raf = 0;
    const flush = () => {
      raf = 0;
      const p = pending.current;
      const el = tipRef.current;
      if (!p || !el) return;
      const PAD = 14;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      let x = p.x + PAD;
      let y = p.y + PAD;
      if (x + w > window.innerWidth - 8) x = p.x - w - PAD;
      if (y + h > window.innerHeight - 8) y = p.y - h - PAD;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const onMove = (e: MouseEvent) => {
      pending.current = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(flush);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (!info) return null;

  return (
    <div
      ref={tipRef}
      role="status"
      aria-label={`${info.cityCn} ${info.metricName} ${info.value}`}
      className="pointer-events-none fixed left-0 top-0 z-40 rounded-md border border-[#2b3a4e] bg-[#0b1016]/90 px-3 py-2 will-change-transform"
    >
      <div className="font-serif text-[13px] font-semibold" style={{ color: NIGHT.text }}>
        {info.cityCn}
      </div>
      <div className="mt-0.5 text-[11px]" style={{ color: NIGHT.textDim }}>
        {info.metricName}
        <span className="ml-1.5 tabular-nums font-medium" style={{ color: NIGHT.accent }}>
          {info.value}
          {info.unit && <span className="ml-0.5 font-normal">{info.unit}</span>}
        </span>
      </div>
    </div>
  );
}
