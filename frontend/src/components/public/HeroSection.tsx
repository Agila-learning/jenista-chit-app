import React from 'react';
import { 
  ArrowRight, 
  ShieldCheck, 
  Users, 
  TrendingUp, 
  Sparkles 
} from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-[88vh] flex items-center pt-8 sm:pt-14 pb-16 sm:pb-24 overflow-hidden bg-gradient-to-br from-[#FFFDF7] via-[#F8F1E5] to-[#FFFDF7]">
      {/* Background Soft Natural Lighting & Subtle Greenery Accents */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Soft sunrise warm golden glow */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-gradient-to-br from-[#D8AB4B]/15 via-[#F8F1E5] to-transparent rounded-full blur-[130px]" />
        
        {/* Deep emerald greenery ambient blur */}
        <div className="absolute top-1/4 -right-32 w-[550px] h-[550px] bg-gradient-to-bl from-[#064E3B]/10 via-[#073B32]/5 to-transparent rounded-full blur-[130px]" />
        
        {/* Bottom soft golden accent */}
        <div className="absolute -bottom-24 left-1/3 w-[500px] h-[500px] bg-gradient-to-t from-[#D8AB4B]/12 via-transparent to-transparent rounded-full blur-[120px]" />

        {/* Subtle geometric dot matrix */}
        <div 
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(#073B32 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: Headline, Supporting Copy, CTAs, Trust Items */}
          {/* ======================================================== */}
          <div className="lg:col-span-6 xl:col-span-7 text-left order-1">
            
            {/* Subtle Brand & Compliance Tag */}
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-md rounded-full px-4 py-1.5 border border-[#064E3B]/20 mb-6 shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-[#064E3B] animate-pulse" />
              <ShieldCheck className="w-4 h-4 text-[#064E3B]" />
              <span className="text-xs font-bold text-[#073B32] tracking-wide uppercase">
                Central Chit Funds Act, 1982 Regulated
              </span>
            </div>

            {/* Main Headline with Elegant Gold Script Accent on "Goals" */}
            <h1 className="text-3xl sm:text-5xl lg:text-[3.5rem] xl:text-[3.85rem] font-black text-[#102C28] tracking-tight leading-[1.14] mb-6">
              Plan Your Savings. <br />
              Move Towards Your{' '}
              <span className="text-[#D8AB4B] font-serif italic relative inline-block">
                Goals.
                <span className="absolute -bottom-1.5 left-0 right-0 h-1 bg-gradient-to-r from-[#D8AB4B] via-[#eed59e] to-transparent rounded-full opacity-80" />
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="text-base sm:text-lg text-[#102C28]/80 mb-8 max-w-xl leading-relaxed font-normal">
              Explore chit plans designed around your financial goals, with clear installment details and a convenient way to track your progress.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 sm:gap-4">
              <a href="#plans" className="w-full sm:w-auto">
                <button 
                  type="button"
                  className="h-13 sm:h-14 px-8 text-sm sm:text-base font-bold text-[#FFFDF7] bg-[#064E3B] hover:bg-[#073B32] rounded-2xl shadow-lg shadow-[#064E3B]/25 hover:shadow-xl hover:shadow-[#064E3B]/35 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2.5 w-full sm:w-auto cursor-pointer"
                >
                  <span>Explore Chit Plans</span>
                  <ArrowRight className="w-4 h-4 text-[#D8AB4B]" />
                </button>
              </a>
              
              <a href="#contact" className="w-full sm:w-auto">
                <button 
                  type="button"
                  className="h-13 sm:h-14 px-8 text-sm sm:text-base font-bold text-[#064E3B] bg-white/80 hover:bg-[#F8F1E5] border border-[#064E3B]/30 hover:border-[#064E3B] rounded-2xl shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
                >
                  <span>Enquire Now</span>
                </button>
              </a>
            </div>

            {/* Trust Indicators (3 Compact Indicators with Line Icons & Subtle Separators) */}
            <div className="mt-10 pt-6 border-t border-[#102C28]/12 grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 text-xs sm:text-sm font-semibold text-[#102C28]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#064E3B]/10 flex items-center justify-center text-[#064E3B] shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="font-bold text-[#102C28] text-xs sm:text-sm">Trusted & Transparent</span>
              </div>
              
              <div className="flex items-center gap-2.5 sm:border-l sm:border-[#102C28]/12 sm:pl-4">
                <div className="w-8 h-8 rounded-xl bg-[#064E3B]/10 flex items-center justify-center text-[#064E3B] shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <span className="font-bold text-[#102C28] text-xs sm:text-sm">Customer Focused</span>
              </div>
              
              <div className="flex items-center gap-2.5 sm:border-l sm:border-[#102C28]/12 sm:pl-4">
                <div className="w-8 h-8 rounded-xl bg-[#064E3B]/10 flex items-center justify-center text-[#064E3B] shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="font-bold text-[#102C28] text-xs sm:text-sm">Grow Your Savings</span>
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: Realistic Financial Savings Illustration   */}
          {/* ======================================================== */}
          <div className="lg:col-span-6 xl:col-span-5 order-2">
            <div className="relative group">
              {/* Ambient Golden Glow Backing */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-[#D8AB4B]/25 via-[#064E3B]/15 to-[#D8AB4B]/20 rounded-[2.5rem] blur-2xl opacity-70 group-hover:opacity-90 transition-opacity pointer-events-none" />
              
              {/* Rounded Curved Mask Card */}
              <div className="relative rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-[#D8AB4B]/35 shadow-[0_20px_50px_rgba(7,59,50,0.14)] bg-white">
                <img 
                  src="/assets/hero_savings_composition.jpg" 
                  alt="Jenista Chits Financial Savings - Your Dreams, Our Support" 
                  className="w-full h-auto object-cover object-center transform group-hover:scale-[1.02] transition-transform duration-700" 
                />
                
                {/* Subtle overlay gradient at the bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#073B32]/35 via-transparent to-transparent pointer-events-none" />
                
                {/* Top Badge: "Your Dreams, Our Support" */}
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#D8AB4B]/40 shadow-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D8AB4B] animate-pulse" />
                  <span className="text-[11px] font-extrabold text-[#073B32] uppercase tracking-wider">
                    Your Dreams, Our Support
                  </span>
                </div>

                {/* Bottom Goal Milestone Badges */}
                <div className="absolute bottom-4 left-4 right-4 bg-[#073B32]/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 text-white flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D8AB4B]" />
                    <span className="text-xs font-bold text-white">Achieve Real Milestones</span>
                  </div>
                  <span className="text-[11px] font-medium text-[#F8F1E5]">Home • Car • Wedding • Education</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
