export default function CompareEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12">
      <div aria-hidden className="text-[40px] leading-none text-ink-300 opacity-60">⚖</div>
      <div className="font-serif text-[15px] font-semibold text-ink-700">
        请至少选择 2 个城市开始对比
      </div>
      <div className="text-[12px] text-ink-500">
        使用上方搜索框添加城市，或直接输入城市中文名/拼音
      </div>
    </div>
  );
}
