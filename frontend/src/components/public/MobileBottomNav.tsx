import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Layers, Search, PhoneCall, LogIn } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const [activeSection, setActiveSection] = useState('home');
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const plansEl = document.getElementById('plans');
      const trackEl = document.getElementById('track-chit');
      const contactEl = document.getElementById('contact');

      if (contactEl && scrollY >= contactEl.offsetTop - 250) {
        setActiveSection('contact');
      } else if (trackEl && scrollY >= trackEl.offsetTop - 250) {
        setActiveSection('track');
      } else if (plansEl && scrollY >= plansEl.offsetTop - 250) {
        setActiveSection('plans');
      } else {
        setActiveSection('home');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Only render on public routes
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/staff') || location.pathname.startsWith('/customer')) {
    return null;
  }

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080f20]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] print:hidden"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* 1. Home */}
        <a
          href="#"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setActiveSection('home');
          }}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all duration-200 active:scale-95 ${
            activeSection === 'home'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight tracking-tight">Home</span>
        </a>

        {/* 2. Chit Plans */}
        <a
          href="#plans"
          onClick={() => setActiveSection('plans')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all duration-200 active:scale-95 ${
            activeSection === 'plans'
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight tracking-tight">Plans</span>
        </a>

        {/* 3. Track Chit (Elevated Center Button) */}
        <a
          href="#track-chit"
          onClick={() => setActiveSection('track')}
          className="relative -top-3 flex flex-col items-center group active:scale-90 transition-transform"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 border-2 border-[#080f20]">
            <Search className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#080f20] animate-ping" />
          </div>
          <span className="text-[10px] font-extrabold text-cyan-300 mt-0.5">Track</span>
        </a>

        {/* 4. Contact / Join */}
        <a
          href="#contact"
          onClick={() => setActiveSection('contact')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all duration-200 active:scale-95 ${
            activeSection === 'contact'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PhoneCall className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight tracking-tight">Contact</span>
        </a>

        {/* 5. Portal Login */}
        <Link
          to="/login"
          className="flex flex-col items-center py-1 px-2.5 rounded-xl text-slate-300 hover:text-white transition-all duration-200 active:scale-95"
        >
          <LogIn className="w-5 h-5 mb-0.5 text-amber-400" />
          <span className="text-[10px] leading-tight tracking-tight font-semibold">Login</span>
        </Link>

      </div>
    </nav>
  );
};
