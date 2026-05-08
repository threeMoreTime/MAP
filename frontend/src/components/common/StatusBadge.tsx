interface Props {
  text: string;
  color?: string;
}

export default function StatusBadge({ text, color }: Props) {
  const c = color || '#4a6a8a';
  return (
    <span style={{
      fontSize: 10, color: c,
      background: `rgba(${c === '#4caf50' ? '76,175,80' : c === '#ff9800' ? '255,152,0' : '60,80,100'}, 0.15)`,
      padding: '2px 8px', borderRadius: 10, display: 'inline-block',
    }}>
      {text}
    </span>
  );
}
