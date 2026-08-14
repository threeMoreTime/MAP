import React from 'react';

interface Props {
  generatedAt?: string;
  style?: React.CSSProperties;
}

export default function LastUpdatedBadge({ generatedAt, style: customStyle }: Props) {
  const formattedDate = React.useMemo(() => {
    if (!generatedAt) return '更新时间未知';
    const match = generatedAt.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : '更新时间未知';
  }, [generatedAt]);

  return (
    <div
      className="last-updated-badge inline-flex items-center gap-1.5 rounded-full border border-paper-300 bg-paper-100 px-3 py-1 text-[12px] text-ink-500 tabular-nums"
      style={customStyle}
    >
      <span aria-hidden className="inline-block size-1.5 rounded-full bg-jade-600" />
      <span>数据快照:</span>
      <span className="font-semibold text-ink-900">{formattedDate}</span>
    </div>
  );
}
