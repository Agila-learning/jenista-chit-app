import { 
  CalendarDays, 
  BellRing, 
  Smartphone, 
  CreditCard, 
  TrendingUp, 
  Sparkles, 
  ArrowRight 
} from 'lucide-react';

export const AppFeaturesSection = () => {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-28 relative z-10">
        
        {/* Simplified Borrowing & Amplified Saving with Piggy Bank */}
        <div>
          <div className="grid md:grid-cols-2 gap-8 lg:gap-16 mb-16">
            <div className="bg-gradient-to-br from-blue-50/80 via-white to-blue-50/40 p-8 rounded-3xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-5 shadow-md shadow-blue-500/20">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">Simplified Borrowing</h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                Borrowing has never been this stress-free. Avoid stringent bank collateral or high-interest moneylenders. Receive quick capital payout with transparent documentation when emergency liquidity is needed.
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 p-8 rounded-3xl border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-5 shadow-md shadow-emerald-500/20">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">Amplified Monthly Savings</h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                Experience the magic of monthly chit dividends. Every month, the discount from the prized bidder is redistributed to all non-prized subscribers, effectively boosting your annual returns far beyond standard bank deposits.
              </p>
            </div>
          </div>
          
          {/* Visual Story with Piggy Bank */}
          <div className="bg-gradient-to-r from-slate-900 via-[#0d1d36] to-slate-900 rounded-3xl p-8 sm:p-12 text-white border border-slate-800 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="md:w-5/12 relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl opacity-60"></div>
              <img 
                src="/assets/piggy.jpg" 
                alt="Savings Piggy Bank" 
                className="relative z-10 w-full max-w-xs mx-auto hover:-translate-y-2 transition-transform duration-500 drop-shadow-2xl rounded-3xl" 
              />
            </div>
            
            <div className="md:w-7/12 text-center md:text-left space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Disciplined Goal Accumulation</span>
              </div>
              
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                Turn Every Rupee into a <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300">
                  Stepping Stone for Success.
                </span>
              </h2>
              
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-normal">
                A simple borrowing process that cuts down complicated bank red tape and does not burden you with exorbitant compounded interest. Plan methodically, claim when needed, and fulfill your life goals with complete peace of mind.
              </p>
              
              <div className="pt-2">
                <a href="#contact">
                  <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 mx-auto md:mx-0">
                    <span>Start Your Savings Journey</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Digital Mobile App Experience Section */}
        <div className="text-center pt-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold uppercase tracking-wider mb-3">
            <Smartphone className="w-4 h-4 text-blue-600" />
            <span>Digital Portal & Mobile Experience</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
            Jenista Chits in Your Pocket
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-16">
            Access your active subscriptions, review live payment schedules, track transparent auctions, and download official receipts on any smartphone device.
          </p>

          <div className="grid md:grid-cols-3 gap-8 items-center">
            
            {/* Left Features */}
            <div className="space-y-8 sm:space-y-12 order-2 md:order-1 text-center md:text-right">
              <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-200/80 hover:border-blue-400 hover:bg-white hover:shadow-md transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto md:ml-auto md:mr-0 mb-4 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                  <CalendarDays className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-base sm:text-lg mb-1">Live Payment Schedules</h4>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">View upcoming installments, due dates, and your digital passbook with complete breakdown.</p>
              </div>
              
              <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-200/80 hover:border-blue-400 hover:bg-white hover:shadow-md transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto md:ml-auto md:mr-0 mb-4 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                  <BellRing className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-base sm:text-lg mb-1">Instant Due Reminders</h4>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">Receive automated WhatsApp, SMS, and email alerts so you never miss a dividend.</p>
              </div>
            </div>

            {/* Center Mobile App Graphic */}
            <div className="relative order-1 md:order-2">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 via-indigo-500/20 to-emerald-500/20 rounded-[3rem] blur-3xl opacity-70 scale-95 pointer-events-none"></div>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-900 bg-slate-900 p-2 group hover:scale-[1.02] transition-transform duration-500">
                <img 
                  src="/assets/app.jpg" 
                  alt="Digital Chit Fund Mobile Application" 
                  className="w-full rounded-2xl object-cover" 
                />
              </div>
            </div>

            {/* Right Features */}
            <div className="space-y-8 sm:space-y-12 order-3 text-center md:text-left">
              <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-200/80 hover:border-emerald-400 hover:bg-white hover:shadow-md transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto md:mr-auto md:ml-0 mb-4 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                  <Smartphone className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-base sm:text-lg mb-1">Manage Multiple Chits</h4>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">Enroll, monitor, and participate in online auctions for all your family accounts simultaneously.</p>
              </div>
              
              <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-200/80 hover:border-emerald-400 hover:bg-white hover:shadow-md transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 mx-auto md:mr-auto md:ml-0 mb-4 flex items-center justify-center group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-sm">
                  <CreditCard className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-base sm:text-lg mb-1">Secured UPI & Net Banking</h4>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">Direct payments via Google Pay, PhonePe, Paytm, or Net Banking with immediate receipt generation.</p>
              </div>
            </div>

          </div>
        </div>
        
      </div>
    </section>
  );
};
