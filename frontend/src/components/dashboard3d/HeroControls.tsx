interface Props {
  autoRotateEnabled: boolean;
  showLines: boolean;
  showLabels: boolean;
  onToggleAutoRotate: () => void;
  onToggleLines: () => void;
  onToggleLabels: () => void;
  onResetView: () => void;
}

const btnBase =
  'flex size-10 cursor-pointer items-center justify-center rounded-md border border-[#2b3a4e] ' +
  'bg-[#0b1016]/65 text-[15px] backdrop-blur-[2px] transition-colors duration-200 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#d0553f]';
const btnOn = 'text-[#e8e4d8] border-[#4a5a70]';
const btnOff = 'text-[#8a94a3] hover:text-[#e8e4d8]';

/**
 * 低视觉重量 controls：重置视角 / 自动旋转 / 飞线 / 标签。
 * 触控目标 40px；桌面右下横排，移动端右侧竖排（避让底部锚点）。
 * 状态不只靠颜色：关闭态降低文字亮度 + aria-pressed。
 */
export default function HeroControls({
  autoRotateEnabled,
  showLines,
  showLabels,
  onToggleAutoRotate,
  onToggleLines,
  onToggleLabels,
  onResetView,
}: Props) {
  return (
    <div
      role="group"
      aria-label="3D 场景控制"
      className="absolute z-20 flex gap-2 max-lg:right-3 max-lg:top-24 max-lg:flex-col lg:bottom-6 lg:right-4"
    >
      <button
        type="button"
        onClick={onResetView}
        title="重置视角（恢复全国视角并解除旋转暂停）"
        aria-label="重置视角"
        className={`${btnBase} ${btnOn}`}
      >
        ⌂
      </button>
      <button
        type="button"
        onClick={onToggleAutoRotate}
        title={autoRotateEnabled ? '关闭自动旋转' : '开启自动旋转'}
        aria-label="自动旋转"
        aria-pressed={autoRotateEnabled}
        className={`${btnBase} ${autoRotateEnabled ? btnOn : btnOff}`}
      >
        ↻
      </button>
      <button
        type="button"
        onClick={onToggleLines}
        title={showLines ? '隐藏飞线' : '显示飞线'}
        aria-label="飞线开关"
        aria-pressed={showLines}
        className={`${btnBase} ${showLines ? btnOn : btnOff}`}
      >
        ≋
      </button>
      <button
        type="button"
        onClick={onToggleLabels}
        title={showLabels ? '隐藏城市标签' : '显示城市标签'}
        aria-label="城市标签开关"
        aria-pressed={showLabels}
        className={`${btnBase} ${showLabels ? btnOn : btnOff}`}
      >
        字
      </button>
    </div>
  );
}
