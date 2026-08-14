import { Suspense } from 'react';
import { HashRouter } from 'react-router-dom';
import AppRoutes from './routes';
import './styles/globals.css';

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<div className="state-message state-message--loading">页面加载中...</div>}>
        <AppRoutes />
      </Suspense>
    </HashRouter>
  );
}
