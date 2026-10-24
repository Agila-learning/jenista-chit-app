import { useState, useEffect } from 'react';
import { Calendar, ShieldCheck, ArrowLeft, Phone, Building } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { calculateRegularPlanSchedule, defaultRegularCategories, regularPlanTerms } from '../../utils/chitCalculations';

const colorSchemes = [
  { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-950', badge: 'bg-amber-600 text-white', th: 'bg-amber-600', subDue: 'bg-amber-500/95 text-amber-950', subPay: 'bg-amber-500/80 text-amber-950', cellBg: 'bg-amber-50/50', cellPay: 'text-amber-950' },
  { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-950', badge: 'bg-emerald-600 text-white', th: 'bg-emerald-600', subDue: 'bg-emerald-500/95', subPay: 'bg-emerald-500/80', cellBg: 'bg-emerald-50/50', cellPay: 'text-emerald-900' },
  { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-950', badge: 'bg-blue-600 text-white', th: 'bg-blue-600', subDue: 'bg-blue-500/95', subPay: 'bg-blue-500/80', cellBg: 'bg-blue-50/50', cellPay: 'text-blue-900' },
  { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-950', badge: 'bg-purple-600 text-white', th: 'bg-purple-700', subDue: 'bg-purple-600/95', subPay: 'bg-purple-600/80', cellBg: 'bg-purple-50/50', cellPay: 'text-purple-900' },
  { border: 'border-rose-500', bg: 'bg-rose-50', text: 'text-rose-950', badge: 'bg-rose-600 text-white', th: 'bg-rose-600', subDue: 'bg-rose-500/95', subPay: 'bg-rose-500/80', cellBg: 'bg-rose-50/50', cellPay: 'text-rose-900' },
];

export const RegularPlanSchedule = () => {
  const [categories, setCategories] = useState<{ id: number; value: number }[]>(() => {
    const saved = localStorage.getItem('mockRegularCategories');
    return saved ? JSON.parse(saved) : defaultRegularCategories;
  });

  const [selectedPlan, setSelectedPlan] = useState<string>('all');
  const [mobileSelectedPlan, setMobileSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    if (mobileSelectedPlan) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileSelectedPlan]);

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('mockRegularCategories');
      if (saved) setCategories(JSON.parse(saved));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Compute auto-calculated plan details for each category
  const planDetails = categories.map((cat, idx) => {
    const calc = calculateRegularPlanSchedule(cat.value);
    const styling = colorSchemes[idx % colorSchemes.length];
    return {
      id: cat.value.toString(),
      value: cat.value,
      name: formatCurrency(cat.value),
      minDueStr: `${formatCurrency(calc.minDue)}/mo`,
      calc,
      styling,
    };
  });

  const visiblePlans = selectedPlan === 'all' 
    ? planDetails 
    : planDetails.filter(p => p.id === selectedPlan);

  const activeMobilePlan = planDetails.find(p => p.id === mobileSelectedPlan) || planDetails[0];

  const months = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Official Brochure Header Card */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-yellow-900 text-white p-5 rounded-2xl shadow-md border border-amber-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950">
              Official Brochure Plan
            </span>
            <span className="text-xs text-amber-200">CIN: U67190TZ2020PTC033361</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
            JENISTA CHITS SCHEDULE 20 MONTHS - 20 MEMBERS
          </h2>
          <p className="text-xs text-amber-100/90 mt-0.5">
            Low dues from 3.75%, guaranteed prize payouts up to 95%, and total investment capped at 84.35%.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold shrink-0">
          <div className="px-3 py-1.5 bg-black/25 backdrop-blur-xs rounded-xl flex items-center gap-1.5 border border-white/10">
            <Building className="w-3.5 h-3.5 text-amber-300" />
            <span>Branch: Hosur • HO: Thoothukudi</span>
          </div>
          <div className="px-3 py-1.5 bg-black/25 backdrop-blur-xs rounded-xl flex items-center gap-1.5 border border-white/10">
            <Phone className="w-3.5 h-3.5 text-amber-300" />
            <span>70942 95556</span>
          </div>
        </div>
      </div>

      {/* Mobile Full Screen Schedule View (Only appears after user selects a scheme on mobile) */}
      {mobileSelectedPlan && activeMobilePlan && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col h-[100dvh] w-screen overflow-hidden md:hidden animate-in fade-in duration-200">
          {/* Top Header */}
          <div className="bg-amber-950 text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-md">
            <div className="overflow-hidden">
              <h3 className="font-extrabold text-sm tracking-wide text-white truncate">
                {activeMobilePlan.name} REGULAR CHIT
              </h3>
              <p className="text-[10px] text-amber-200 truncate">
                20 Months • Jenista Brochure Schedule
              </p>
            </div>
            <span className="text-[10px] bg-amber-900 text-amber-200 px-2.5 py-1 rounded-full font-bold shrink-0">
              20 Members
            </span>
          </div>

          {/* Quick Metrics Bar */}
          <div className="bg-amber-50/70 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs shrink-0">
            <div>
              <span className="text-neutral-500 text-[10px] uppercase font-bold block">Months 2-8 Due</span>
              <span className="font-extrabold text-amber-900">{activeMobilePlan.minDueStr}</span>
            </div>
            <div className="text-center">
              <span className="text-neutral-500 text-[10px] uppercase font-bold block">Total 20M Due</span>
              <span className="font-extrabold text-neutral-900">{formatCurrency(activeMobilePlan.calc.totalDue)}</span>
            </div>
            <div className="text-right">
              <span className="text-neutral-500 text-[10px] uppercase font-bold block">M20 Payout</span>
              <span className="font-extrabold text-emerald-700">{formatCurrency(activeMobilePlan.calc.maxPayout)}</span>
            </div>
          </div>

          {/* Full Screen Scrollable Schedule Table */}
          <div className="flex-1 overflow-auto p-2 bg-neutral-100">
            <div className="bg-white rounded-xl shadow-xs border border-neutral-200 overflow-hidden">
              <table className="w-full text-center text-xs font-sans divide-y divide-neutral-200">
                <thead className="sticky top-0 z-10 shadow-xs">
                  <tr className="text-white font-black text-xs">
                    <th rowSpan={2} className="bg-neutral-900 px-2 py-2.5 border-r border-neutral-800 w-14">
                      MONTH
                    </th>
                    <th colSpan={2} className={`${activeMobilePlan.styling.th} px-3 py-2 text-center text-white`}>
                      {activeMobilePlan.name} SCHEDULE (20M)
                    </th>
                  </tr>
                  <tr className="text-[10px] font-bold uppercase tracking-wider">
                    <th className={`${activeMobilePlan.styling.subDue} px-3 py-1.5 border-r border-white/20`}>DUE</th>
                    <th className={`${activeMobilePlan.styling.subPay} px-3 py-1.5 font-black`}>PAYMENT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-semibold text-xs bg-white">
                  {months.map((m) => {
                    const row = activeMobilePlan.calc.schedule[m - 1];
                    return (
                      <tr key={m} className="hover:bg-amber-50/40 transition-colors">
                        <td className="bg-neutral-900 text-white font-bold py-2.5 px-2 border-r border-neutral-800">
                          {m}
                        </td>
                        <td className={`py-2.5 px-3 ${activeMobilePlan.styling.cellBg} border-r border-neutral-100 font-bold`}>
                          {row ? formatCurrency(row.due) : '-'}
                        </td>
                        <td className={`py-2.5 px-3 ${activeMobilePlan.styling.cellBg} ${activeMobilePlan.styling.cellPay} font-black`}>
                          {row?.isCompany ? (
                            <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-black text-[11px]">
                              COMPANY
                            </span>
                          ) : row ? (
                            formatCurrency(row.payment)
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total Row */}
                  <tr className="bg-amber-100 font-black text-amber-950">
                    <td className="bg-neutral-900 text-amber-400 py-2.5 px-2 font-black border-r border-neutral-800">
                      TOTAL
                    </td>
                    <td className="py-2.5 px-3 border-r border-amber-200">
                      {formatCurrency(activeMobilePlan.calc.totalDue)}
                    </td>
                    <td className="py-2.5 px-3 text-amber-950 font-black">
                      {formatCurrency(activeMobilePlan.calc.maxPayout)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Bar with Back to Scheme Options Button */}
          <div className="p-3 bg-white border-t border-neutral-200 shrink-0">
            <button
              onClick={() => setMobileSelectedPlan(null)}
              className="w-full py-2.5 bg-amber-950 hover:bg-amber-900 active:scale-98 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Scheme Options</span>
            </button>
          </div>
        </div>
      )}

      {/* Plan Category Quick Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {planDetails.map((p) => {
          const isSelected = selectedPlan === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                setSelectedPlan(p.id);
                setMobileSelectedPlan(p.id);
              }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                isSelected ? 'ring-2 ring-amber-600 shadow-md scale-[1.02]' : 'hover:shadow'
              } ${p.styling.border} ${p.styling.bg} ${p.styling.text}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${p.styling.badge}`}>
                  20 Months
                </span>
                {isSelected && <span className="text-xs font-bold text-amber-800">Selected</span>}
              </div>
              <h4 className="text-lg font-black">{p.name}</h4>
              <p className="text-xs font-semibold opacity-90 mt-1">Due: {p.minDueStr} (M2-8)</p>
              <p className="text-[11px] font-medium opacity-80">Total Due: {formatCurrency(p.calc.totalDue)}</p>

              {/* Mobile CTA prompt */}
              <div className="md:hidden mt-2 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] font-bold text-amber-900">
                <span>View Full Table</span>
                <span>→</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile Hint Banner (Shown only on mobile when no scheme is in full-screen) */}
      <div className="md:hidden bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-xs font-semibold text-amber-900 shadow-xs">
        <span>Tap any scheme above to view the 20-month regular schedule table in full screen.</span>
      </div>

      {/* Desktop Filter Tabs & Table (Hidden on Mobile, Visible on Desktop) */}
      <div className="hidden md:block space-y-6">
        {/* Filter Tabs & Poster Action */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between bg-white p-2 rounded-xl border border-neutral-200 shadow-xs">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-neutral-500 px-3">Filter Column:</span>
            <button
              onClick={() => setSelectedPlan('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                selectedPlan === 'all' ? 'bg-amber-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              All Plans (Pamphlet View)
            </button>
            {planDetails.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlan(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  selectedPlan === p.id ? 'bg-amber-700 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="text-xs text-amber-900 font-bold px-3 py-1 bg-amber-50 rounded-lg border border-amber-200">
            20 Months • 20 Members Standard Schedule
          </div>
        </div>

        {/* Schedule Table (Exact Replica of Image 2 Pamphlet) */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="bg-amber-900 text-white px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-300" />
              <h3 className="font-bold text-base md:text-lg tracking-wide uppercase">
                Jenista Chits Schedule 20 Months - 20 Members
              </h3>
            </div>
            <span className="text-xs bg-amber-800 text-amber-200 px-3 py-1 rounded-full font-semibold">
              Total Invested: 84.35%
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-center text-xs md:text-sm font-sans">
              <thead>
                {/* Main Plan Headers */}
                <tr className="text-white font-black text-sm">
                  <th rowSpan={2} className="bg-amber-950 px-3 py-3 border-r border-amber-900 w-20">
                    MONTH
                  </th>
                  {visiblePlans.map((p) => (
                    <th key={p.id} colSpan={2} className={`${p.styling.th} px-4 py-2 border-r border-white/20 text-white`}>
                      {p.name}
                    </th>
                  ))}
                </tr>

                {/* Sub Headers (Due vs Payment) */}
                <tr className="text-xs font-bold uppercase tracking-wider">
                  {visiblePlans.map((p) => (
                    <tr key={`${p.id}-sub`} className="contents">
                      <th className={`${p.styling.subDue} px-3 py-2 border-r border-white/20`}>DUE</th>
                      <th className={`${p.styling.subPay} px-3 py-2 border-r border-white/20`}>PAYMENT</th>
                    </tr>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-200 font-semibold text-neutral-800">
                {months.map((m) => (
                  <tr key={m} className="hover:bg-amber-50/40 transition-colors">
                    {/* Month Index */}
                    <td className="bg-amber-950 text-white font-bold py-2.5 px-3 border-r border-amber-900">
                      {m}
                    </td>

                    {/* Columns for each visible plan */}
                    {visiblePlans.map((p) => {
                      const row = p.calc.schedule[m - 1];
                      return (
                        <tr key={`${p.id}-${m}`} className="contents">
                          <td className={`py-2.5 px-3 ${p.styling.cellBg} border-r border-neutral-200 font-bold`}>
                            {row ? formatCurrency(row.due) : '-'}
                          </td>
                          <td className={`py-2.5 px-3 ${p.styling.cellBg} ${p.styling.cellPay} font-black border-r border-neutral-200`}>
                            {row?.isCompany ? (
                              <span className="px-2.5 py-0.5 bg-amber-200 text-amber-950 rounded font-black text-xs">
                                COMPANY
                              </span>
                            ) : row ? (
                              formatCurrency(row.payment)
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tr>
                ))}

                {/* Exact TOTAL Row from Image 2 */}
                <tr className="bg-amber-100 font-black text-amber-950 text-sm border-t-2 border-amber-300">
                  <td className="bg-amber-950 text-amber-300 font-black py-3 px-3 uppercase tracking-wider border-r border-amber-900">
                    TOTAL
                  </td>
                  {visiblePlans.map((p) => (
                    <tr key={`${p.id}-total`} className="contents">
                      <td className="py-3 px-3 bg-amber-100/90 border-r border-amber-200 font-black text-base">
                        {formatCurrency(p.calc.totalDue)}
                      </td>
                      <td className="py-3 px-3 bg-amber-100/90 border-r border-amber-200 font-black text-base text-amber-950">
                        {formatCurrency(p.calc.maxPayout)}
                      </td>
                    </tr>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Official Terms & Conditions (நிபந்தனைகள்) matching bottom of Image 2 */}
      <div className="p-6 bg-gradient-to-r from-yellow-100 via-amber-50 to-yellow-100 rounded-2xl border-2 border-amber-300 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-6 h-6 text-amber-800" />
          <h4 className="font-black text-amber-950 text-lg tracking-wide">
            நிபந்தனைகள் (Terms & Conditions)
          </h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {regularPlanTerms.map((term) => (
            <div key={term.id} className="p-3.5 bg-white/95 rounded-xl border border-amber-200 shadow-xs flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                {term.id}
              </span>
              <div>
                <p className="font-extrabold text-neutral-900 text-sm leading-snug">{term.tamil}</p>
                <p className="text-neutral-500 mt-1 text-xs leading-relaxed">{term.english}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-amber-300/70 flex flex-col sm:flex-row items-center justify-between text-xs text-amber-950 font-bold gap-2">
          <span>JENISTA CHITS PVT. LTD. • FAITH & PERSEVERANCE WINS</span>
          <span>Thoothukudi HO | Hosur Branch | Mob: 70942 95556, 70940 45556</span>
        </div>
      </div>
    </div>
  );
};
