import { Outlet } from 'react-router-dom';
import { Header } from '../public/Header.tsx';
import { Footer } from '../public/Footer.tsx';
import { FloatingWhatsApp } from '../common/FloatingWhatsApp';
import { MobileBottomNav } from '../public/MobileBottomNav';

export const PublicLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 pb-16 md:pb-0">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      <FloatingWhatsApp />
      <MobileBottomNav />
    </div>
  );
};


