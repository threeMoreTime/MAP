import { HashRouter } from 'react-router-dom';
import AppRoutes from './routes';
import './styles/globals.css';

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
