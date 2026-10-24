import { ArrowRight, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { Button } from '../common/Button';
import { Link } from 'react-router-dom';

export const HeroSection = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center pt-16 overflow-hidden">
      {/* Absolute Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/assets/hero-bg.jpg" 
          alt="Happy Family and Home" 
          className="w-full h-full object-cover"
        />
        {/* Deep gradient overlay to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-950/95 via-primary-950/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary-950 via-transparent to-transparent opacity-80"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full pt-12 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Main Hero Copy (Left 7 Cols) */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/20 mb-6">
              <ShieldCheck className="w-4 h-4 text-primary-500" />
              <span className="text-xs font-semibold text-white tracking-wide uppercase">
                Govt. Registered & Audited Chit Fund
              </span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6">
              Invest Today, <br/>
              <span className="text-primary-500">
                Secure Tomorrow.
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-neutral-300 mb-10 max-w-2xl leading-relaxed">
              Experience the dual power of disciplined savings and accessible borrowing. Join India's most trusted financial network and achieve your family's dreams faster.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/customer-login">
                <Button variant="primary" className="h-14 px-10 text-lg w-full sm:w-auto hover:-translate-y-1 transition-transform">
                  Start Your Journey <ArrowRight className="w-6 h-6 ml-2" />
                </Button>
              </Link>
              <Button variant="outline" className="h-14 px-10 text-lg bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-md w-full sm:w-auto transition-colors">
                Explore Chit Plans
              </Button>
            </div>
          </div>
          


        </div>
      </div>

      {/* Bottom Floating Stats Bar */}
      <div className="absolute bottom-0 left-0 w-full border-t border-white/10 bg-primary-950/80 backdrop-blur-md z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-500/10 p-2 rounded-lg">
                <Users className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">2 Lakh+</p>
                <p className="text-xs text-neutral-400">Happy Subscribers</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-primary-500/10 p-2 rounded-lg">
                <TrendingUp className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">₹5,000 Cr</p>
                <p className="text-xs text-neutral-400">Total Disbursals</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 hidden md:flex">
              <div className="bg-primary-500/10 p-2 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">60+ Years</p>
                <p className="text-xs text-neutral-400">Of Trusted Legacy</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 hidden md:flex">
              <div className="bg-primary-500/10 p-2 rounded-lg">
                <div className="w-6 h-6 text-primary-500 font-bold flex items-center justify-center text-lg">135</div>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">Branches</p>
                <p className="text-xs text-neutral-400">Across India</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
