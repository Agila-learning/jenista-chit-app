import { HeartHandshake, Shield, Target, Award, CheckCircle2, Users } from 'lucide-react';

export const AboutUsSection = () => {
  return (
    <section id="about" className="py-24 bg-gradient-to-b from-white via-slate-50 to-white relative overflow-hidden">
      {/* Decorative luminous gradient elements */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Story & Trust Architecture (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 via-emerald-50 to-blue-50 border border-blue-200/80 rounded-full px-4 py-1.5 shadow-2xs">
              <Award className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-blue-900 tracking-wider uppercase">
                25+ Years Legacy of Integrity
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Empowering Middle India’s <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600">
                Financial Dreams & Growth.
              </span>
            </h2>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Jenista Chits is a pioneer in bringing disciplined savings and democratic credit to everyday families and enterprising small business owners. Under the statutory framework of the Chit Funds Act, 1982, we provide a secure, transparent platform to save smartly and borrow without collateral constraints.
            </p>
            
            {/* Core Values Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-blue-400 hover:shadow-md transition-all group">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Shield className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">100% Regulated</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Audited periodically under the Central Chit Funds Act.</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all group">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Target className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">Milestone Driven</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Tailored for weddings, education, and shop expansions.</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-amber-400 hover:shadow-md transition-all group">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">2 Lakh+ Members</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Trusted across Tamil Nadu with zero delayed payouts.</p>
              </div>
            </div>

            {/* Quick bullets */}
            <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Government Recognized Registrar
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Digital Auctions & Instant Passbook
              </span>
            </div>
          </div>

          {/* Right Column: Layered Images & Milestone Card (5 Cols) */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 group">
              <img 
                src="/assets/family.jpg" 
                alt="Happy Indian Family Planning Finances" 
                className="w-full h-[420px] sm:h-[480px] object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              
              {/* Overlay Stat Capsule 1: Disbursals */}
              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-lg border border-white/40">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Audited Total</span>
                <span className="text-xl font-black text-emerald-600">₹5,000+ Cr</span>
              </div>

              {/* Overlay Stat Capsule 2: Happy Subscribers */}
              <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-xl p-4 rounded-2xl border border-white/20 text-white flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-300 block">Subscribers Milestone</span>
                  <span className="text-lg font-extrabold text-white">2,00,000+ Families Enrolled</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
};
