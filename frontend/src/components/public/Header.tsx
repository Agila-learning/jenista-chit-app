import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '../common/Button';


export const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-secondary-50 border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <img src="/assets/Chit logo.jpg.jpeg" alt="Jenista Chits Logo" className="h-12 w-12 object-contain" />
            <span className="font-bold text-xl text-primary-900 tracking-tight">Jenista Chits</span>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            <Link to="/" className="text-sm font-medium text-primary-900 hover:text-accent transition-colors">Home</Link>
            <a href="#plans" className="text-sm font-medium text-neutral-600 hover:text-primary-900 transition-colors">Chit Plans</a>
            <a href="#how-it-works" className="text-sm font-medium text-neutral-600 hover:text-primary-900 transition-colors">How It Works</a>
            <a href="#about" className="text-sm font-medium text-neutral-600 hover:text-primary-900 transition-colors">About Us</a>
            <a href="#contact" className="text-sm font-medium text-neutral-600 hover:text-primary-900 transition-colors">Contact</a>
          </nav>

          <div className="hidden md:flex items-center space-x-3">
            <Link to="/customer-login">
              <Button variant="outline" size="sm" className="text-primary-900 border-primary-900 hover:bg-primary-50">Customer Portal</Button>
            </Link>
            <Link to="/admin-login">
              <Button variant="ghost" size="sm" className="text-neutral-500 hover:text-primary-900">Employee Portal</Button>
            </Link>
          </div>

          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-primary-900 hover:text-accent focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-neutral-200 px-4 py-4 space-y-4 shadow-lg absolute w-full left-0">
          <div className="flex flex-col space-y-3">
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-primary-900 hover:text-accent transition-colors">Home</Link>
            <a href="#plans" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-neutral-600 hover:text-primary-900 transition-colors">Chit Plans</a>
            <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-neutral-600 hover:text-primary-900 transition-colors">How It Works</a>
            <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-neutral-600 hover:text-primary-900 transition-colors">About Us</a>
            <a href="#contact" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-neutral-600 hover:text-primary-900 transition-colors">Contact</a>
          </div>
          <div className="pt-4 border-t border-neutral-100 flex flex-col space-y-3">
            <Link to="/customer-login" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full justify-center text-primary-900 border-primary-900 hover:bg-primary-50">Customer Portal</Button>
            </Link>
            <Link to="/admin-login" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-center text-neutral-500 hover:text-primary-900">Employee Portal</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
