import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import CitiesPage from './pages/CitiesPage';
import AboutPage from './pages/AboutPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/cities" element={<CitiesPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Route>
    </Routes>
  );
}
