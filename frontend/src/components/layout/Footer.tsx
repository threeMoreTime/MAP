export default function Footer() {
  return (
    <footer className="mt-auto border-t border-paper-300 px-4 pb-6 pt-5 sm:px-6">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="font-serif text-[13px] font-semibold text-ink-700">
            MetroViz · 全国城市地铁客流数据可视化平台
          </div>
          <div className="text-[11px] leading-6 text-ink-500">
            数据来源 MetroDB.org / MetroMan.cn · React + TypeScript + ECharts ·
            开源项目 · GitHub: threeMoreTime/MAP
          </div>
        </div>
        <div className="mt-2 border-t border-paper-200 pt-2 text-[11px] text-ink-400">
          数据来源：MetroDB.org · 仅供学习交流使用 · 不构成正式决策依据
        </div>
      </div>
    </footer>
  );
}
