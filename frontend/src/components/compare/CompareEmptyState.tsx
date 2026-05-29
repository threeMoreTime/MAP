export default function CompareEmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 16px', gap: 12,
      color: '#94a3b8',
    }}>
      <div style={{ fontSize: 40, opacity: 0.3 }}>⚖</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#a0aec0' }}>
        请至少选择 2 个城市开始对比
      </div>
      <div style={{ fontSize: 12, color: '#718096' }}>
        使用上方搜索框添加城市，或直接输入城市中文名/拼音
      </div>
    </div>
  );
}
