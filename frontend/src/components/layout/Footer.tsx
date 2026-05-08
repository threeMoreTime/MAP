export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(0,120,180,0.08)',
      padding: '28px 24px 18px', textAlign: 'center',
      marginTop: 'auto',
    }}>
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
        <div style={{ fontSize: 13, color: '#3a5a7a', letterSpacing: 1, marginBottom: 8 }}>
          MetroViz — 全国城市地铁客流数据可视化平台
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
          {['数据大屏', '城市总览', '数据说明'].map((t) => (
            <span key={t} style={{ color: '#3a5a7a', fontSize: 12 }}>{t}</span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, maxWidth: 800, margin: '0 auto 16px', textAlign: 'left' }}>
          {[
            { title: '数据来源', items: ['MetroDB.org', 'MetroMan.cn'] },
            { title: '项目信息', items: ['开源项目', '仅供学习研究'] },
            { title: '技术栈', items: ['React + TypeScript', 'ECharts + Vite'] },
            { title: '联系方式', items: ['GitHub: threeMoreTime/MAP', '问题反馈: Issues'] },
          ].map(({ title, items }) => (
            <div key={title}>
              <div style={{ color: '#4a6a8a', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{title}</div>
              {items.map((it) => (
                <div key={it} style={{ color: '#2a3a4a', fontSize: 11, lineHeight: 1.8 }}>{it}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ color: '#2a3a4a', fontSize: 11 }}>
          数据来源：MetroDB.org · 仅供学习交流使用 · 不构成正式决策依据
        </div>
      </div>
    </footer>
  );
}
