interface Props {
  label: string;
  value: string | number;
  unit: string;
  icon?: string;
}

export default function StatCard({ label, value, unit, icon }: Props) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(8,22,48,0.85), rgba(12,30,58,0.7))',
      border: '1px solid rgba(0,180,255,0.12)', borderRadius: 'var(--radius)',
      padding: '14px 22px', textAlign: 'center', minWidth: 130,
      position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(0,200,255,0.3), transparent)',
      }} />
      {icon && <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>}
      <div style={{ fontSize: 26, fontWeight: 'bold', color: '#00d4ff', letterSpacing: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#4a6a8a', marginTop: 4 }}>{label}（{unit}）</div>
    </div>
  );
}
