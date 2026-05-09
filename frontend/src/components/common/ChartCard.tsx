import type { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

export default function ChartCard({ title, children, style }: Props) {
  return (
    <div className="card-glass" style={{
      padding: 16, position: 'relative', ...style,
    }}>
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(0,200,255,0.12), transparent)',
      }} />
      <h3 style={{
        fontSize: 14, color: '#6aa0c4', marginBottom: 10, paddingLeft: 12,
        borderLeft: '3px solid #00b8ff', fontWeight: 500,
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
