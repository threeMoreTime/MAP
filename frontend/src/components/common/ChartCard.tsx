import type { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

export default function ChartCard({ title, children, style }: Props) {
  return (
    <div className="rounded-lg bg-paper-100 p-4 shadow-card" style={style}>
      <h3 className="mb-2.5 border-b border-paper-300 pb-2 font-serif text-[15px] font-semibold text-ink-900">
        {title}
      </h3>
      {children}
    </div>
  );
}
