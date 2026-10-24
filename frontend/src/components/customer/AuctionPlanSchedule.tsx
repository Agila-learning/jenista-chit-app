import { useState, useEffect } from 'react';
import { Calendar, ShieldCheck, HelpCircle, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { calculateAuctionPlanSchedule } from '../../utils/chitCalculations';

const defaultAuctionCategories = [
  { id: 1, value: 100000 },
  { id: 2, value: 200000 },
  { id: 3, value: 500000 },
  { id: 4, value: 1000000 },
];

const colorSchemes = [
  { border: 'border-indigo-400', bg: 'bg-indigo-50/70', text: 'text-indigo-950', badge: 'bg-indigo-700 text-white', th: 'bg-indigo-800', subDue: 'bg-indigo-700', subDiv: 'bg-indigo-600', subPay: 'bg-indigo-900', cellDue: 'text-indigo-950', cellDiv: 'text-emerald-800', cellPay: 'text-indigo-900' },
  { border: 'border-purple-400', bg: 'bg-purple-50/70', text: 'text-purple-950', badge: 'bg-purple-700 text-white', th: 'bg-purple-800', subDue: 'bg-purple-700', subDiv: 'bg-purple-600', subPay: 'bg-purple-900', cellDue: 'text-purple-950', cellDiv: 'text-emerald-800', cellPay: 'text-purple-900' },
  { border: 'border-fuchsia-400', bg: 'bg-fuchsia-50/70', text: 'text-fuchsia-950', badge: 'bg-fuchsia-700 text-white', th: 'bg-fuchsia-800', subDue: 'bg-fuchsia-700', subDiv: 'bg-fuchsia-600', subPay: 'bg-fuchsia-900', cellDue: 'text-fuchsia-950', cellDiv: 'text-emerald-800', cellPay: 'text-fuchsia-900' },
  { border: 'border-amber-400', bg: 'bg-amber-50/70', text: 'text-amber-950', badge: 'bg-amber-700 text-white', th: 'bg-amber-700', subDue: 'bg-amber-600', subDiv: 'bg-amber-500 text-amber-950', subPay: 'bg-amber-900', cellDue: 'text-amber-950', cellDiv: 'text-emerald-800', cellPay: 'text-amber-900' },
  { border: 'border-teal-400', bg: 'bg-teal-50/70', text: 'text-teal-950', badge: 'bg-teal-700 text-white', th: 'bg-teal-800', subDue: 'bg-teal-700', subDiv: 'bg-teal-600', subPay: 'bg-teal-900', cellDue: 'text-teal-950', cellDiv: 'text-emerald-800', cellPay: 'text-teal-900' },
];

const auctionRules = [
  {
    title: 'தலைகீழ் ஏல முறை (Reverse Auction)',
    tamil: 'தேவை உள்ள உறுப்பினர்கள் ஏலத்தில் கலந்து கொண்டு குறைந்த தொகையை (அதிக தள்ளுபடி) கேட்பவருக்கு அந்த மாத சீட்டு வழங்கப்படும்.',
    english: 'Members with fund requirements participate in a reverse bid. The lowest bidder (highest discount) wins the prize money.'
  },
  {
    title: 'உச்ச வரம்பு தள்ளுபடி (30% Max Ceiling)',
    tamil: 'சீட்டுத் தொகையில் அதிகபட்ச தள்ளுபடி 30% ஆகும். ஒன்றுக்கும் மேற்பட்டோர் சமமாக ஏலம் கேட்டால் குலுக்கல் (Lottery) மூலம் வெற்றியாளர் தேர்வு செய்யப்படுவர்.',
    english: 'Maximum bid discount is capped at 30%. If multiple members bid the max discount, the winner is decided by a transparent draw.'
  },
  {
    title: 'டிவிடெண்ட் லாபப் பகிர்வு (Monthly Dividend)',
    tamil: 'ஏலத் தள்ளுபடியில் 5% நிறுவன கமிஷன் கழித்து, மீதமுள்ள தொகை அனைத்து 20 உறுப்பினர்களுக்கும் சமமாகப் பிரித்து அடுத்த மாத சீட்டுத் தொகையில் கழித்துக்கொள்ளப்படும்.',
    english: 'After 5% company commission, remaining discount is divided among all 20 members as dividend, lowering their next installment.'
  },
  {
    title: 'சேமிப்பாளர்களுக்கு அதிக லாபம் (Saver Benefit)',
    tamil: 'சீட்டை இறுதி வரை எடுக்காமல் வைத்திருக்கும் உறுப்பினர்கள் மிகக் குறைந்த தொகையே செலுத்தி (மொத்த தவணையில் ₹10,000+ வரை சேமிப்பு) முழுத் தொகையையும் பெறுவர்.',
    english: 'Subscribers who wait till later months pay much less total capital due to accumulated dividends, enjoying attractive annual returns.'
  },
  {
    title: 'ஏல தேதி & நேரம் (Auction Schedule)',
    tamil: 'பிரதி மாதம் 10 அல்லது 15-ம் தேதி மாலை 6.00 மணி முதல் 7.00 மணி வரை ஏலம் நடைபெறும். நேரில் அல்லது ஆப் வழியே கலந்து கொள்ளலாம்.',
    english: 'Auction takes place on the 10th or 15th of every month from 6:00 PM to 7:00 PM in person or digitally.'
  },
  {
    title: 'பணம் பெறுவதற்கான ஆவணங்கள் (Disbursal Terms)',
    tamil: 'ஏலம் எடுத்த உறுப்பினர் ஜாமீன்தாரர் (Co-applicant), காசோலை மற்றும் ஆவணங்களை சமர்ப்பித்து 7 முதல் 10 நாட்களுக்குள் தொகையைப் பெறலாம்.',
    english: 'Prize money disbursed within 7 to 10 days upon submitting guarantor documentation, cheques, and KYC.'
  }
];

export const AuctionPlanSchedule = () => {
  const [categories, setCategories] = useState<{ id: number; value: number }[]>(() => {
    const saved = localStorage.getItem('mockAuctionCategories');
    return saved ? JSON.parse(saved) : defaultAuctionCategories;
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
      const saved = localStorage.getItem('mockAuctionCategories');
      if (saved) setCategories(JSON.parse(saved));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const planDetails = categories.map((cat, idx) => {
    const calc = calculateAuctionPlanSchedule(cat.value);
    const styling = colorSchemes[idx % colorSchemes.length];
    return {
      id: cat.value.toString(),
      value: cat.value,
      name: formatCurrency(cat.value),
      grossStr: `Gross Due: ${formatCurrency(calc.grossDue)}`,
      avgNetStr: `Min Due: ${formatCurrency(calc.minNetDue)}`,
      totalSaveStr: `Save ~${formatCurrency(calc.totalDividends)}`,
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
          <div className="bg-indigo-950 text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-md">
            <div className="overflow-hidden">
              <h3 className="font-extrabold text-sm tracking-wide text-white truncate">
                {activeMobilePlan.name} CHIT
              </h3>
              <p className="text-[10px] text-purple-200 truncate">
                20 Months • {activeMobilePlan.totalSaveStr}
              </p>
            </div>
            <span className="text-[10px] bg-purple-900/80 text-purple-200 px-2.5 py-1 rounded-full font-bold shrink-0">
              20 Members
            </span>
          </div>

          {/* Quick Metrics Bar */}
          <div className="bg-neutral-50 border-b border-neutral-200 px-4 py-2 flex items-center justify-between text-xs shrink-0">
            <div>
              <span className="text-neutral-500 text-[10px] uppercase font-bold block">Gross Due</span>
              <span className="font-extrabold text-neutral-800">{activeMobilePlan.grossStr.replace('Gross Due: ', '')}</span>
            </div>
            <div className="text-center">
              <span className="text-neutral-500 text-[10px] uppercase font-bold block">Min Due / Mo</span>
              <span className="font-extrabold text-purple-900">{activeMobilePlan.avgNetStr.replace('Min Due: ', '')}</span>
            </div>
            <div className="text-right">
              <span className="text-neutral-500 text-[10px] uppercase font-bold block">Est. Dividends</span>
              <span className="font-extrabold text-emerald-700">{activeMobilePlan.totalSaveStr.replace('Save ~', '')}</span>
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
                    <th rowSpan={2} className="bg-neutral-800 px-2 py-2.5 border-r border-neutral-700 w-12 text-[10px]">
                      BID %
                    </th>
                    <th colSpan={3} className={`${activeMobilePlan.styling.th} px-3 py-2 text-center`}>
                      {activeMobilePlan.name} CHIT (20M)
                    </th>
                  </tr>
                  <tr className="text-[10px] font-bold text-white uppercase tracking-wider">
                    <th className={`${activeMobilePlan.styling.subDue} px-2 py-1.5 border-r border-white/20`}>NET DUE</th>
                    <th className={`${activeMobilePlan.styling.subDiv} px-1.5 py-1.5 border-r border-white/20 text-[9px]`}>DIVIDEND</th>
                    <th className={`${activeMobilePlan.styling.subPay} px-2 py-1.5 font-black`}>PRIZE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-semibold text-xs bg-white">
                  {months.map((m) => {
                    const row = activeMobilePlan.calc.schedule[m - 1];
                    const discountPct = row?.discountPct ?? 5;
                    return (
                      <tr key={m} className="hover:bg-purple-50/40 transition-colors">
                        <td className="bg-neutral-900 text-white font-bold py-2.5 px-2 border-r border-neutral-800">
                          {m}
                        </td>
                        <td className="bg-neutral-100 text-neutral-700 font-bold py-2.5 px-1 border-r border-neutral-200 text-[11px]">
                          {discountPct}%
                        </td>
                        <td className={`py-2.5 px-2 ${activeMobilePlan.styling.cellDue} font-bold border-r border-neutral-100`}>
                          {row ? formatCurrency(row.netDue) : '-'}
                        </td>
                        <td className={`py-2.5 px-1.5 ${activeMobilePlan.styling.cellDiv} text-[11px] font-bold border-r border-neutral-100`}>
                          {row ? `+${formatCurrency(row.dividend)}` : '-'}
                        </td>
                        <td className={`py-2.5 px-2 ${activeMobilePlan.styling.cellPay} font-black`}>
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
              className="w-full py-2.5 bg-indigo-950 hover:bg-indigo-900 active:scale-98 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
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
                isSelected ? 'ring-2 ring-purple-600 shadow-md scale-[1.02]' : 'hover:shadow'
              } ${p.styling.border} ${p.styling.bg} ${p.styling.text}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${p.styling.badge}`}>
                  20 Months
                </span>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                  {p.totalSaveStr}
                </span>
              </div>
              <h4 className="text-lg font-black">{p.name}</h4>
              <p className="text-xs font-semibold opacity-80 mt-1">{p.grossStr}</p>
              <p className="text-[11px] font-bold text-purple-900 mt-0.5">{p.avgNetStr}</p>

              {/* Mobile CTA prompt */}
              <div className="md:hidden mt-2 pt-2 border-t border-purple-200/60 flex items-center justify-between text-[11px] font-bold text-purple-900">
                <span>View Full Table</span>
                <span>→</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile Hint Banner (Shown only on mobile when no scheme is in full-screen) */}
      <div className="md:hidden bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-3.5 flex items-center justify-between text-xs font-semibold text-purple-900 shadow-xs">
        <span>Tap any scheme above to view the 20-month auction schedule table in full screen.</span>
      </div>

      {/* How it Works Banner */}
      <div className="bg-white rounded-2xl border border-purple-100 p-5 shadow-sm">
        <h4 className="font-extrabold text-neutral-900 text-sm flex items-center gap-2 mb-3">
          <HelpCircle className="w-4 h-4 text-purple-600" />
          ஏலச் சீட்டு எவ்வாறு செயல்படுகிறது? (How Auction Chits Work in Tamil Nadu)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-600">
          <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-100 space-y-1">
            <span className="font-black text-purple-900 text-xs block">1. தலைகீழ் ஏலம் (Reverse Auction)</span>
            <p>தேவை உள்ளோர் தள்ளுபடி தொகையைக் கோருவர். அதிக தள்ளுபடி (30% வரை) கோரும் நபருக்கு சீட்டுப் பணம் உடனடியாக வழங்கப்படும்.</p>
          </div>
          <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 space-y-1">
            <span className="font-black text-indigo-900 text-xs block">2. மாதாந்திர டிவிடெண்ட் (Dividend Savings)</span>
            <p>ஏலத் தள்ளுபடியில் 5% கமிஷன் கழித்து, மீதித் தொகை அனைத்து 20 உறுப்பினர்களுக்கும் சமமாகப் பிரித்து அடுத்த தவணையில் கழிக்கப்படும்!</p>
          </div>
          <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 space-y-1">
            <span className="font-black text-emerald-900 text-xs block">3. முதலீட்டாளர் லாபம் (High Return for Savers)</span>
            <p>முழு சீட்டு காலத்திலும் தவணைத் தொகையில் டிவிடெண்ட் கழிவதால், செலுத்த வேண்டிய மொத்தத் தொகை குறைந்து, சேமிப்பாளர் அதிக லாபம் பெறுவர்.</p>
          </div>
        </div>
      </div>

      {/* Desktop Filter Tabs & Table (Hidden on Mobile, Visible on Desktop) */}
      <div className="hidden md:block space-y-6">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 items-center bg-white p-2 rounded-xl border border-neutral-200">
          <span className="text-xs font-bold text-neutral-500 px-3">Filter Column:</span>
          <button
            onClick={() => setSelectedPlan('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              selectedPlan === 'all' ? 'bg-purple-950 text-white' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            All Plans
          </button>
          {planDetails.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                selectedPlan === p.id ? 'bg-purple-700 text-white' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Auction Schedule Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="bg-indigo-950 text-white px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-300" />
              <h3 className="font-bold text-base md:text-lg tracking-wide uppercase">
                Auction Schedule (Month 1 to 20 • Due vs Payout • Auto-Calculated)
              </h3>
            </div>
            <span className="text-xs bg-indigo-900 text-purple-200 px-3 py-1 rounded-full font-semibold">
              20 Members
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-center text-xs md:text-sm font-sans">
              <thead>
                {/* Main Plan Headers */}
                <tr className="text-white font-black text-sm">
                  <th rowSpan={2} className="bg-neutral-900 px-3 py-3 border-r border-neutral-800 w-16">
                    MONTH
                  </th>
                  <th rowSpan={2} className="bg-neutral-800 px-2 py-3 border-r border-neutral-700 w-16 text-[11px]">
                    BID %
                  </th>
                  {visiblePlans.map((p) => (
                    <th key={p.id} colSpan={3} className={`${p.styling.th} px-4 py-2 border-r border-white/20`}>
                      {p.name} CHIT
                    </th>
                  ))}
                </tr>

                {/* Sub Headers */}
                <tr className="text-xs font-bold text-white uppercase tracking-wider">
                  {visiblePlans.map((p) => (
                    <tr key={`${p.id}-sub`} className="contents">
                      <th className={`${p.styling.subDue} px-2.5 py-2 border-r border-white/20`}>NET DUE</th>
                      <th className={`${p.styling.subDiv} px-2 py-2 border-r border-white/20 text-[10px]`}>DIVIDEND</th>
                      <th className={`${p.styling.subPay} px-2.5 py-2 border-r border-white/20 font-black`}>PRIZE</th>
                    </tr>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-200 font-semibold">
                {months.map((m) => {
                  const discountPct = visiblePlans[0]?.calc.schedule[m - 1]?.discountPct ?? 5;
                  return (
                    <tr key={m} className="hover:bg-purple-50/40 transition-colors">
                      {/* Month */}
                      <td className="bg-neutral-900 text-white font-bold py-2 px-3 border-r border-neutral-800">
                        {m}
                      </td>
                      <td className="bg-neutral-100 text-neutral-700 font-bold py-2 px-2 border-r border-neutral-200 text-xs">
                        {discountPct}%
                      </td>

                      {/* Columns for each plan */}
                      {visiblePlans.map((p) => {
                        const row = p.calc.schedule[m - 1];
                        return (
                          <tr key={`${p.id}-${m}`} className="contents">
                            <td className={`py-2 px-2.5 ${p.styling.cellDue} font-bold border-r border-neutral-100`}>
                              {row ? formatCurrency(row.netDue) : '-'}
                            </td>
                            <td className={`py-2 px-2 ${p.styling.cellDiv} text-xs font-bold border-r border-neutral-100`}>
                              {row ? `+${formatCurrency(row.dividend)}` : '-'}
                            </td>
                            <td className={`py-2 px-2.5 ${p.styling.cellPay} font-black border-r border-neutral-200`}>
                              {row ? formatCurrency(row.payout) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Terms & Conditions (ஏலச் சீட்டு விதிமுறைகள்) */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 md:p-8">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-neutral-900">
                ஏலச் சீட்டு விதிமுறைகள் (Auction Guidelines & Regulations)
              </h3>
              <p className="text-xs text-neutral-500">Tamil Nadu Chit Fund Act compliant rules for auction schemes</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">
            6 Guidelines
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {auctionRules.map((rule, index) => (
            <div
              key={index}
              className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-white hover:border-purple-400 hover:shadow-sm transition-all flex gap-3.5"
            >
              <div className="w-7 h-7 rounded-full bg-purple-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                {index + 1}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-purple-950 uppercase tracking-wide">
                  {rule.title}
                </p>
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
          <div className="text-base md:text-lg font-black text-purple-900">
            சிறிய சேமிப்பு! பெரிய வளர்ச்சி!!
          </div>
          <p className="text-xs text-neutral-400">
            Jenista Chits • Transparent Auctions • High Dividends • Complete Financial Security
          </p>
        </div>
      </div>
    </div>
  );
};
