interface Props {
  text: string;
  color?: string;
}

export default function StatusBadge({ text, color }: Props) {
  const c = color || '#4a6a8a';
  const bgMap: Record<string, string> = {
    '#4caf50': 'rgba(76,175,80,0.15)',
    '#ff9800': 'rgba(255,152,0,0.15)',
    '#4a6a8a': 'rgba(60,80,100,0.15)',
  };
  const bg = bgMap[c] || 'rgba(60,80,100,0.15)';

  return (
    <span style={{
      fontSize: 10, color: c,
      background: bg,
      padding: '2px 10px', borderRadius: 10,
      display: 'inline-block', lineHeight: 1.6,
    }}>
      {text}
    </span>
  );
}
