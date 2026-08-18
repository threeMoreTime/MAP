interface Props {
  visible: boolean;
}

/**
 * 首次交互提示：intro 完成后出现一次，首次拖拽/缩放/点击城市后淡出，
 * 组件生命周期内不再出现（不写 localStorage）。
 * desktop 左下（与左锚信息列同侧、避开 Ranking/Controls/scroll cue）；
 * mobile 简化文案、置于底部锚点上方。Reduced Motion 经 motion-safe 直切。
 */
export default function HeroHint({ visible }: Props) {
  return (
    <div
      role="status"
      aria-label="交互提示"
      className={
        'pointer-events-none absolute z-10 rounded-full border border-[#2b3a4e] bg-[#0b1016]/55 px-3.5 py-1.5 text-[11px] text-[#8a94a3] backdrop-blur-[2px] transition-opacity duration-500 [transition-timing-function:var(--ease-paper)] ' +
        (visible ? 'opacity-100' : 'opacity-0') +
        // desktop 左下；mobile 底部锚点上方居中
        ' max-lg:bottom-[64px] max-lg:left-1/2 max-lg:-translate-x-1/2 lg:bottom-6 lg:left-[clamp(24px,4vw,64px)]'
      }
    >
      <span className="hidden lg:inline">拖拽旋转 · 滚轮缩放 · 点击城市查看详情</span>
      <span className="lg:hidden">拖拽地图 · 点击城市</span>
    </div>
  );
}
