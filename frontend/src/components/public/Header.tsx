import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-xl border-b border-slate-200/90 shadow-md py-2.5' 
          : 'bg-white/80 backdrop-blur-md border-b border-slate-100/80 py-3.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12">
          
          {/* Unmodified Brand Logo & Title */}
          <Link to="/" className="flex items-center space-x-3 group">
            <img 
              src="/assets/Chit logo.jpg.jpeg" 
              alt="Jenista Chits Logo" 
              className="h-11 sm:h-12 w-auto object-contain rounded-md" 
            />
            
            <div className="flex flex-col">
              <span className="font-black text-xl sm:text-2xl text-slate-900 tracking-tight leading-none">
                Jenista Chits
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 tracking-wider leading-none mt-1">
                Faith, Commitment, Victory
              </span>
            </div>
          </Link>
          
          {/* Desktop Navigation Links with animated sliding underlines */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className="relative text-sm font-semibold text-slate-800 hover:text-blue-600 py-1.5 transition-colors duration-200 group"
            >
              <span>Home</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300 group-hover:w-full"></span>
            </Link>

            <a 
              href="#plans" 
              className="relative text-sm font-medium text-slate-600 hover:text-blue-600 py-1.5 transition-colors duration-200 group"
            >
              <span>Chit Plans</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300 group-hover:w-full"></span>
            </a>

            <a 
              href="#track-chit" 
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50/80 hover:bg-blue-100 hover:text-blue-800 px-3.5 py-1.5 rounded-full border border-blue-200/80 transition-all duration-200 hover:scale-105 hover:shadow-xs group"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Track Chit</span>
              <Sparkles className="w-3 h-3 text-blue-500 group-hover:rotate-12 transition-transform duration-200" />
            </a>

            <a 
              href="#contact" 
              className="relative text-sm font-medium text-slate-600 hover:text-blue-600 py-1.5 transition-colors duration-200 group"
            >
              <span>Contact</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300 group-hover:w-full"></span>
            </a>
          </nav>

          {/* Single Dynamic Role-Based Login Button */}
          <div className="hidden md:flex items-center space-x-3">
            <Link to="/login">
              <button 
                type="button"
                className="group relative inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <span>Login</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </Link>
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-800 hover:text-blue-600 focus:outline-none p-2 rounded-xl hover:bg-slate-100 active:scale-95 transition-all"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Animated Dropdown Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white/98 backdrop-blur-2xl border-b border-slate-200 px-6 py-5 space-y-4 shadow-2xl absolute w-full left-0 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex flex-col space-y-3">
            <Link 
              to="/" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="text-base font-semibold text-slate-900 hover:text-blue-600 transition-colors py-1 flex items-center justify-between"
            >
              <span>Home</span>
            </Link>
            <a 
              href="#plans" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="text-base font-medium text-slate-600 hover:text-blue-600 transition-colors py-1"
            >
              Chit Plans
            </a>
            <a 
              href="#track-chit" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="text-base font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-2 py-1"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Track Your Chit
            </a>
            <a 
              href="#contact" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="text-base font-medium text-slate-600 hover:text-blue-600 transition-colors py-1"
            >
              Contact
            </a>
          </div>
          <div className="pt-3 border-t border-slate-100 flex flex-col space-y-2">
            <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
              <button 
                type="button"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-xl shadow-md active:scale-98 transition-all"
              >
                <span>Login to Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

