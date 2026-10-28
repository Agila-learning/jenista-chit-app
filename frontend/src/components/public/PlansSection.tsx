import React, { useState } from 'react';
import { 
  Lock, 
  Gavel, 
  CalendarClock, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  X,
  Info
} from 'lucide-react';

type PlanTab = 'ALL' | 'FIXED' | 'AUCTION' | 'REGULAR';
type SchemeDetailKey = 'FIXED' | 'AUCTION' | 'REGULAR';

export const PlansSection: React.FC = () => {
  const [activePlanTab, setActivePlanTab] = useState<PlanTab>('ALL');
  const [selectedSlab, setSelectedSlab] = useState<number>(100000);
  const [selectedDetailScheme, setSelectedDetailScheme] = useState<SchemeDetailKey | null>(null);

  const chitSlabs = [
    { value: 50000, label: '₹50,000', months: 20, fixedMonthly: 2500, auctionAvgMonthly: 2150, regularMonthly: 2500 },
    { value: 100000, label: '₹1,00,000', months: 20, fixedMonthly: 5000, auctionAvgMonthly: 4300, regularMonthly: 5000 },
    { value: 250000, label: '₹2,50,000', months: 25, fixedMonthly: 10000, auctionAvgMonthly: 8450, regularMonthly: 10000 },
    { value: 500000, label: '₹5,00,000', months: 25, fixedMonthly: 20000, auctionAvgMonthly: 16900, regularMonthly: 20000 },
    { value: 1000000, label: '₹10,00,000', months: 40, fixedMonthly: 25000, auctionAvgMonthly: 21100, regularMonthly: 25000 },
  ];

  const currentSlab = chitSlabs.find(s => s.value === selectedSlab) || chitSlabs[1];

  const comparisonFeatures = [
    {
      feature: 'Payout Selection Mechanism',
      fixed: 'Transparent monthly draw by foreman',
      auction: 'Open reverse competitive bidding',
      regular: 'Predetermined scheduled turns / seniority',
      highlight: false
    },
    {
      feature: 'Prize Money Received',
      fixed: '100% Face Value (No discount loss)',
      auction: 'Face Value minus Winning Bid Discount',
      regular: '100% Face Value on scheduled month',
      highlight: true
    },
    {
      feature: 'Monthly Installment Behavior',
      fixed: 'Fixed amount every month throughout',
      auction: 'Reduced monthly via Dividend distribution',
      regular: 'Fixed predictable installment each month',
      highlight: true
    },
    {
      feature: 'Emergency Cash Liquidity',
      fixed: 'Wait until your ticket is drawn',
      auction: 'Bid and withdraw funds in early months',
      regular: 'Fixed scheduled month known in advance',
      highlight: false
    },
    {
      feature: 'Foreman Commission',
      fixed: 'Standard 5% (Regulated)',
      auction: 'Standard 5% (Regulated)',
      regular: 'Standard 5% (Regulated)',
      highlight: false
    },
    {
      feature: 'Best Suited For',
      fixed: 'Salaried employees & conservative savers',
      auction: 'Business owners, traders & high returns',
      regular: 'Family milestones, weddings & education',
      highlight: false
    }
  ];

  return (
    <section id="plans" className="py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 relative overflow-hidden border-b border-slate-200/80">
      {/* Background Lighting Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Government Regulated Schemes
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            Transparent Chit Plan Architecture
          </h2>
          <p className="mt-3.5 text-base sm:text-lg text-slate-600 leading-relaxed">
            Choose from our three government-registered plans designed for different financial milestones—whether you value predictability, instant capital liquidity, or scheduled milestone savings.
          </p>

          {/* Interactive Responsive Filter Toggle */}
          <div className="mt-8 inline-flex p-1.5 rounded-2xl bg-slate-200/80 max-w-lg w-full justify-center shadow-inner overflow-x-auto">
            <button
              onClick={() => setActivePlanTab('ALL')}
              className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
                activePlanTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-md font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Plans
            </button>
            <button
              onClick={() => setActivePlanTab('FIXED')}
              className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
                activePlanTab === 'FIXED'
                  ? 'bg-blue-600 text-white shadow-md font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fixed Chit
            </button>
            <button
              onClick={() => setActivePlanTab('AUCTION')}
              className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
                activePlanTab === 'AUCTION'
                  ? 'bg-indigo-600 text-white shadow-md font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Auction Chit
            </button>
            <button
              onClick={() => setActivePlanTab('REGULAR')}
              className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
                activePlanTab === 'REGULAR'
                  ? 'bg-emerald-600 text-white shadow-md font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Regular Chit
            </button>
          </div>
        </div>

        {/* Interactive Chit Value Calculator Bar */}
        <div className="mb-12 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block">
                Live Scheme Estimator
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Select Chit Value to View Monthly Breakdown
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {chitSlabs.map((slab) => (
                <button
                  key={slab.value}
                  onClick={() => setSelectedSlab(slab.value)}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                    selectedSlab === slab.value
                      ? 'bg-blue-600 text-white shadow-sm scale-105'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {slab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Responsive Plans Cards Grid */}
        <div className={`grid gap-6 sm:gap-8 items-stretch ${
          activePlanTab === 'ALL' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1 max-w-3xl mx-auto'
        }`}>
          
          {/* Plan 1: FIXED CHIT PLAN */}
          {(activePlanTab === 'ALL' || activePlanTab === 'FIXED') && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:border-blue-300 group">
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 sm:p-7 text-white relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-blue-300 shadow-inner group-hover:scale-105 transition-transform">
                      <Lock className="w-6 h-6 text-blue-300" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-400/20">
                        Zero Bid Risk
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                        Fixed Chit Plan
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="mt-3.5 text-xs text-blue-100/90 leading-relaxed">
                  Monthly transparent draw selects one member to receive the full 100% chit value without bidding discount.
                </p>

                <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-blue-200/80 block text-[11px]">Monthly Installment</span>
                    <strong className="text-base font-black text-white">₹{currentSlab.fixedMonthly.toLocaleString('en-IN')}/mo</strong>
                  </div>
                  <div>
                    <span className="text-blue-200/80 block text-[11px]">Payout Benefit</span>
                    <strong className="text-base font-black text-emerald-300">100% Face Value</strong>
                  </div>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">
                    Key Features
                  </h4>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2.5 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span><strong>Constant Outflow:</strong> Pay the exact same installment every month.</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span><strong>Full Payout:</strong> Winner gets entire chit amount less 5% foreman fee.</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span><strong>No Live Bidding:</strong> No stress of participating in monthly auctions.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-950">
                  <span className="font-extrabold text-blue-900 block mb-0.5 text-[10px] uppercase">
                    Best For:
                  </span>
                  Salaried individuals, first-time investors, and conservative family savers.
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedDetailScheme('FIXED')}
                    className="w-full py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-blue-200 cursor-pointer active:scale-98"
                  >
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    <span>Learn Fixed Scheme Rules & Draw Structure</span>
                  </button>

                  <a href="#contact" className="block">
                    <button className="w-full h-11 rounded-xl bg-slate-900 hover:bg-blue-900 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md group-hover:scale-[1.01] cursor-pointer">
                      Enrol in Fixed Plan <ArrowRight className="w-4 h-4" />
                    </button>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Plan 2: AUCTION CHIT PLAN */}
          {(activePlanTab === 'ALL' || activePlanTab === 'AUCTION') && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:border-indigo-300 group">
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-7 text-white relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-indigo-300 shadow-inner group-hover:scale-105 transition-transform">
                      <Gavel className="w-6 h-6 text-indigo-300" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-400/20">
                        Dividend Earning
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                        Auction Chit Plan
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="mt-3.5 text-xs text-indigo-100/90 leading-relaxed">
                  Monthly reverse bidding where members bid discounts. The discount is shared as dividends, lowering everyone's installment.
                </p>

                <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-indigo-200/80 block text-[11px]">Avg. Effective Outflow</span>
                    <strong className="text-base font-black text-emerald-300">~₹{currentSlab.auctionAvgMonthly.toLocaleString('en-IN')}/mo</strong>
                  </div>
                  <div>
                    <span className="text-indigo-200/80 block text-[11px]">Emergency Access</span>
                    <strong className="text-base font-black text-white">Instant Bidding</strong>
                  </div>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">
                    Key Features
                  </h4>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2.5 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span><strong>Lower Net Installment:</strong> Earn dividend shares every single month.</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span><strong>Emergency Cash Liquidity:</strong> Bid whenever urgent capital is required.</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span><strong>High Yield for Non-Bidders:</strong> Maximum returns if taken towards end.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950">
                  <span className="font-extrabold text-indigo-900 block mb-0.5 text-[10px] uppercase">
                    Best For:
                  </span>
                  Business owners, traders, emergency fund planners, and high-return seekers.
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedDetailScheme('AUCTION')}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-indigo-200 cursor-pointer active:scale-98"
                  >
                    <Info className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Learn Auction Bidding & Dividend Yield</span>
                  </button>

                  <a href="#contact" className="block">
                    <button className="w-full h-11 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md group-hover:scale-[1.01] cursor-pointer">
                      Enrol in Auction Plan <ArrowRight className="w-4 h-4" />
                    </button>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Plan 3: REGULAR CHIT PLAN */}
          {(activePlanTab === 'ALL' || activePlanTab === 'REGULAR') && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:border-emerald-300 group">
              <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-6 sm:p-7 text-white relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-300 shadow-inner group-hover:scale-105 transition-transform">
                      <CalendarClock className="w-6 h-6 text-emerald-300" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/20">
                        Scheduled Milestones
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                        Regular Chit Plan
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="mt-3.5 text-xs text-emerald-100/90 leading-relaxed">
                  Equal monthly installments with scheduled priority turns arranged in advance. Ideal for targeted life goals without bidding uncertainties.
                </p>

                <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-emerald-200/80 block text-[11px]">Monthly Commitment</span>
                    <strong className="text-base font-black text-white">₹{currentSlab.regularMonthly.toLocaleString('en-IN')}/mo</strong>
                  </div>
                  <div>
                    <span className="text-emerald-200/80 block text-[11px]">Turn Schedule</span>
                    <strong className="text-base font-black text-emerald-300">Preset Turn Order</strong>
                  </div>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">
                    Key Features
                  </h4>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2.5 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Predetermined Payout Turn:</strong> Plan months in advance for big family events.</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Full Capital Value:</strong> Collect the planned capital without reverse discounts.</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Disciplined Habit:</strong> Perfect forced savings discipline with regular installments.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-950">
                  <span className="font-extrabold text-emerald-900 block mb-0.5 text-[10px] uppercase">
                    Best For:
                  </span>
                  Planned weddings, school/college fees, scheduled home renovations, and milestone goals.
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedDetailScheme('REGULAR')}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-emerald-200 cursor-pointer active:scale-98"
                  >
                    <Info className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Learn Regular Milestone & Turn Order</span>
                  </button>

                  <a href="#contact" className="block">
                    <button className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md group-hover:scale-[1.01] cursor-pointer">
                      Enrol in Regular Plan <ArrowRight className="w-4 h-4" />
                    </button>
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Real Milestones & Family Growth Showcase Banner */}
        <div className="mt-16 rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-[#0e1d38] to-slate-950 border border-slate-800 shadow-2xl text-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 p-6 sm:p-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Empowering Middle India</span>
              </div>
              
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                Real Milestones. Real Families. <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-emerald-300 to-cyan-300">
                  Real Financial Freedom.
                </span>
              </h3>
              
              <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed font-normal">
                Whether you are opening your first retail showroom, expanding an established venture, or securing your child's university education, our transparent chit funds offer disciplined capital when banks say no.
              </p>
              
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-4 border-t border-white/10">
                <div className="bg-white/5 rounded-2xl p-2.5 sm:p-3 border border-white/10 text-center">
                  <span className="text-base sm:text-2xl font-black text-emerald-400 block">15,000+</span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Homes Built</span>
                </div>
                <div className="bg-white/5 rounded-2xl p-2.5 sm:p-3 border border-white/10 text-center">
                  <span className="text-base sm:text-2xl font-black text-cyan-400 block">35,000+</span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Shops Expanded</span>
                </div>
                <div className="bg-white/5 rounded-2xl p-2.5 sm:p-3 border border-white/10 text-center">
                  <span className="text-base sm:text-2xl font-black text-amber-400 block">₹5,000 Cr+</span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Safe Disbursals</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 h-64 sm:h-80 lg:h-full min-h-[280px] relative overflow-hidden">
              <img 
                src="/assets/chit_growth_milestones.jpg" 
                alt="Families and Business Owners Celebrating Success with Jenista Chits" 
                className="w-full h-full object-cover object-center scale-105 hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-slate-900 via-transparent to-transparent opacity-85 lg:opacity-65 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* 3-Way Responsive Comparison Matrix Table */}
        <div className="mt-16 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">
                Detailed Scheme Comparison Matrix
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Understand how Fixed, Auction, and Regular schemes compare across all financial aspects
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 self-start sm:self-auto">
              Central Chit Funds Act Compliant
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[11px] tracking-wider font-extrabold">
                  <th className="py-3 px-4">Parameter</th>
                  <th className="py-3 px-4 text-blue-950 bg-blue-50/60 rounded-tl-xl">Fixed Chit</th>
                  <th className="py-3 px-4 text-indigo-950 bg-indigo-50/60">Auction Chit</th>
                  <th className="py-3 px-4 text-emerald-950 bg-emerald-50/60 rounded-tr-xl">Regular Chit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonFeatures.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {row.feature}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 bg-blue-50/20 font-medium">
                      {row.fixed}
                    </td>
                    <td className={`py-3.5 px-4 bg-indigo-50/20 font-medium ${row.highlight ? 'text-indigo-800 font-bold' : 'text-slate-700'}`}>
                      {row.auction}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 bg-emerald-50/20 font-medium">
                      {row.regular}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Regulatory Trust Badge */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center justify-center px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-200/80 text-xs sm:text-sm font-semibold text-slate-700 gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>All Fixed, Auction, and Regular schemes operate under the regulatory framework of the Chit Funds Act, 1982.</span>
          </div>
        </div>

      </div>

      {/* Scheme Detail Responsive Modal */}
      {selectedDetailScheme && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedDetailScheme(null)}
        >
          <div 
            className="bg-white text-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-6 sm:p-7 border-b text-white flex items-start justify-between ${
              selectedDetailScheme === 'FIXED' 
                ? 'bg-gradient-to-r from-blue-900 to-slate-900 border-blue-800' 
                : selectedDetailScheme === 'AUCTION'
                  ? 'bg-gradient-to-r from-indigo-900 to-slate-900 border-indigo-800'
                  : 'bg-gradient-to-r from-emerald-900 to-slate-900 border-emerald-800'
            }`}>
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
                  {selectedDetailScheme === 'FIXED' && <Lock className="w-6 h-6 text-blue-300" />}
                  {selectedDetailScheme === 'AUCTION' && <Gavel className="w-6 h-6 text-indigo-300" />}
                  {selectedDetailScheme === 'REGULAR' && <CalendarClock className="w-6 h-6 text-emerald-300" />}
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/80 block">
                    {selectedDetailScheme === 'FIXED' ? 'Zero Bidding Risk' : selectedDetailScheme === 'AUCTION' ? 'Monthly Dividend APY' : 'Predetermined Milestones'}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    {selectedDetailScheme === 'FIXED' && 'Fixed Chit Scheme Architecture'}
                    {selectedDetailScheme === 'AUCTION' && 'Auction Chit Scheme Architecture'}
                    {selectedDetailScheme === 'REGULAR' && 'Regular Chit Scheme Architecture'}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailScheme(null)}
                className="text-white/70 hover:text-white p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors shrink-0 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 sm:p-7 overflow-y-auto space-y-5 flex-1 text-xs sm:text-sm">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <h4 className="font-extrabold text-slate-900 mb-1 text-sm">How it Works:</h4>
                <p className="text-slate-600 leading-relaxed">
                  {selectedDetailScheme === 'FIXED' && "In a Fixed Chit, subscribers contribute the exact same installment every month. Every month, a transparent lucky draw is conducted under supervisor observation. The drawn ticket receives 100% face value of the chit (less 5% foreman commission) with zero reverse bidding discount loss."}
                  {selectedDetailScheme === 'AUCTION' && "In an Auction Chit, members who need urgent funds participate in a reverse monthly auction. The subscriber who offers the highest discount wins the prize pool. That discount (minus the standard 5% foreman fee) is redistributed equally to all other subscribers as a dividend, significantly reducing their next monthly installment."}
                  {selectedDetailScheme === 'REGULAR' && "In a Regular Chit, the payout turn order is agreed or scheduled upon enrollment. Each subscriber contributes equal monthly installments and receives their full prize fund on their allotted scheduled turn, perfect for planned weddings, university fees, or milestone renovations."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Monthly Installment Outflow</span>
                  <strong className="text-slate-900 text-sm font-bold block">
                    {selectedDetailScheme === 'FIXED' && `₹${currentSlab.fixedMonthly.toLocaleString('en-IN')}/mo (Fixed Throughout)`}
                    {selectedDetailScheme === 'AUCTION' && `~₹${currentSlab.auctionAvgMonthly.toLocaleString('en-IN')}/mo (Reduced via Dividends)`}
                    {selectedDetailScheme === 'REGULAR' && `₹${currentSlab.regularMonthly.toLocaleString('en-IN')}/mo (Equal Predictable)`}
                  </strong>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Prize Fund Received</span>
                  <strong className="text-slate-900 text-sm font-bold block">
                    {selectedDetailScheme === 'FIXED' && `100% Face Value (₹${(currentSlab.value * 0.95).toLocaleString('en-IN')} net)`}
                    {selectedDetailScheme === 'AUCTION' && `Prize Pool minus Winning Bid Discount`}
                    {selectedDetailScheme === 'REGULAR' && `100% Face Value on Scheduled Month`}
                  </strong>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/60 text-blue-950 space-y-1.5">
                <h5 className="font-extrabold text-xs uppercase tracking-wide text-blue-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Key Regulatory Rules
                </h5>
                <ul className="space-y-1 text-slate-700 text-xs">
                  <li>• Governed under Central Chit Funds Act, 1982.</li>
                  <li>• Foreman commission is legally capped at 5%.</li>
                  <li>• Disbursals processed within 24 to 48 hours of standard surety clearance.</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                Chit Fund Value: ₹{currentSlab.value.toLocaleString('en-IN')}
              </span>
              <a 
                href="#contact" 
                onClick={() => setSelectedDetailScheme(null)}
                className="w-full sm:w-auto"
              >
                <button
                  type="button"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <span>Enrol in {selectedDetailScheme} Scheme</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
