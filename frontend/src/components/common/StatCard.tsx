interface Props {
  label: string;
  value: string | number;
  unit: string;
  icon?: string;
}

export default function StatCard({ label, value, unit, icon }: Props) {
  return (
    <div className="card-glass" style={{
      padding: '16px 20px', textAlign: 'center', position: 'relative',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', minHeight: 100,
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(0,200,255,0.25), transparent)',
      }} />
      {icon && (
        <div style={{
          fontSize: 18, marginBottom: 6, opacity: 0.85,
          lineHeight: 1,
        }}>
          {icon}
        </div>
      )}
      <div style={{
        fontSize: 28, fontWeight: 700, color: 'var(--accent)',
        letterSpacing: 1, lineHeight: 1.2,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 11, color: 'var(--text-label)', marginTop: 6,
        display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: 'center',
      }}>
        {label}
        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>({unit})</span>
      </div>
    </div>
  );
}
