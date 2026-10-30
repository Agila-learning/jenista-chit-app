import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calculator, 
  Gavel, 
  Lock, 
  CalendarClock, 
  Printer, 
  Copy, 
  Check, 
  ShieldCheck,
  ArrowLeft,
  Download,
  Layers,
  SlidersHorizontal
} from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { calculateFixedPlanSchedule } from '../../utils/chitCalculations';

type SchemeType = 'AUCTION' | 'FIXED' | 'REGULAR';
type ViewMode = 'SCHEDULE' | 'COMPARISON';

export const ChitCalculator: React.FC = () => {
  const navigate = useNavigate();
  const [scheme, setScheme] = useState<SchemeType>('AUCTION');
  const [viewMode, setViewMode] = useState<ViewMode>('SCHEDULE');
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

  // Core Calculations for Selected Scheme
  const calculations = useMemo(() => {
    const grossMonthlyInstallment = Math.round(chitValue / duration);
    const foremanCommissionTotal = Math.round(chitValue * (foremanCommPercent / 100));
    const foremanCommissionPerMonth = Math.round(foremanCommissionTotal / duration);
    const fixedDetails = calculateFixedPlanSchedule(chitValue, duration);

    if (scheme === 'FIXED') {
      const winnerNetPayout = fixedDetails.maxPayout; // Month 20: 95%
      const totalPaidByMember = fixedDetails.totalDue;
      return {
        grossMonthlyInstallment: fixedDetails.month1Due,
        netMonthlyInstallment: fixedDetails.standardDue,
        totalPaidByMember,
        winnerNetPayout,
        minMemberPayout: fixedDetails.minPayout,
        foremanCommissionTotal,
        foremanCommissionPerMonth,
        totalDividendPerMember: 0,
        dividendPerMonth: 0,
        netGainOrCost: winnerNetPayout - totalPaidByMember,
        effectiveAnnualYield: (((winnerNetPayout - totalPaidByMember) / totalPaidByMember) * (12 / duration) * 100).toFixed(1),
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
        minMemberPayout: winnerNetPayout,
        foremanCommissionTotal,
        foremanCommissionPerMonth,
        totalDividendPerMember: 0,
        dividendPerMonth: 0,
        netGainOrCost: winnerNetPayout - totalPaidByMember,
        effectiveAnnualYield: '0.0',
      };
    }

    // AUCTION SCHEME
    const grossBidDiscount = Math.round(chitValue * (avgDiscountPercent / 100));
    const winnerNetPayout = chitValue - grossBidDiscount;
    const totalDividendPool = Math.max(0, grossBidDiscount - foremanCommissionTotal);
    const dividendPerMemberPerMonth = Math.round(totalDividendPool / duration);
    const netMonthlyInstallment = Math.max(0, grossMonthlyInstallment - dividendPerMemberPerMonth);
    
    // Non-prized subscriber pays lower installments for most months (Month 1 is Company / full installment)
    const totalPaidByPatientSaver = Math.round(netMonthlyInstallment * (duration - 1) + grossMonthlyInstallment);
    const totalDividendEarned = Math.round(dividendPerMemberPerMonth * (duration - 1));
    const netGainForLastMonthWinner = (chitValue - foremanCommissionTotal) - totalPaidByPatientSaver;

    return {
      grossMonthlyInstallment,
      netMonthlyInstallment,
      totalPaidByMember: totalPaidByPatientSaver,
      winnerNetPayout,
      minMemberPayout: winnerNetPayout,
      foremanCommissionTotal,
      foremanCommissionPerMonth,
      totalDividendPerMember: totalDividendEarned,
      dividendPerMonth: dividendPerMemberPerMonth,
      netGainOrCost: netGainForLastMonthWinner,
      effectiveAnnualYield: ((totalDividendEarned / chitValue) * (12 / duration) * 100).toFixed(1),
    };
  }, [scheme, chitValue, duration, foremanCommPercent, avgDiscountPercent]);

  // Comparative Matrix for all 3 schemes simultaneously
  const comparativeData = useMemo(() => {
    const gross = Math.round(chitValue / duration);
    const foremanFee = Math.round(chitValue * (foremanCommPercent / 100));

    // Auction
    const grossBid = Math.round(chitValue * (avgDiscountPercent / 100));
    const divPool = Math.max(0, grossBid - foremanFee);
    const divPerMo = Math.round(divPool / duration);
    const auctionNetMo = Math.max(0, gross - divPerMo);
    const auctionTotalPaid = Math.round(auctionNetMo * (duration - 1) + gross);
    const auctionTotalDiv = Math.round(divPerMo * (duration - 1));
    const auctionBorrowPayout = chitValue - grossBid;
    const auctionSaverPayout = chitValue - foremanFee;

    // Fixed (Jenista matrix: Month 1 is Company, Months 2-8 3.75%, Months 9-20 step up)
    const fixedDetails = calculateFixedPlanSchedule(chitValue, duration);
    const fixedTotalPaid = fixedDetails.totalDue;
    const fixedMinPayout = fixedDetails.minPayout; // Month 2: 70%
    const fixedMaxPayout = fixedDetails.maxPayout; // Month 20: 95%

    // Regular
    const regularTotalPaid = gross * duration;
    const regularPayout = chitValue - foremanFee;

    return {
      auction: {
        grossInstallment: gross,
        netInstallment: auctionNetMo,
        avgDividend: divPerMo,
        totalPaid: auctionTotalPaid,
        totalDividend: auctionTotalDiv,
        borrowerPayout: auctionBorrowPayout,
        saverPayout: auctionSaverPayout,
        netGain: auctionSaverPayout - auctionTotalPaid,
        yieldRate: ((auctionTotalDiv / chitValue) * (12 / duration) * 100).toFixed(1)
      },
      fixed: {
        grossInstallment: fixedDetails.month1Due,
        netInstallment: fixedDetails.standardDue,
        totalPaid: fixedTotalPaid,
        minPayout: fixedMinPayout,
        winnerPayout: fixedMaxPayout,
        netCost: fixedMaxPayout - fixedTotalPaid
      },
      regular: {
        grossInstallment: gross,
        netInstallment: gross,
        totalPaid: regularTotalPaid,
        winnerPayout: regularPayout,
        netCost: regularPayout - regularTotalPaid
      }
    };
  }, [chitValue, duration, foremanCommPercent, avgDiscountPercent]);

  // Month-by-Month Projection Schedule (Month 1 is Company / Foreman Chit)
  const projectionSchedule = useMemo(() => {
    const rows = [];
    const baseInstallment = Math.round(chitValue / duration);
    const foremanFee = Math.round(chitValue * (foremanCommPercent / 100));
    const fixedDetails = calculateFixedPlanSchedule(chitValue, duration);

    let cumulativePaid = 0;

    for (let month = 1; month <= duration; month++) {
      let bidPercent = 0;
      let dividend = 0;
      let installmentDue = baseInstallment;
      let payout = 0;
      let isCompany = month === 1;
      let winnerPayoutDisplay = '';

      if (scheme === 'AUCTION') {
        if (month === 1) {
          // Month 1: Foreman Chit (Company receives prize money under Chit Funds Act, 1982)
          isCompany = true;
          bidPercent = 0;
          dividend = 0;
          installmentDue = baseInstallment;
          payout = chitValue;
          winnerPayoutDisplay = 'COMPANY';
        } else {
          // Months 2-20: Subscriber competitive bidding
          isCompany = false;
          const curveFactor = 1 + (0.35 * ((duration - month) / duration) - 0.15);
          bidPercent = Math.min(35, Math.max(8, Math.round(avgDiscountPercent * curveFactor)));
          const grossDiscount = Math.round(chitValue * (bidPercent / 100));
          payout = chitValue - grossDiscount;
          const divPool = Math.max(0, grossDiscount - foremanFee);
          dividend = Math.round(divPool / duration);
          installmentDue = baseInstallment - dividend;
          winnerPayoutDisplay = formatCurrency(payout);
        }
      } else if (scheme === 'FIXED') {
        const rowData = fixedDetails.schedule.find(r => r.month === month);
        installmentDue = rowData ? rowData.due : baseInstallment;
        dividend = 0;
        bidPercent = 0;
        if (month === 1) {
          isCompany = true;
          payout = 0;
          winnerPayoutDisplay = 'COMPANY';
        } else {
          isCompany = false;
          payout = rowData ? rowData.payout : Math.round(chitValue * (0.70 + ((month - 1) / duration) * 0.25));
          winnerPayoutDisplay = formatCurrency(payout);
        }
      } else {
        // Regular
        bidPercent = 0;
        dividend = 0;
        installmentDue = baseInstallment;
        if (month === 1) {
          isCompany = true;
          payout = chitValue;
          winnerPayoutDisplay = 'COMPANY';
        } else {
          isCompany = false;
          payout = chitValue - foremanFee;
          winnerPayoutDisplay = formatCurrency(payout);
        }
      }

      cumulativePaid += installmentDue;

      rows.push({
        month,
        baseInstallment: installmentDue,
        bidPercent,
        dividend,
        netPayable: installmentDue,
        winnerPayout: payout,
        winnerPayoutDisplay,
        isCompany,
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
Regulated Foreman Commission: ${foremanCommPercent}%
Calculated via Jenista Accounting Engine`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    const headers = ['Month', 'Base Installment (₹)', 'Bid Discount (%)', 'Dividend (₹)', 'Net Payable (₹)', 'Winner Payout (₹)', 'Cumulative Paid (₹)'];
    const rows = projectionSchedule.map(r => [
      r.month,
      r.baseInstallment,
      scheme === 'AUCTION' ? `${r.bidPercent}%` : '0%',
      r.dividend,
      r.netPayable,
      r.isCompany ? 'COMPANY' : r.winnerPayout,
      r.cumulativePaid
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jenista_${scheme.toLowerCase()}_chit_${chitValue}_schedule.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/admin');
                }
              }}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold md:hidden"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
              <Calculator className="w-3.5 h-3.5 text-blue-600" />
              Administrative Chit Calculator & Estimator
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Chit Plan Financial Modeler
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Calculate accurate installments, dividends, foreman commissions, and prize payouts for Fixed, Auction, and Regular plans.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopySummary}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Summary'}</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Download full schedule as CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
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
                className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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
                className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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
                className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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
                  className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
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

          {/* Chit Value Input & Interactive Range Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700">Chit Face Value</label>
              <span className="text-sm font-black text-blue-600">{formatCurrency(chitValue)}</span>
            </div>
            <input
              type="number"
              step="5000"
              min="25000"
              max="5000000"
              value={chitValue}
              onChange={(e) => setChitValue(Math.max(1000, Number(e.target.value)))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {/* Range Slider for tactile adjustment */}
            <input
              type="range"
              min="25000"
              max="2500000"
              step="25000"
              value={chitValue}
              onChange={(e) => setChitValue(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              title="Slide to adjust chit value"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>₹25,000</span>
              <span>₹10,00,000</span>
              <span>₹25,00,000</span>
            </div>
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
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
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

          {/* View Mode Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Display Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setViewMode('SCHEDULE')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'SCHEDULE'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Monthly Schedule</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('COMPARISON')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'COMPARISON'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Compare Schemes</span>
              </button>
            </div>
          </div>
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
                  : `100% full face value minus ${foremanCommPercent}% regulated commission`}
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

          {/* CONDITIONAL VIEW: COMPARISON MATRIX VS SCHEDULE */}
          {viewMode === 'COMPARISON' ? (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Side-by-Side Scheme Architectural Comparison
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    For Chit Value: {formatCurrency(chitValue)} over {duration} Months
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Auction Scheme */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 border-2 border-indigo-200 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white uppercase tracking-wider">
                      Auction Scheme
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm">Competitive Bidding</h4>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Subscribers bid discounts for instant liquidity. Non-winners enjoy recurring monthly dividends.
                    </p>

                    <div className="space-y-1.5 pt-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Base Installment:</span>
                        <span className="font-bold">{formatCurrency(comparativeData.auction.grossInstallment)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Avg. Net Outflow:</span>
                        <span className="font-black text-indigo-700">{formatCurrency(comparativeData.auction.netInstallment)}/mo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Est. Total Dividend:</span>
                        <span className="font-bold text-emerald-700">+{formatCurrency(comparativeData.auction.totalDividend)}</span>
                      </div>
                      <div className="flex justify-between border-t border-indigo-100 pt-1">
                        <span className="text-slate-500">Month 1 (Foreman):</span>
                        <span className="font-bold text-amber-800">Company Chit</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Borrower Net Payout:</span>
                        <span className="font-bold text-blue-800">{formatCurrency(comparativeData.auction.borrowerPayout)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Last Winner Payout:</span>
                        <span className="font-bold text-emerald-800">{formatCurrency(comparativeData.auction.saverPayout)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/80 border border-indigo-100 text-[10px] text-indigo-900 font-medium">
                    🎯 <strong>Best For:</strong> Business owners needing flexible emergency credit or disciplined savers seeking dividend returns.
                  </div>
                </div>

                {/* 2. Fixed Draw Scheme */}
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white uppercase tracking-wider">
                      Fixed Scheme
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm">Guaranteed Full Value</h4>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Fixed installments with monthly draws. Month 1 is Company Chit; member payouts step up from 70% to 95%.
                    </p>

                    <div className="space-y-1.5 pt-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Month 1 (Company):</span>
                        <span className="font-bold text-amber-800">{formatCurrency(comparativeData.fixed.grossInstallment)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Standard Dues:</span>
                        <span className="font-black text-blue-900">{formatCurrency(comparativeData.fixed.netInstallment)}/mo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Contributed:</span>
                        <span className="font-bold text-slate-900">{formatCurrency(comparativeData.fixed.totalPaid)}</span>
                      </div>
                      <div className="flex justify-between border-t border-blue-100 pt-1">
                        <span className="text-slate-500">Min Payout (Month 2):</span>
                        <span className="font-bold text-blue-800">{formatCurrency(comparativeData.fixed.minPayout)} (70%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Max Payout (Month 20):</span>
                        <span className="font-extrabold text-emerald-700">{formatCurrency(comparativeData.fixed.winnerPayout)} (95%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/80 border border-blue-100 text-[10px] text-blue-900 font-medium">
                    🎯 <strong>Best For:</strong> Salaried individuals and risk-averse families seeking predictable savings with 100% full payout.
                  </div>
                </div>

                {/* 3. Regular Plan Scheme */}
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-700 text-white uppercase tracking-wider">
                      Regular Scheme
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm">Brochure Rotation Turn</h4>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Traditional 20-month disciplined rotation following official Tamil Nadu regulated chit tables and turns.
                    </p>

                    <div className="space-y-1.5 pt-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Fixed Monthly Due:</span>
                        <span className="font-black text-emerald-900">{formatCurrency(comparativeData.regular.grossInstallment)}/mo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Dividend:</span>
                        <span className="font-bold text-slate-400">Scheduled turns</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Contributed:</span>
                        <span className="font-bold text-slate-900">{formatCurrency(comparativeData.regular.totalPaid)}</span>
                      </div>
                      <div className="flex justify-between border-t border-emerald-100 pt-1">
                        <span className="text-slate-500">Winner Net Payout:</span>
                        <span className="font-extrabold text-emerald-700">{formatCurrency(comparativeData.regular.winnerPayout)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Foreman Fee (5%):</span>
                        <span className="font-bold text-slate-600">{formatCurrency(calculations.foremanCommissionTotal)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-100 text-[10px] text-emerald-900 font-medium">
                    🎯 <strong>Best For:</strong> Planned major events (weddings, education, down payments) scheduled for specific months.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Month-by-Month Projection Schedule Card */
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Month-by-Month Schedule Projection
                  </h3>
                  <p className="text-xs text-slate-500">
                    Detailed timeline of collections, dividends, net payable amounts, and prize disbursements
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full self-start sm:self-auto">
                  {duration} Total Installments
                </span>
              </div>

              <div className="overflow-x-auto max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider z-10">
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
                      <tr key={row.month} className={`hover:bg-slate-50/80 transition-colors ${row.isCompany ? 'bg-amber-50/30' : ''}`}>
                        <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                          <span>Month {row.month}</span>
                          {row.isCompany && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300">
                              Company
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {formatCurrency(row.baseInstallment)}
                        </td>
                        {scheme === 'AUCTION' && (
                          <td className="py-2.5 px-3 text-indigo-700 font-semibold">
                            {row.isCompany ? '0%' : `${row.bidPercent}%`}
                          </td>
                        )}
                        {scheme === 'AUCTION' && (
                          <td className="py-2.5 px-3 text-emerald-700 font-semibold">
                            {row.isCompany ? '—' : `+${formatCurrency(row.dividend)}`}
                          </td>
                        )}
                        <td className="py-2.5 px-3 font-black text-slate-900 bg-slate-50/50">
                          {formatCurrency(row.netPayable)}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.isCompany ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                              COMPANY
                            </span>
                          ) : (
                            <span className="text-blue-700 font-bold">{formatCurrency(row.winnerPayout)}</span>
                          )}
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
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  All foreman charges and ceiling limits calculated in accordance with the Chit Funds Act, 1982.
                </span>
                <span className="font-semibold text-slate-700">
                  Jenista Chits Accounting Engine
                </span>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
