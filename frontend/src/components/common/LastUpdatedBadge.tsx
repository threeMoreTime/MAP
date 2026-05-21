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
      className="last-updated-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '20px',
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(51, 65, 85, 0.5)',
        backdropFilter: 'blur(4px)',
        fontSize: '12px',
        color: '#cbd5e1',
        fontFamily: 'monospace, sans-serif',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        ...customStyle
      }}
    >
      <span 
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#10b981',
          boxShadow: '0 0 6px #10b981',
          display: 'inline-block',
        }} 
      />
      <span style={{ color: '#94a3b8' }}>数据快照:</span>
      <span style={{ fontWeight: 600, color: '#34d399' }}>{formattedDate}</span>
    </div>
  );
}
