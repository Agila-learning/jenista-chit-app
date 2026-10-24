import { Outlet } from 'react-router-dom';
import { Header } from '../public/Header.tsx';
import { Footer } from '../public/Footer.tsx';


export const PublicLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-secondary-50">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};


