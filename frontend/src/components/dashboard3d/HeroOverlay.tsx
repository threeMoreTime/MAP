interface Props {
  citiesCount: number;
  statsCount: number;
}

/**
 * Hero 顶部标题叠加层：徽标 / 站名 / 数据口径声明。
 * pointer-events-none，不拦截地图交互；口径文案受 DESIGN.md 契约保护不可删除。
 */
export default function HeroOverlay({ citiesCount, statsCount }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center px-4 pt-16 text-center sm:pt-20">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {[`${citiesCount} 城市资源`, `${statsCount} 客流统计城市`].map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[#2b3a4e] bg-[#0b1016]/60 px-3 py-0.5 text-[11px] text-[#8a94a3] backdrop-blur-[2px]"
          >
            {tag}
          </span>
        ))}
      </div>
      <h1 className="mt-4 font-serif text-[28px] font-semibold leading-snug text-[#e8e4d8] [text-shadow:0_2px_18px_rgba(0,0,0,0.65)] sm:text-[38px]">
        全国城市地铁客流可视化平台
      </h1>
      <p className="mt-2.5 max-w-[560px] text-[13px] leading-relaxed text-[#8a94a3]">
        覆盖全国 {citiesCount} 个城市地铁线路资源 · {statsCount} 个城市客流统计数据
        <br />
        <span className="text-[11px] text-[#8a94a3]/70">
          数据来源：MetroDB.org · 公开数据快照，非官方实时发布 · 飞线为视觉示意，非实际客流
        </span>
      </p>
    </div>
  );
}
