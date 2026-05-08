import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

export default function AppLayout() {
  return (
    <>
      <Header />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
