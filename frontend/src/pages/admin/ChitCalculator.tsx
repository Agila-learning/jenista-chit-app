import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Gavel, 
  Lock, 
  CalendarClock, 
  Printer, 
  Copy, 
  Check, 
  ShieldCheck 
} from 'lucide-react';
import { formatCurrency } from '../../utils/format';

type SchemeType = 'AUCTION' | 'FIXED' | 'REGULAR';

export const ChitCalculator: React.FC = () => {
  const [scheme, setScheme] = useState<SchemeType>('AUCTION');
  const [chitValue, setChitValue] = useState<number>(100000);
  const [duration, setDuration] = useState<number>(20);
  const [foremanCommPercent, setForemanCommPercent] = useState<number>(5);
  const [avgDiscountPercent, setAvgDiscountPercent] = useState<number>(25); // for auction
  const [copied, setCopied] = useState(false);

  // Preset chit denominations
  const presets = [
    { label: '₹50K', value: 50000, duration: 20 },
    { label: '₹1 Lakh', value: 100000, duration: 20 },
    { label: '₹2.5 Lakh', value: 250000, duration: 25 },
    { label: '₹5 Lakh', value: 500000, duration: 25 },
    { label: '₹10 Lakh', value: 1000000, duration: 40 },
    { label: '₹25 Lakh', value: 2500000, duration: 50 },
  ];

  // Core Calculations
  const calculations = useMemo(() => {
    const grossMonthlyInstallment = Math.round(chitValue / duration);
    const foremanCommissionTotal = Math.round(chitValue * (foremanCommPercent / 100));
    const foremanCommissionPerMonth = Math.round(foremanCommissionTotal / duration);

    if (scheme === 'FIXED') {
      const winnerNetPayout = chitValue - foremanCommissionTotal;
      const totalPaidByMember = grossMonthlyInstallment * duration;
      return {
        grossMonthlyInstallment,
        netMonthlyInstallment: grossMonthlyInstallment,
        totalPaidByMember,
        winnerNetPayout,
        foremanCommissionTotal,
        foremanCommissionPerMonth,
        totalDividendPerMember: 0,
        netGainOrCost: winnerNetPayout - totalPaidByMember,
        effectiveAnnualYield: 0,
      };
    }

    if (scheme === 'REGULAR') {
      const winnerNetPayout = chitValue - foremanCommissionTotal;
      const totalPaidByMember = grossMonthlyInstallment * duration;
      return {
        grossMonthlyInstallment,
        netMonthlyInstallment: grossMonthlyInstallment,
        totalPaidByMember,
        winnerNetPayout,
        foremanCommissionTotal,
        foremanCommissionPerMonth,
        totalDividendPerMember: 0,
        netGainOrCost: winnerNetPayout - totalPaidByMember,
        effectiveAnnualYield: 0,
      };
    }

    // AUCTION SCHEME
    const grossBidDiscount = Math.round(chitValue * (avgDiscountPercent / 100));
    const winnerNetPayout = chitValue - grossBidDiscount;
    const totalDividendPool = Math.max(0, grossBidDiscount - foremanCommissionTotal);
    const dividendPerMemberPerMonth = Math.round(totalDividendPool / duration);
    const netMonthlyInstallment = Math.max(0, grossMonthlyInstallment - dividendPerMemberPerMonth);
    
    // Non-prized subscriber pays lower installments for most months
    const totalPaidByPatientSaver = Math.round(netMonthlyInstallment * (duration - 1) + grossMonthlyInstallment);
    const totalDividendEarned = Math.round(dividendPerMemberPerMonth * (duration - 1));
    const netGainForLastMonthWinner = (chitValue - foremanCommissionTotal) - totalPaidByPatientSaver;

    return {
      grossMonthlyInstallment,
      netMonthlyInstallment,
      totalPaidByMember: totalPaidByPatientSaver,
      winnerNetPayout,
      foremanCommissionTotal,
      foremanCommissionPerMonth,
      totalDividendPerMember: totalDividendEarned,
      dividendPerMonth: dividendPerMemberPerMonth,
      netGainOrCost: netGainForLastMonthWinner,
      effectiveAnnualYield: ((totalDividendEarned / chitValue) * (12 / duration) * 100).toFixed(1),
    };
  }, [scheme, chitValue, duration, foremanCommPercent, avgDiscountPercent]);

  // Generate Month-by-Month Projection Schedule
  const projectionSchedule = useMemo(() => {
    const rows = [];
    const baseInstallment = Math.round(chitValue / duration);
    const foremanFee = Math.round(chitValue * (foremanCommPercent / 100));

    let cumulativePaid = 0;

    for (let month = 1; month <= duration; month++) {
      let bidPercent = avgDiscountPercent;
      let dividend = 0;
      let netPayable = baseInstallment;
      let payout = chitValue - foremanFee;

      if (scheme === 'AUCTION') {
        // Taper discount curve: early months higher discount, final months lower discount
        const curveFactor = 1 + (0.35 * ((duration - month) / duration) - 0.15);
        bidPercent = Math.min(35, Math.max(8, Math.round(avgDiscountPercent * curveFactor)));
        const grossDiscount = Math.round(chitValue * (bidPercent / 100));
        payout = chitValue - grossDiscount;
        const divPool = Math.max(0, grossDiscount - foremanFee);
        dividend = Math.round(divPool / duration);
        netPayable = baseInstallment - dividend;
      } else if (scheme === 'FIXED') {
        bidPercent = 0;
        dividend = 0;
        netPayable = baseInstallment;
        payout = chitValue - foremanFee;
      } else {
        // Regular
        bidPercent = 0;
        dividend = 0;
        netPayable = baseInstallment;
        payout = chitValue - foremanFee;
      }

      cumulativePaid += netPayable;

      rows.push({
        month,
        baseInstallment,
        bidPercent,
        dividend,
        netPayable,
        winnerPayout: payout,
        cumulativePaid,
      });
    }

    return rows;
  }, [scheme, chitValue, duration, foremanCommPercent, avgDiscountPercent]);

  const handleCopySummary = () => {
    const summaryText = `Jenista Chit Funds - Plan Estimate
Scheme: ${scheme} Chit
Chit Value: ${formatCurrency(chitValue)}
Duration: ${duration} Months
Gross Installment: ${formatCurrency(calculations.grossMonthlyInstallment)}/mo
${scheme === 'AUCTION' ? `Est. Net Installment (after dividend): ${formatCurrency(calculations.netMonthlyInstallment)}/mo
Est. Dividend Earned: ${formatCurrency(calculations.totalDividendPerMember)}
Immediate Borrower Payout: ${formatCurrency(calculations.winnerNetPayout)}` : `Winner Net Payout: ${formatCurrency(calculations.winnerNetPayout)}`}
Regulated Foreman Commission: 5%
Calculated via Jenista Admin Portal`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm print:hidden">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Calculator className="w-3.5 h-3.5 text-blue-600" />
            Administrative Chit Calculator & Estimator
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Chit Plan Financial Modeler
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Calculate accurate installments, dividends, foreman commissions, and prize payouts for Fixed, Auction, and Regular plans.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopySummary}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Summary'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Inputs Panel (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6 print:hidden">
          
          {/* Scheme Selection Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Select Chit Scheme Architecture
            </label>
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setScheme('AUCTION')}
                className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  scheme === 'AUCTION'
                    ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Gavel className="w-3.5 h-3.5" />
                <span>Auction</span>
              </button>
              <button
                type="button"
                onClick={() => setScheme('FIXED')}
                className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  scheme === 'FIXED'
                    ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Fixed Draw</span>
              </button>
              <button
                type="button"
                onClick={() => setScheme('REGULAR')}
                className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  scheme === 'REGULAR'
                    ? 'bg-emerald-600 text-white shadow-sm font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                <span>Regular</span>
              </button>
            </div>
          </div>

          {/* Quick Denomination Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Popular Chit Slabs
            </label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    setChitValue(p.value);
                    setDuration(p.duration);
                  }}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                    chitValue === p.value && duration === p.duration
                      ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-2xs font-black'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p.label} ({p.duration}m)
                </button>
              ))}
            </div>
          </div>

          {/* Chit Value Input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700">Chit Face Value (₹)</label>
              <span className="text-xs font-extrabold text-blue-600">{formatCurrency(chitValue)}</span>
            </div>
            <input
              type="number"
              step="5000"
              min="10000"
              max="10000000"
              value={chitValue}
              onChange={(e) => setChitValue(Math.max(1000, Number(e.target.value)))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Duration Months */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700">Tenure / Total Members</label>
              <span className="text-xs font-extrabold text-blue-600">{duration} Months</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[20, 25, 40, 50].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDuration(m)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    duration === m
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {m} Mo
                </button>
              ))}
            </div>
          </div>

          {/* Foreman Commission Slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700">Foreman Commission (%)</label>
              <span className="text-xs font-bold text-slate-900">{foremanCommPercent}% (Govt. Regulated)</span>
            </div>
            <input
              type="range"
              min="3"
              max="7"
              step="0.5"
              value={foremanCommPercent}
              onChange={(e) => setForemanCommPercent(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Auction Scheme Specific: Expected Bid Discount Slider */}
          {scheme === 'AUCTION' && (
            <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-indigo-950">Avg. Winning Bid Discount (%)</label>
                <span className="text-xs font-black text-indigo-700">{avgDiscountPercent}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="35"
                step="1"
                value={avgDiscountPercent}
                onChange={(e) => setAvgDiscountPercent(Number(e.target.value))}
                className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-[11px] text-indigo-900/80">
                Regulated ceiling discount typically ranges between 20% to 35% in early to mid stages.
              </p>
            </div>
          )}
        </div>

        {/* Right Output Calculations (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Summary KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* KPI 1: Gross Monthly Installment */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Standard Installment
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(calculations.grossMonthlyInstallment)}
                <span className="text-xs font-semibold text-slate-500 font-normal"> / month</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Base installment before dividend application.
              </p>
            </div>

            {/* KPI 2: Effective Net Installment */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/80 p-5 rounded-2xl border border-blue-200 shadow-2xs">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
                {scheme === 'AUCTION' ? 'Effective Monthly Outflow' : 'Winner Net Disbursement'}
              </span>
              <div className="text-2xl font-black text-blue-900 mt-1">
                {scheme === 'AUCTION' 
                  ? `${formatCurrency(calculations.netMonthlyInstallment)} / mo`
                  : formatCurrency(calculations.winnerNetPayout)}
              </div>
              <p className="text-[11px] text-blue-800/80 mt-1">
                {scheme === 'AUCTION' 
                  ? `Member saves ~${formatCurrency(calculations.dividendPerMonth || 0)}/mo in dividend`
                  : `100% full face value minus 5% regulated commission`}
              </p>
            </div>

            {/* KPI 3: Foreman Commission */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Foreman Revenue ({foremanCommPercent}%)
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(calculations.foremanCommissionTotal)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                ~{formatCurrency(calculations.foremanCommissionPerMonth)} earned per group monthly.
              </p>
            </div>

            {/* KPI 4: Net Payout / Return */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                {scheme === 'AUCTION' ? 'Est. Total Dividend Benefit' : 'Tenure Total Inflow'}
              </span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {scheme === 'AUCTION' 
                  ? formatCurrency(calculations.totalDividendPerMember)
                  : formatCurrency(chitValue)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {scheme === 'AUCTION' 
                  ? `Annualized yield equivalent: ~${calculations.effectiveAnnualYield}%`
                  : `${duration} members contributing in scheduled cycles`}
              </p>
            </div>
          </div>

          {/* Printable Report Header */}
          <div className="hidden print:block p-4 border-b border-slate-300 mb-4">
            <h2 className="text-xl font-bold">Jenista Chit Funds - Official Plan Projection</h2>
            <p className="text-sm">Chit Value: {formatCurrency(chitValue)} | Duration: {duration} Months | Scheme: {scheme}</p>
          </div>

          {/* Month-by-Month Projection Schedule Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Month-by-Month Schedule Projection
                </h3>
                <p className="text-xs text-slate-500">
                  Detailed timeline of collections, dividends, net payable amounts, and prize disbursements
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
                {duration} Total Installments
              </span>
            </div>

            <div className="overflow-x-auto max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3">Installment</th>
                    {scheme === 'AUCTION' && <th className="py-2.5 px-3">Bid %</th>}
                    {scheme === 'AUCTION' && <th className="py-2.5 px-3 text-emerald-700">Dividend</th>}
                    <th className="py-2.5 px-3 font-extrabold text-slate-900">Net Payable</th>
                    <th className="py-2.5 px-3 text-blue-700">Winner Payout</th>
                    <th className="py-2.5 px-3 text-slate-500">Cumulative Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectionSchedule.map((row) => (
                    <tr key={row.month} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        Month {row.month}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {formatCurrency(row.baseInstallment)}
                      </td>
                      {scheme === 'AUCTION' && (
                        <td className="py-2.5 px-3 text-indigo-700 font-semibold">
                          {row.bidPercent}%
                        </td>
                      )}
                      {scheme === 'AUCTION' && (
                        <td className="py-2.5 px-3 text-emerald-700 font-semibold">
                          +{formatCurrency(row.dividend)}
                        </td>
                      )}
                      <td className="py-2.5 px-3 font-black text-slate-900 bg-slate-50/50">
                        {formatCurrency(row.netPayable)}
                      </td>
                      <td className="py-2.5 px-3 text-blue-700 font-bold">
                        {formatCurrency(row.winnerPayout)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-medium">
                        {formatCurrency(row.cumulativePaid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Compliance Note */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                All foreman charges and ceiling limits calculated in accordance with the Chit Funds Act, 1982.
              </span>
              <span className="font-semibold text-slate-700">
                Jenista Chits Accounting Engine
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
