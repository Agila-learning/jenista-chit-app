import { useState, useEffect } from 'react';
import { Calendar, Eye, ShieldCheck, Award, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { calculateFixedPlanSchedule } from '../../utils/chitCalculations';

const defaultFixedCategories = [
  { id: 1, value: 100000 },
  { id: 2, value: 200000 },
  { id: 3, value: 500000 },
  { id: 4, value: 1000000 },
];

const colorSchemes = [
  { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-950', badge: 'bg-orange-600 text-white', th: 'bg-orange-600', subDue: 'bg-orange-500/95', subPay: 'bg-orange-500/80', cellBg: 'bg-orange-50/50', cellPay: 'text-orange-900' },
  { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-950', badge: 'bg-purple-600 text-white', th: 'bg-purple-700', subDue: 'bg-purple-600/95', subPay: 'bg-purple-600/80', cellBg: 'bg-purple-50/50', cellPay: 'text-purple-900' },
  { border: 'border-sky-500', bg: 'bg-sky-50', text: 'text-sky-950', badge: 'bg-sky-600 text-white', th: 'bg-sky-600', subDue: 'bg-sky-500/95', subPay: 'bg-sky-500/80', cellBg: 'bg-sky-50/50', cellPay: 'text-sky-900' },
  { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-950', badge: 'bg-amber-600 text-white', th: 'bg-amber-500', subDue: 'bg-amber-400/95 text-amber-950', subPay: 'bg-amber-400/80 text-amber-950', cellBg: 'bg-amber-50/50', cellPay: 'text-amber-900' },
  { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-950', badge: 'bg-emerald-600 text-white', th: 'bg-emerald-600', subDue: 'bg-emerald-500/95', subPay: 'bg-emerald-500/80', cellBg: 'bg-emerald-50/50', cellPay: 'text-emerald-900' },
  { border: 'border-rose-500', bg: 'bg-rose-50', text: 'text-rose-950', badge: 'bg-rose-600 text-white', th: 'bg-rose-600', subDue: 'bg-rose-500/95', subPay: 'bg-rose-500/80', cellBg: 'bg-rose-50/50', cellPay: 'text-rose-900' },
];

const rules = [
  {
    tamil: 'பிரதி மாதம் 10/15 ம் தேதி மாலை 6.00 மணி முதல் 7.00 மணி வரை ஏலம் விடப்படும்.',
    english: 'Auction/Draw takes place every month on 10th or 15th between 6:00 PM and 7:00 PM.',
  },
  {
    tamil: 'ஏலம் நடைபெற்று முடிந்து 3 நாட்களுக்குள் சீட்டுத்தொகையை கண்டிப்பாக செலுத்த வேண்டும்.',
    english: 'Chit installments must be paid strictly within 3 days after auction completion.',
  },
  {
    tamil: 'தொடர்ந்து 3 மாதங்கள் சீட்டு கட்டத் தவறினால் சீட்டிலிருந்து நீக்கப்படுவர், சீட்டு முடிந்தவுடன் கட்டிய பணம் வழங்கப்படும்.',
    english: 'Failure to pay for 3 consecutive months will lead to removal; paid amount will be refunded upon chit completion.',
  },
  {
    tamil: 'சீட்டு எடுத்தவருக்கு ஜாமீன்தாரரும் Co-Applicant-ம் முழுப் பொறுப்பு.',
    english: 'The guarantor and Co-Applicant bear full responsibility for the prize chit winner.',
  },
  {
    tamil: 'குலுக்கல் சீட்டு வாடிக்கையாளர்கள் குலுக்கல் நேரத்திற்கு முன்பாக சீட்டு தொகையை கண்டிப்பாக செலுத்த வேண்டும்.',
    english: 'Lucky draw members must clear their due amount strictly prior to the draw time.',
  },
  {
    tamil: 'சீட்டு எடுத்த நபர் ஜாமீன்தாரருடன் சேர்ந்து Co.Applicant உடன் வந்து, முத்திரைத்தாள் (பத்திரம்), அடையாள அட்டை நகல், வங்கி காசோலை (Cheque) இவைகளை சமர்ப்பித்து சீட்டு முடிந்து 10 நாட்களுக்குள் பணம் பெற்றுக் கொள்ளலாம்.',
    english: 'Prize winners must present Guarantor and Co-Applicant with Stamp Paper, ID Proofs, and Bank Cheque to receive funds within 10 days.',
  },
  {
    tamil: 'சீட்டு வேண்டுபவர்களை மட்டுமே குலுக்கலில் சேர்த்துக்கொள்ளப்படும்.',
    english: 'Only customers requesting the chit will be included in the draw.',
  },
];

export const FixedPlanSchedule = () => {
  const [categories, setCategories] = useState<{ id: number; value: number }[]>(() => {
    const saved = localStorage.getItem('mockFixedCategories');
    return saved ? JSON.parse(saved) : defaultFixedCategories;
  });

  const [selectedPlan, setSelectedPlan] = useState<string>('all');
  const [mobileSelectedPlan, setMobileSelectedPlan] = useState<string | null>(null);
  const [showPosterModal, setShowPosterModal] = useState(false);

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
      const saved = localStorage.getItem('mockFixedCategories');
      if (saved) setCategories(JSON.parse(saved));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Compute auto-calculated plan details for each category
  const planDetails = categories.map((cat, idx) => {
    const calc = calculateFixedPlanSchedule(cat.value);
    const styling = colorSchemes[idx % colorSchemes.length];
    return {
      id: cat.value.toString(),
      value: cat.value,
      name: formatCurrency(cat.value),
      dueStr: `${formatCurrency(calc.monthlyDue)}/mo`,
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
      {/* Mobile Full Screen Schedule View (Only appears after user selects a scheme on mobile) */}
      {mobileSelectedPlan && activeMobilePlan && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col h-[100dvh] w-screen overflow-hidden md:hidden animate-in fade-in duration-200">
          {/* Top Header */}
          <div className="bg-emerald-950 text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-md">
            <div className="overflow-hidden">
              <h3 className="font-extrabold text-sm tracking-wide text-white truncate">
                {activeMobilePlan.name} FIXED CHIT
              </h3>
              <p className="text-[10px] text-emerald-200 truncate">
                20 Months • Fixed Installments
              </p>
            </div>
            <span className="text-[10px] bg-emerald-900 text-emerald-200 px-2.5 py-1 rounded-full font-bold shrink-0">
              20 Members
            </span>
          </div>

          {/* Quick Metrics Bar */}
          <div className="bg-neutral-50 border-b border-neutral-200 px-4 py-2 flex items-center justify-between text-xs shrink-0">
            <div>
              <span className="text-neutral-500 text-[10px] uppercase font-bold block">Monthly Due</span>
              <span className="font-extrabold text-neutral-800">{activeMobilePlan.dueStr}</span>
            </div>
            <div className="text-center">
              <span className="text-neutral-500 text-[10px] uppercase font-bold block">Chit Value</span>
              <span className="font-extrabold text-emerald-900">{activeMobilePlan.name}</span>
            </div>
            <div className="text-right">
              <span className="text-neutral-500 text-[10px] uppercase font-bold block">Post-Draw Due</span>
              <span className="font-extrabold text-amber-700">{formatCurrency(activeMobilePlan.calc.postDrawTotalDue)}/mo</span>
            </div>
          </div>

          {/* Full Screen Scrollable Schedule Table */}
          <div className="flex-1 overflow-auto p-2 bg-neutral-100">
            <div className="bg-white rounded-xl shadow-xs border border-neutral-200 overflow-hidden">
              <table className="w-full text-center text-xs font-sans divide-y divide-neutral-200">
                <thead className="sticky top-0 z-10 shadow-xs">
                  <tr className="text-white font-black text-xs">
                    <th rowSpan={2} className="bg-neutral-900 px-2 py-2.5 border-r border-neutral-800 w-12">
                      MONTH
                    </th>
                    <th colSpan={2} className={`${activeMobilePlan.styling.th} px-3 py-2 text-center`}>
                      {activeMobilePlan.name} SCHEDULE (20M)
                    </th>
                  </tr>
                  <tr className="text-[10px] font-bold text-white uppercase tracking-wider">
                    <th className={`${activeMobilePlan.styling.subDue} px-3 py-1.5 border-r border-white/20`}>MONTHLY DUE</th>
                    <th className={`${activeMobilePlan.styling.subPay} px-3 py-1.5 font-black`}>PRIZE PAYOUT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-semibold text-xs bg-white">
                  {months.map((m) => {
                    const row = activeMobilePlan.calc.schedule[m - 1];
                    return (
                      <tr key={m} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="bg-neutral-900 text-white font-bold py-2.5 px-2 border-r border-neutral-800">
                          {m}
                        </td>
                        <td className={`py-2.5 px-3 ${activeMobilePlan.styling.cellBg} border-r border-neutral-100 font-bold`}>
                          {row ? formatCurrency(row.due) : '-'}
                        </td>
                        <td className={`py-2.5 px-3 ${activeMobilePlan.styling.cellBg} ${activeMobilePlan.styling.cellPay} font-black`}>
                          {row ? formatCurrency(row.payout) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Bar with Back to Scheme Options Button */}
          <div className="p-3 bg-white border-t border-neutral-200 shrink-0">
            <button
              onClick={() => setMobileSelectedPlan(null)}
              className="w-full py-2.5 bg-emerald-950 hover:bg-emerald-900 active:scale-98 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
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
                isSelected ? 'ring-2 ring-primary-600 shadow-md scale-[1.02]' : 'hover:shadow'
              } ${p.styling.border} ${p.styling.bg} ${p.styling.text}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${p.styling.badge}`}>
                  20 Months
                </span>
                {isSelected && <span className="text-xs font-bold text-primary-700">Selected</span>}
              </div>
              <h4 className="text-lg font-black">{p.name}</h4>
              <p className="text-xs font-semibold opacity-80 mt-1">Due: {p.dueStr}</p>

              {/* Mobile CTA prompt */}
              <div className="md:hidden mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] font-bold text-emerald-900">
                <span>View Full Table</span>
                <span>→</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile Hint Banner (Shown only on mobile when no scheme is in full-screen) */}
      <div className="md:hidden bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs font-semibold text-emerald-900 shadow-xs">
        <span>Tap any scheme above to view the 20-month fixed schedule table in full screen.</span>
      </div>

      {/* Desktop Filter Tabs & Table (Hidden on Mobile, Visible on Desktop) */}
      <div className="hidden md:block space-y-6">
        {/* Filter Tabs & Poster Action */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between bg-white p-2 rounded-xl border border-neutral-200">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-neutral-500 px-3">Filter Column:</span>
          <button
            onClick={() => setSelectedPlan('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              selectedPlan === 'all' ? 'bg-primary-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            All Plans
          </button>
          {planDetails.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                selectedPlan === p.id ? 'bg-emerald-700 text-white' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowPosterModal(true)}
          className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shrink-0 self-end sm:self-auto mr-1"
        >
          <Eye className="w-3.5 h-3.5 text-emerald-700" />
          View Original Chart Image
        </button>
      </div>

      {/* Schedule Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="bg-emerald-900 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-300" />
            <h3 className="font-bold text-base md:text-lg tracking-wide uppercase">
              Schedule Table (Month 1 to 20 • Auto-Calculated)
            </h3>
          </div>
          <span className="text-xs bg-emerald-800 text-emerald-200 px-3 py-1 rounded-full font-semibold">
            20 Members
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-center text-xs md:text-sm font-sans">
            <thead>
              {/* Main Plan Headers */}
              <tr className="text-white font-black text-sm">
                <th rowSpan={2} className="bg-red-800 px-3 py-3 border-r border-red-700 w-16">
                  MONTH
                </th>
                {visiblePlans.map((p) => (
                  <th key={p.id} colSpan={2} className={`${p.styling.th} px-4 py-2 border-r border-white/20`}>
                    {p.name}
                  </th>
                ))}
              </tr>

              {/* Sub Headers (Due vs Payment) */}
              <tr className="text-xs font-bold text-white uppercase tracking-wider">
                {visiblePlans.map((p) => (
                  <tr key={`${p.id}-sub`} className="contents">
                    <th className={`${p.styling.subDue} px-3 py-2 border-r border-white/20`}>DUE</th>
                    <th className={`${p.styling.subPay} px-3 py-2 border-r border-white/20`}>PAYMENT</th>
                  </tr>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-200 font-semibold">
              {months.map((m) => (
                <tr key={m} className="hover:bg-neutral-50/80 transition-colors">
                  {/* Month Index */}
                  <td className="bg-red-800 text-white font-bold py-2.5 px-3 border-r border-red-700">
                    {m}
                  </td>

                  {/* Columns for each visible plan */}
                  {visiblePlans.map((p) => {
                    const row = p.calc.schedule[m - 1];
                    return (
                      <tr key={`${p.id}-${m}`} className="contents">
                        <td className={`py-2.5 px-3 ${p.styling.cellBg} border-r border-neutral-100`}>
                          {row ? formatCurrency(row.due) : '-'}
                        </td>
                        <td className={`py-2.5 px-3 ${p.styling.cellBg} ${p.styling.cellPay} font-bold border-r border-neutral-200`}>
                          {row ? formatCurrency(row.payout) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      {/* Post-Draw Installment Calculation Card */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-5 h-5 text-amber-700" />
          <h4 className="font-extrabold text-amber-950 text-base">
            சீட்டு எடுத்த நபர் அடுத்த மாதத்திலிருந்து கட்ட வேண்டிய தொகை (Post-Draw Due Structure)
          </h4>
        </div>
        <p className="text-xs text-amber-800 mb-4 font-medium">
          Once you win/receive the prize money, your revised monthly installments for the remaining months (Monthly Due + 1% Chit Value):
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {planDetails.map((p) => (
            <div key={p.id} className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase">{p.name} Chit</span>
              <div className="mt-2 text-sm text-neutral-600 font-medium">
                {formatCurrency(p.calc.monthlyDue)} + <span className="text-amber-700 font-bold">{formatCurrency(p.calc.postDrawFee)}</span>
              </div>
              <div className="mt-1 text-base font-black text-amber-950">
                = {formatCurrency(p.calc.postDrawTotalDue)} / month
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Terms & Conditions (நிபந்தனைகள்) */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 md:p-8">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-neutral-900">
                நிபந்தனைகள் (Rules & Regulations)
              </h3>
              <p className="text-xs text-neutral-500">Official terms governing Jenista Chits participation</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs font-bold">
            7 Guidelines
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule, index) => (
            <div
              key={index}
              className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-white hover:border-primary-400 hover:shadow-sm transition-all flex gap-3.5"
            >
              <div className="w-7 h-7 rounded-full bg-primary-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                {index + 1}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-neutral-900 leading-snug">
                  {rule.tamil}
                </p>
                <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                  {rule.english}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Motto */}
        <div className="mt-8 pt-6 border-t border-neutral-200 flex flex-col sm:flex-row justify-between items-center text-center gap-3">
          <div className="text-base md:text-lg font-black text-emerald-800">
            சேமிப்போம்! நல் வாழ்வு பெறுவோம்!!
          </div>
          <p className="text-xs text-neutral-400">
            Jenista Chits • Transparent, Trusted & Rewarding Chit Schemes
          </p>
        </div>
      </div>

      {/* Official Poster Modal */}
      {showPosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-neutral-200 flex justify-between items-center bg-neutral-50">
              <h3 className="font-bold text-neutral-900 text-base">
                Official Fixed Plan Chart Poster
              </h3>
              <button
                onClick={() => setShowPosterModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-200 hover:bg-neutral-300 flex items-center justify-center text-neutral-700 font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex justify-center bg-neutral-900">
              <img
                src="/assets/fixed-plan-schedule.jpg"
                alt="Jenista Chits Fixed Plan Schedule"
                className="max-w-full h-auto rounded-lg shadow-lg object-contain"
              />
            </div>
            <div className="p-3 bg-neutral-100 flex justify-end gap-3">
              <a
                href="/assets/fixed-plan-schedule.jpg"
                download="jenista-chits-schedule.jpg"
                className="px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Download Poster
              </a>
              <button
                onClick={() => setShowPosterModal(false)}
                className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-lg text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
