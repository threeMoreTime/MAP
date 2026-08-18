import { useEffect, useRef, useState } from 'react';

interface Props {
  autoRotateEnabled: boolean;
  showLines: boolean;
  showLabels: boolean;
  /** intro 完成后阶梯显影 */
  revealed: boolean;
  onToggleAutoRotate: () => void;
  onToggleLines: () => void;
  onToggleLabels: () => void;
  onResetView: () => void;
}

/**
 * 场景控制。desktop lg+：右下四个独立 40px 按钮；
 * mobile：折叠为单个「场景设置」按钮 + 轻量菜单（Escape / 点击外部关闭）。
 * 图标统一 inline SVG（16×16 / stroke=currentColor / round cap+join），纸墨极简气质。
 */

/** inline SVG 图标集（stroke 1.5，round cap/join，16×16 viewBox） */
function ControlIcon({ kind }: { kind: 'reset' | 'rotate' | 'lines' | 'labels' }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (kind) {
    case 'reset': // 取景框：回到全国总览
      return (
        <svg {...common}>
          <path d="M2.5 5.5v-2a1 1 0 0 1 1-1h2M10.5 2.5h2a1 1 0 0 1 1 1v2M13.5 10.5v2a1 1 0 0 1-1 1h-2M5.5 13.5h-2a1 1 0 0 1-1-1v-2" />
          <circle cx="8" cy="8" r="1.2" />
        </svg>
      );
    case 'rotate': // 环形箭头：自动旋转
      return (
        <svg {...common}>
          <path d="M13 8a5 5 0 1 1-1.6-3.68" />
          <path d="M13 2.5V5h-2.5" />
        </svg>
      );
    case 'lines': // 流线：飞线
      return (
        <svg {...common}>
          <path d="M2 11c2.2 0 2.6-6 6-6s3.8 6 6 6" />
          <path d="M11.5 3.5l2.5 1.5-1.5 2.2" />
        </svg>
      );
    case 'labels': // 标签：城市名
      return (
        <svg {...common}>
          <path d="M2.5 3.2h5.2l5.8 5.8-3.7 3.7-5.8-5.8z" transform="translate(0 .5)" />
          <circle cx="5.4" cy="6.1" r=".2" />
        </svg>
      );
  }
}

/** hover/focus 自定义 tooltip（不依赖 title；desktop 菜单行不显示，按钮显示） */
function TipButton({
  label,
  icon,
  pressed,
  onClick,
  tooltipSide = 'top',
}: {
  label: string;
  icon: 'reset' | 'rotate' | 'lines' | 'labels';
  pressed?: boolean;
  onClick: () => void;
  tooltipSide?: 'top' | 'left';
}) {
  const tipPos =
    tooltipSide === 'top'
      ? 'bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2'
      : 'right-[calc(100%+8px)] top-1/2 -translate-y-1/2';
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={pressed}
        className={
          'flex size-10 cursor-pointer items-center justify-center rounded-md border transition-colors duration-200 ' +
          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#d0553f] ' +
          (pressed === undefined
            ? 'border-[#4a5a70] bg-[#0b1016]/65 text-[#e8e4d8] hover:border-[#5a6a80] '
            : pressed
              ? 'border-[#4a5a70] bg-[#0b1016]/65 text-[#e8e4d8] '
              : 'border-[#2b3a4e] bg-[#0b1016]/65 text-[#8a94a3] hover:text-[#e8e4d8] ')
        }
      >
        <ControlIcon kind={icon} />
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${tipPos} z-30 whitespace-nowrap rounded-sm border border-[#2b3a4e] bg-[#0b1016]/92 px-2 py-1 text-[11px] text-[#e8e4d8] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100`}
      >
        {label}
      </span>
    </span>
  );
}

export default function HeroControls({
  autoRotateEnabled,
  showLines,
  showLabels,
  revealed,
  onToggleAutoRotate,
  onToggleLines,
  onToggleLabels,
  onResetView,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Escape 关闭 + 点击外部关闭
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [menuOpen]);

  const menuItems = [
    { key: 'reset', label: '重置视角', pressed: undefined as boolean | undefined, icon: 'reset' as const, action: onResetView },
    { key: 'rotate', label: '自动旋转', pressed: autoRotateEnabled, icon: 'rotate' as const, action: onToggleAutoRotate },
    { key: 'lines', label: '飞线', pressed: showLines, icon: 'lines' as const, action: onToggleLines },
    { key: 'labels', label: '城市标签', pressed: showLabels, icon: 'labels' as const, action: onToggleLabels },
  ];

  return (
    <>
      {/* desktop lg+：右下四个独立按钮（横排，tooltip 在上方） */}
      <div
        role="group"
        aria-label="3D 场景控制"
        className={`absolute z-20 hidden gap-2 lg:bottom-6 lg:right-4 lg:flex ${
          revealed ? 'motion-safe:hero-fade-in' : 'opacity-0'
        }`}
        style={revealed ? { animationDelay: '260ms' } : undefined}
      >
        <TipButton label="重置视角" icon="reset" onClick={onResetView} />
        <TipButton label="自动旋转" icon="rotate" pressed={autoRotateEnabled} onClick={onToggleAutoRotate} />
        <TipButton label="飞线开关" icon="lines" pressed={showLines} onClick={onToggleLines} />
        <TipButton label="城市标签开关" icon="labels" pressed={showLabels} onClick={onToggleLabels} />
      </div>

      {/* mobile <lg：单个场景设置按钮 + 折叠菜单（右缘中部，避开顶部切换器与底部锚点） */}
      <div
        ref={menuRef}
        className={`absolute right-3 top-24 z-20 lg:hidden ${revealed ? 'motion-safe:hero-fade-in' : 'opacity-0'}`}
      >
        <span className="group relative inline-flex">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="场景设置"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex size-10 cursor-pointer items-center justify-center rounded-md border border-[#4a5a70] bg-[#0b1016]/65 text-[#e8e4d8] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#d0553f]"
          >
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2 4.5h12M2 8h12M2 11.5h12" />
              <circle cx="5.5" cy="4.5" r="1.1" fill="#0b1016" />
              <circle cx="10.5" cy="8" r="1.1" fill="#0b1016" />
              <circle cx="6.5" cy="11.5" r="1.1" fill="#0b1016" />
            </svg>
          </button>
        </span>
        {menuOpen && (
          <div
            role="menu"
            aria-label="场景设置"
            className="absolute right-0 top-[calc(100%+8px)] flex w-[148px] flex-col gap-1 rounded-lg border border-[#2b3a4e] bg-[#0b1016]/95 p-1.5 backdrop-blur-[2px]"
          >
            {menuItems.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitemcheckbox"
                aria-checked={item.pressed}
                onClick={() => item.action()}
                className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-sm px-2.5 text-left text-[13px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#d0553f]"
              >
                <span className={item.pressed === false ? 'text-[#8a94a3]' : 'text-[#e8e4d8]'}>
                  <ControlIcon kind={item.icon} />
                </span>
                <span className={item.pressed === false ? 'text-[#8a94a3]' : 'text-[#e8e4d8]'}>
                  {item.label}
                </span>
                {item.pressed !== undefined && (
                  <span
                    aria-hidden
                    className={`ml-auto text-[10px] ${item.pressed ? 'text-[#d0553f]' : 'text-[#5a6a80]'}`}
                  >
                    {item.pressed ? '开' : '关'}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
