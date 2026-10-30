import { useState } from 'react';
import { 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Calculator, 
  Sparkles, 
  CheckCircle2,
  Search,
  Award,
  Zap,
  Lock,
  Gavel,
  CalendarClock
} from 'lucide-react';
import { Button } from '../common/Button';

const CHIT_TIERS = [
  { value: 50000, label: '₹50K', months: 20, fixedInstallment: 2500, auctionAvgInstallment: 2150, regularInstallment: 2500, estDividend: 7000 },
  { value: 100000, label: '₹1 Lakh', months: 20, fixedInstallment: 5000, auctionAvgInstallment: 4300, regularInstallment: 5000, estDividend: 14000 },
  { value: 250000, label: '₹2.5 Lakh', months: 25, fixedInstallment: 10000, auctionAvgInstallment: 8450, regularInstallment: 10000, estDividend: 38750 },
  { value: 500000, label: '₹5 Lakh', months: 25, fixedInstallment: 20000, auctionAvgInstallment: 16900, regularInstallment: 20000, estDividend: 77500 },
];

type SchemeMode = 'AUCTION' | 'FIXED' | 'REGULAR';

export const HeroSection = () => {
  const [selectedPlanIdx, setSelectedPlanIdx] = useState(1);
  const [activeHeroTab, setActiveHeroTab] = useState<'calculator' | 'preview'>('calculator');
  const [selectedScheme, setSelectedScheme] = useState<SchemeMode>('AUCTION');

  const currentPlan = CHIT_TIERS[selectedPlanIdx];

  const getMonthlyAmount = () => {
    if (selectedScheme === 'FIXED') return currentPlan.fixedInstallment;
    if (selectedScheme === 'REGULAR') return currentPlan.regularInstallment;
    return currentPlan.auctionAvgInstallment;
  };

  return (
    <section className="relative min-h-[92vh] flex items-center pt-8 sm:pt-14 pb-28 sm:pb-32 overflow-hidden bg-[#060c18]">
      {/* Background with Layered Image & Luminous Fintech Visual Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Layered Rich Architectural Image with Clean Visible Finish */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/assets/hero-bg.jpg" 
            alt="Jenista Chit Funds Digital Architecture" 
            className="w-full h-full object-cover object-center opacity-45 scale-100" 
          />
          {/* Balanced gradient overlay allowing architectural image to be clearly viewable while ensuring white text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060c18] via-[#060c18]/50 to-[#060c18]/65" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060c18]/80 via-[#060c18]/35 to-[#060c18]/65" />
        </div>

        {/* Soft geometric fintech blueprint grid */}
        <div 
          className="absolute inset-0 opacity-[0.12] z-1"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.45) 1px, transparent 1px), linear-gradient(to right, rgba(59, 130, 246, 0.08) 1px, transparent 1px)`,
            backgroundSize: '36px 36px, 72px 72px'
          }}
        />

        {/* Luminous atmospheric glowing orbs */}
        <div className="absolute -top-32 -left-32 w-[650px] h-[650px] bg-gradient-to-br from-blue-600/30 via-indigo-600/20 to-transparent rounded-full blur-[140px] z-1" />
        <div className="absolute top-1/3 -right-32 w-[600px] h-[600px] bg-gradient-to-bl from-emerald-500/25 via-teal-600/15 to-transparent rounded-full blur-[130px] z-1" />
        <div className="absolute -bottom-20 left-1/3 w-[520px] h-[520px] bg-gradient-to-t from-cyan-500/15 via-blue-700/15 to-transparent rounded-full blur-[140px] z-1" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full pt-4 sm:pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Main Hero Copy (Left 7 Cols) */}
          <div className="lg:col-span-7 text-left">
            {/* Trust Pill Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/20 via-emerald-500/15 to-blue-500/20 backdrop-blur-md rounded-full px-4 py-1.5 border border-blue-400/30 mb-6 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-blue-100 tracking-wide uppercase">
                Govt. Registered & Audited Chit Fund · Central Chit Funds Act, 1982
              </span>
            </div>
            
            {/* Bold Innovative Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-[3.75rem] font-black text-white tracking-tight leading-[1.12] mb-6">
              Grow Your Wealth with <br className="hidden sm:inline"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400">
                Disciplined Savings
              </span> <br />
              & Instant Borrowing Power.
            </h1>
            
            <p className="text-sm sm:text-lg text-slate-300/90 mb-8 max-w-2xl leading-relaxed font-normal">
              Jenista Chits combines traditional financial trust with modern digital speed. Choose between <strong className="text-white font-semibold">Fixed Chits</strong> (zero bidding risk), <strong className="text-white font-semibold">Auction Chits</strong> (maximum monthly dividend), and <strong className="text-white font-semibold">Regular Chits</strong> (scheduled milestone turns).
            </p>
            
            {/* Interactive CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 sm:gap-4">
              <a href="#plans" className="w-full sm:w-auto">
                <button 
                  type="button"
                  className="h-13 sm:h-14 px-8 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-emerald-500/25 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
                >
                  <span>Explore Chit Plans</span>
                  <ArrowRight className="w-5 h-5 ml-1" />
                </button>
              </a>
              
              <a href="#track-chit" className="w-full sm:w-auto">
                <button 
                  type="button"
                  className="h-13 sm:h-14 px-7 text-sm sm:text-base font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/20 hover:border-white/35 backdrop-blur-md rounded-2xl transition-all flex items-center justify-center gap-2 w-full sm:w-auto active:scale-98 cursor-pointer"
                >
                  <Search className="w-4 h-4 text-cyan-400" />
                  <span>Track Live Chit</span>
                </button>
              </a>
            </div>

            {/* Micro Trust & Compliance Indicators */}
            <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-y-2.5 gap-x-6 text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1.5 text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 100% Legal & Audited
              </span>
              <span className="flex items-center gap-1.5 text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Zero Hidden Fees
              </span>
              <span className="flex items-center gap-1.5 text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Up to 18% APY Dividend Yield
              </span>
            </div>
          </div>
          
          {/* Right Column: 3D Showcase & Calculator Card with Scheme Selector (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="bg-gradient-to-b from-white/[0.12] to-white/[0.04] backdrop-blur-2xl rounded-3xl p-5 sm:p-7 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.55)] text-white relative overflow-hidden">
              
              {/* Header with Switcher Tabs */}
              <div className="flex items-center justify-between pb-4 border-b border-white/15">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveHeroTab('calculator')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeHeroTab === 'calculator'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white bg-white/5'
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Scheme Calculator</span>
                  </button>

                  <button
                    onClick={() => setActiveHeroTab('preview')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeHeroTab === 'preview'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white bg-white/5'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Digital App Preview</span>
                  </button>
                </div>

                <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  Live Returns
                </span>
              </div>

              {activeHeroTab === 'calculator' ? (
                <>
                  {/* Scheme Selection Pills (Differentiating Fixed, Auction, Regular) */}
                  <div className="mt-4">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      Choose Chit Scheme Type:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/30 rounded-xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => setSelectedScheme('AUCTION')}
                        className={`py-1.5 px-2 text-center rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          selectedScheme === 'AUCTION'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Gavel className="w-3 h-3" />
                        <span>Auction</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedScheme('FIXED')}
                        className={`py-1.5 px-2 text-center rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          selectedScheme === 'FIXED'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                        <span>Fixed</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedScheme('REGULAR')}
                        className={`py-1.5 px-2 text-center rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          selectedScheme === 'REGULAR'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <CalendarClock className="w-3 h-3" />
                        <span>Regular</span>
                      </button>
                    </div>
                  </div>

                  {/* Tier Target Fund Buttons */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                        Select Chit Target Fund:
                      </label>
                      <span className="text-[11px] text-cyan-300 font-semibold">
                        {selectedScheme === 'AUCTION' ? 'Auction Dividend Scheme' : selectedScheme === 'FIXED' ? 'Foreman Draw (Full Value)' : 'Scheduled Milestones'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {CHIT_TIERS.map((tier, idx) => (
                        <button
                          key={tier.value}
                          onClick={() => setSelectedPlanIdx(idx)}
                          className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            selectedPlanIdx === idx
                              ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md scale-105 border border-emerald-400/50'
                              : 'bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10'
                          }`}
                        >
                          {tier.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Calculations Box */}
                  <div className="mt-4 bg-[#0a1426]/90 rounded-2xl p-4 border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Monthly Contribution:</span>
                      <strong className="text-base font-extrabold text-white">
                        ₹{getMonthlyAmount().toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-400">/ mo</span>
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Tenure Duration:</span>
                      <strong className="text-sm font-bold text-cyan-400">
                        {currentPlan.months} Months
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>
                        {selectedScheme === 'AUCTION' 
                          ? 'Est. Dividend Relief:' 
                          : selectedScheme === 'FIXED' 
                            ? 'Payout Mechanism:' 
                            : 'Payout Turn:'}
                      </span>
                      <strong className="text-sm font-bold text-emerald-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        {selectedScheme === 'AUCTION' 
                          ? `Up to ₹${currentPlan.estDividend.toLocaleString('en-IN')}` 
                          : selectedScheme === 'FIXED' 
                            ? '100% Face Value (No Bid Loss)' 
                            : 'Preset Scheduled Month'}
                      </strong>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Total Chit Prize Pool</span>
                        <strong className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300">
                          ₹{currentPlan.value.toLocaleString('en-IN')}
                        </strong>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-400/25">
                        {selectedScheme === 'AUCTION' ? 'Dividend APY' : selectedScheme === 'FIXED' ? 'Zero Bid Risk' : 'Planned Turn'}
                      </span>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="mt-4 space-y-2">
                    <a href="#contact" className="block">
                      <Button variant="primary" className="w-full h-11 text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 shadow-md cursor-pointer">
                        Enrol in {currentPlan.label} ({selectedScheme.toLowerCase()}) Plan <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </a>
                    
                    <p className="text-[11px] text-center text-slate-400">
                      Want to compare all scheme details?{' '}
                      <a href="#plans" className="text-cyan-400 hover:underline font-semibold">
                        View Detailed Plan Matrix
                      </a>
                    </p>
                  </div>
                </>
              ) : (
                /* 3D Fintech Visual Showcase View */
                <div className="mt-4 animate-in fade-in duration-300 space-y-3">
                  <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-inner group">
                    <img 
                      src="/assets/fintech_hero_3d.jpg" 
                      alt="Digital Chit Fund Platform 3D Showcase" 
                      className="w-full h-56 sm:h-64 object-cover object-center group-hover:scale-105 transition-transform duration-700" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                    
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-xs">
                        <span className="text-slate-400 block text-[10px]">Regulatory Status</span>
                        <span className="font-extrabold text-emerald-400">100% Govt. Audited</span>
                      </div>
                      <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-xs">
                        <span className="text-slate-400 block text-[10px]">Subscriber Base</span>
                        <span className="font-extrabold text-amber-300">2 Lakh+ Members</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 text-center leading-relaxed">
                    Access your digital passbook, track live auctions, and manage installments seamlessly.
                  </p>

                  <button
                    onClick={() => setActiveHeroTab('calculator')}
                    className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Back to Interactive Calculator</span>
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

      {/* Bottom Floating Stats Bar */}
      <div className="absolute bottom-0 left-0 w-full border-t border-white/10 bg-[#091122]/90 backdrop-blur-md z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-5">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-500/15 p-2 rounded-xl text-emerald-400 border border-emerald-500/20">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-white">2 Lakh+</p>
                <p className="text-[11px] sm:text-xs text-slate-400">Happy Subscribers</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-cyan-500/15 p-2 rounded-xl text-cyan-400 border border-cyan-500/20">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-white">₹5,000 Cr+</p>
                <p className="text-[11px] sm:text-xs text-slate-400">Total Disbursals</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 hidden md:flex">
              <div className="bg-amber-500/15 p-2 rounded-xl text-amber-400 border border-amber-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">25+ Years</p>
                <p className="text-xs text-slate-400">Government Registered</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 hidden md:flex">
              <div className="bg-emerald-500/15 p-2 rounded-xl text-emerald-400 border border-emerald-500/20">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">100%</p>
                <p className="text-xs text-slate-400">Transparent & Audited</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
