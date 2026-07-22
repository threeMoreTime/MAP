import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

export default function AppLayout() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {isOffline && (
        <div style={{
          background: 'rgba(234,88,12,0.92)', color: '#fff',
          fontSize: 12, padding: '6px 16px', textAlign: 'center',
          position: 'sticky', top: 0, zIndex: 1000, fontWeight: 500,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          📡 当前网络已断开，正优先使用本地数据缓存与离线包为您提供服务
        </div>
      )}
      <Header />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
