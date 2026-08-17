/**
 * 夜墨墨尘：极少量 DOM/CSS 环境微粒（仅 High 档开启）。
 * 位置与漂移参数按索引确定性生成（不依赖随机数，快照稳定）；
 * 数量 12、透明度 ≤0.13、周期 16s+，克制到不与数据争夺注意力。
 */
const DUST = Array.from({ length: 12 }, (_, i) => ({
  left: (i * 37 + 6) % 100,
  top: (i * 53 + 11) % 100,
  size: i % 4 === 0 ? 2 : 1,
  dur: 16 + (i % 5) * 3,
  delay: -(i * 2.7),
  dx: `${((i % 3) - 1) * 30}px`,
  dy: `${-30 - (i % 4) * 12}px`,
  o: (0.05 + (i % 3) * 0.04).toFixed(2),
}));

export default function HeroAmbience({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {DUST.map((d, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-[#cfd8e3]"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.size,
            height: d.size,
            animation: `heroDust ${d.dur}s linear ${d.delay}s infinite`,
            ['--dust-dx' as string]: d.dx,
            ['--dust-dy' as string]: d.dy,
            ['--dust-o' as string]: d.o,
          }}
        />
      ))}
    </div>
  );
}
