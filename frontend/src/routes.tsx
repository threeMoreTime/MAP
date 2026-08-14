import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CitiesPage = lazy(() => import('./pages/CitiesPage'));
const CityDetailPage = lazy(() => import('./pages/CityDetailPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const DataQualityPage = lazy(() => import('./pages/DataQualityPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/cities" element={<CitiesPage />} />
        <Route path="/city/:id" element={<CityDetailPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/data-quality" element={<DataQualityPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Route>
    </Routes>
  );
}
