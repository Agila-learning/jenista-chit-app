import React, { useState } from 'react';
import { 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Calendar, 
  TrendingUp, 
  ArrowRight, 
  RotateCcw,
  Sparkles,
  PhoneCall,
  Award,
  Gavel,
  Lock,
  Layers,
  Info,
  X
} from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { fetchClient } from '../../api/client';
import { Link } from 'react-router-dom';

interface ChitSubscription {
  id: string;
  groupName: string;
  chitValue: number;
  monthlyInstallment: number;
  duration: number;
  ticketNumber: string;
  scheme: 'Auction Chit' | 'Fixed Chit' | 'Regular Chit' | string;
  joinedDate?: string;
  dueDate: string;
  paymentStatus: string;
  installmentsPaid: number;
  progressPercent: number;
  schemeDetails?: {
    dividendEarned?: string;
    nextAuctionDate?: string;
    payoutTurnMonth?: string;
    guaranteedPayout?: string;
    scheduledTurn?: string;
    mode?: string;
  };
}

interface TrackedCustomer {
  customerCode: string;
  fullName: string;
  phone: string;
  status: string;
  kycStatus: string;
  totalPaid: number;
  pending: number;
  chits: ChitSubscription[];
}

// Built-in Sample Subscriber Data showcasing all 3 schemes
const SAMPLE_MEMBERS: Record<string, TrackedCustomer> = {
  'TC-11075': {
    customerCode: 'TC-11075',
    fullName: 'Karthik Subramanian (Sample Member)',
    phone: '******0077',
    status: 'ACTIVE',
    kycStatus: 'VERIFIED',
    totalPaid: 185000,
    pending: 0,
    chits: [
      {
        id: 'CG-AUC-501',
        groupName: 'Gold Auction Series A (CG-AUC-501)',
        chitValue: 500000,
        monthlyInstallment: 25000,
        duration: 20,
        ticketNumber: '#07',
        scheme: 'Auction Chit',
        dueDate: '15th Nov 2026',
        paymentStatus: 'UP_TO_DATE',
        installmentsPaid: 8,
        progressPercent: 40,
        schemeDetails: {
          dividendEarned: '₹28,500 accumulated dividend discount',
          nextAuctionDate: '15th Nov 2026, 04:00 PM',
          mode: 'Reverse Competitive Bidding'
        }
      },
      {
        id: 'CG-FIX-202',
        groupName: 'Silver Fixed Term Plan (CG-FIX-202)',
        chitValue: 200000,
        monthlyInstallment: 10000,
        duration: 20,
        ticketNumber: '#14',
        scheme: 'Fixed Chit',
        dueDate: '10th Nov 2026',
        paymentStatus: 'UP_TO_DATE',
        installmentsPaid: 12,
        progressPercent: 60,
        schemeDetails: {
          payoutTurnMonth: 'Month 14 (Guaranteed Payout ₹1,90,000)',
          guaranteedPayout: '₹1,90,000 (100% Face Value - 5% Foreman fee)',
          mode: 'Transparent Draw & Constant Installments'
        }
      },
      {
        id: 'CG-REG-101',
        groupName: 'Regular Milestone Savings (CG-REG-101)',
        chitValue: 100000,
        monthlyInstallment: 5000,
        duration: 20,
        ticketNumber: '#03',
        scheme: 'Regular Chit',
        dueDate: '5th Nov 2026',
        paymentStatus: 'UP_TO_DATE',
        installmentsPaid: 16,
        progressPercent: 80,
        schemeDetails: {
          scheduledTurn: 'Turn #03 of 20 (Disbursed)',
          mode: 'Systematic Seniority Rotation'
        }
      }
    ]
  }
};

export const TrackChitSection: React.FC = () => {
  const [customerId, setCustomerId] = useState('');
  const [mobile, setMobile] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [trackedData, setTrackedData] = useState<TrackedCustomer | null>(null);
  const [selectedChitIndex, setSelectedChitIndex] = useState(0);
  const [showSchemeModal, setShowSchemeModal] = useState(false);

  const handleSearch = async (e?: React.FormEvent, overrideId?: string, overrideMobile?: string) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const queryId = (overrideId !== undefined ? overrideId : customerId).trim();
    const queryMobile = (overrideMobile !== undefined ? overrideMobile : mobile).trim();

    if (!queryId && !queryMobile) {
      setErrorMsg('Please enter either your Customer ID or registered Mobile Number.');
      return;
    }

    setIsSearching(true);

    const cleanPhone = queryMobile.replace(/\D/g, '');
    const isSampleQuery = 
      queryId.toUpperCase() === 'TC-11075' || 
      cleanPhone === '7788990077' ||
      cleanPhone.endsWith('0077') && queryId.toUpperCase().includes('11075');

    // Fast-path: Sample demonstration account
    if (isSampleQuery) {
      setTimeout(() => {
        setTrackedData(SAMPLE_MEMBERS['TC-11075']);
        setSelectedChitIndex(0);
        setIsSearching(false);
      }, 250);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (queryId) params.append('customerId', queryId);
      if (queryMobile) params.append('mobile', queryMobile);

      const res: any = await fetchClient(`/customers/track?${params.toString()}`);
      if (res && res.success && res.data) {
        setTrackedData(res.data);
        setSelectedChitIndex(0);
      } else {
        throw new Error(res?.message || 'Subscription not found on server.');
      }
    } catch (err: any) {
      console.warn('Track chit live query note:', err);

      // Local fallback checks
      try {
        const localCustomers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
        const found = localCustomers.find((c: any) => 
          (queryId && (c.id === queryId || c.customerCode === queryId)) ||
          (queryMobile && String(c.mobile || c.phone || '').includes(cleanPhone))
        );

        if (found) {
          const installment = 2500;
          const totalPaid = Number(found.totalPaid || installment);
          const chits: ChitSubscription[] = Array.isArray(found.chits) && found.chits.length > 0
            ? found.chits.map((ch: any, idx: number) => ({
                id: ch.groupId || `CHIT-${idx + 1}`,
                groupName: ch.groupName || ch.groupId || 'Jenista Chit Plan',
                chitValue: Number(ch.chitValue || 50000),
                monthlyInstallment: Number(ch.monthlyInstallment || installment),
                duration: Number(ch.duration || 20),
                ticketNumber: ch.ticketNumber || `#0${idx + 1}`,
                scheme: ch.scheme || (idx % 2 === 0 ? 'Auction Chit' : 'Fixed Chit'),
                dueDate: ch.dueDate || new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
                paymentStatus: ch.paymentStatus || 'UP_TO_DATE',
                installmentsPaid: Math.max(1, Math.floor(totalPaid / (ch.monthlyInstallment || installment))),
                progressPercent: Math.min(100, Math.round((Math.max(1, Math.floor(totalPaid / (ch.monthlyInstallment || installment))) / (ch.duration || 20)) * 100))
              }))
            : [
                {
                  id: 'KJ-22-9598',
                  groupName: 'KJ-22 Regular Auction Chit',
                  chitValue: 50000,
                  monthlyInstallment: 2500,
                  duration: 20,
                  ticketNumber: '#01',
                  scheme: 'Auction Chit',
                  dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
                  paymentStatus: 'UP_TO_DATE',
                  installmentsPaid: 1,
                  progressPercent: 5
                }
              ];

          setTrackedData({
            customerCode: found.id || found.customerCode || queryId || 'TC-11075',
            fullName: found.name || found.fullName || 'Valued Member',
            phone: '******' + String(found.mobile || found.phone || cleanPhone || '0077').slice(-4),
            status: found.status || 'ACTIVE',
            kycStatus: 'VERIFIED',
            totalPaid: totalPaid,
            pending: Number(found.pending || 0),
            chits
          });
          setIsSearching(false);
          return;
        }

        // Secondary fallback to sample member
        if (queryId === 'TC-11075' || cleanPhone === '7788990077') {
          setTrackedData(SAMPLE_MEMBERS['TC-11075']);
          setSelectedChitIndex(0);
          setIsSearching(false);
          return;
        }
      } catch (localErr) {
        console.warn('Local fallback error:', localErr);
      }

      setErrorMsg(
        err?.message?.includes('404') || err?.message?.includes('not found')
          ? `No active chit subscription found matching "${queryId || queryMobile}". Please check your details or try our sample subscriber TC-11075.`
          : 'Unable to retrieve chit records at the moment. Please verify your Customer ID or try sample member TC-11075.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setTrackedData(null);
    setCustomerId('');
    setMobile('');
    setErrorMsg(null);
  };

  const handleQuickDemo = () => {
    setCustomerId('TC-11075');
    setMobile('7788990077');
    setErrorMsg(null);
    setIsSearching(true);
    setTimeout(() => {
      setTrackedData(SAMPLE_MEMBERS['TC-11075']);
      setSelectedChitIndex(0);
      setIsSearching(false);
    }, 200);
  };

  const activeChit = trackedData?.chits?.[selectedChitIndex] || trackedData?.chits?.[0];

  const getSchemeBadge = (scheme: string) => {
    if (scheme.includes('Auction')) {
      return {
        bg: 'bg-amber-500/15 text-amber-900 border-amber-300/80',
        cardBg: 'bg-gradient-to-r from-amber-50/90 to-amber-100/50 border-amber-200 text-amber-950',
        icon: <Gavel className="w-3.5 h-3.5 text-amber-700" />,
        label: 'Auction Chit',
        desc: 'Monthly competitive bidding. Winning discount is distributed back to members as monthly dividend deductions.'
      };
    }
    if (scheme.includes('Fixed')) {
      return {
        bg: 'bg-sky-500/15 text-sky-900 border-sky-300/80',
        cardBg: 'bg-gradient-to-r from-sky-50/90 to-sky-100/50 border-sky-200 text-sky-950',
        icon: <Lock className="w-3.5 h-3.5 text-sky-700" />,
        label: 'Fixed Chit',
        desc: 'Constant monthly payments without auction bidding discounts. Payouts are drawn transparently with 100% face value.'
      };
    }
    return {
      bg: 'bg-emerald-500/15 text-emerald-900 border-emerald-300/80',
      cardBg: 'bg-gradient-to-r from-emerald-50/90 to-emerald-100/50 border-emerald-200 text-emerald-950',
      icon: <Layers className="w-3.5 h-3.5 text-emerald-700" />,
      label: 'Regular Chit',
      desc: 'Systematic milestone savings with predetermined rotational turns, ideal for scheduled events and gold savings.'
    };
  };

  const activeSchemeInfo = activeChit ? getSchemeBadge(activeChit.scheme) : null;

  return (
    <section id="track-chit" className="py-20 bg-gradient-to-b from-white via-slate-50/70 to-white border-y border-neutral-200/80 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-500/5 blur-3xl pointer-events-none rounded-full"></div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Live Subscriber Portal
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
            Track Your Chit Progress
          </h2>
          <p className="mt-3 text-base text-neutral-600">
            Monitor your monthly chit cycle, check upcoming auction schedules, verify paid installments, and view payment dues instantly.
          </p>
        </div>

        {/* State 1: Search Form */}
        {!trackedData ? (
          <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-neutral-200/90 relative">
            <form onSubmit={handleSearch} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-2 text-left">
                  <Input
                    label="Customer ID / Membership No."
                    placeholder="e.g. TC-11075"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>
                <div className="md:col-span-2 text-left">
                  <Input
                    label="Registered Mobile Number"
                    placeholder="e.g. 7788990077"
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>
                <div className="md:col-span-1">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full h-12 text-base font-semibold shadow-md shadow-emerald-700/20 hover:shadow-lg transition-all"
                    isLoading={isSearching}
                  >
                    {!isSearching && <Search className="w-4 h-4 mr-1.5" />}
                    Track
                  </Button>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Unable to find subscription</p>
                    <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* Helper Links & Quick Demo */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-3 border-t border-neutral-100">
                <div className="flex items-center gap-2">
                  <span>New subscriber or testing?</span>
                  <button
                    type="button"
                    onClick={handleQuickDemo}
                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded-md transition-colors border border-emerald-200/60"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Try Sample Member (TC-11075)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Secure 256-bit encrypted look-up</span>
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* State 2: Active Chit Tracked Display Card */
          <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl shadow-slate-200/70 border border-neutral-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Header Member Banner */}
            <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-6 sm:p-8 text-white relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl font-black text-emerald-300 shadow-inner">
                    {trackedData.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl sm:text-2xl font-extrabold capitalize text-white tracking-tight">
                        {trackedData.fullName}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {trackedData.status}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-white/10 text-white/90 px-2 py-0.5 rounded-full border border-white/10">
                        <Award className="w-3 h-3 text-amber-300" />
                        KYC Verified
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 flex items-center gap-2 flex-wrap">
                      <span>Customer ID: <strong className="text-white font-mono">{trackedData.customerCode}</strong></span>
                      <span>•</span>
                      <span>Mobile: <strong className="text-white">{trackedData.phone}</strong></span>
                    </p>
                  </div>
                </div>

                {/* Reset Search Button */}
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl transition-all self-start sm:self-center border border-white/15"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Track Another Chit
                </button>
              </div>

              {/* Multiple Chits Tabs (Differentiated by Scheme) */}
              {trackedData.chits.length > 1 && (
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs text-emerald-200 font-semibold mr-2 shrink-0">
                    Subscribed Chits ({trackedData.chits.length}):
                  </span>
                  {trackedData.chits.map((c, i) => {
                    const isSelected = selectedChitIndex === i;
                    const schemeTag = c.scheme.includes('Auction') ? 'Auction' : c.scheme.includes('Fixed') ? 'Fixed' : 'Regular';
                    return (
                      <button
                        key={c.id || i}
                        onClick={() => setSelectedChitIndex(i)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'bg-white text-neutral-900 shadow-md font-bold ring-2 ring-emerald-400'
                            : 'bg-white/10 text-white/80 hover:bg-white/20'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          c.scheme.includes('Auction') ? 'bg-amber-400' :
                          c.scheme.includes('Fixed') ? 'bg-sky-400' : 'bg-emerald-400'
                        }`}></span>
                        <span>{c.groupName}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-neutral-100 text-neutral-700' : 'bg-white/10 text-white/70'
                        }`}>
                          {schemeTag}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Main Chit Body */}
            {activeChit && (
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Dynamic Scheme Differentiation Callout Banner */}
                {activeSchemeInfo && (
                  <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${activeSchemeInfo.cardBg}`}>
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/80 backdrop-blur-sm border border-current/20 flex items-center justify-center shrink-0 shadow-sm">
                        {activeSchemeInfo.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-extrabold text-sm tracking-tight">
                            {activeSchemeInfo.label} Plan Architecture
                          </h5>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90 border border-current/20">
                            {activeChit.ticketNumber}
                          </span>
                        </div>
                        <p className="text-xs opacity-90 mt-0.5 max-w-2xl">
                          {activeSchemeInfo.desc}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSchemeModal(true)}
                      className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-neutral-900 shadow-sm border border-neutral-200/80 transition-all shrink-0 self-start sm:self-center"
                    >
                      <Info className="w-3.5 h-3.5 text-emerald-600" />
                      Learn More Rules
                    </button>
                  </div>
                )}

                {/* Chit Highlights Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                  <div>
                    <span className="text-xs text-neutral-500 font-medium block">Chit Group / Scheme</span>
                    <strong className="text-sm sm:text-base font-bold text-neutral-900 block truncate mt-0.5">
                      {activeChit.groupName}
                    </strong>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 mt-0.5">
                      {activeChit.scheme}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-neutral-500 font-medium block">Total Chit Value</span>
                    <strong className="text-sm sm:text-base font-bold text-neutral-900 block mt-0.5">
                      ₹{activeChit.chitValue.toLocaleString('en-IN')}
                    </strong>
                    <span className="text-[11px] text-neutral-500">{activeChit.duration} Months Duration</span>
                  </div>

                  <div>
                    <span className="text-xs text-neutral-500 font-medium block">Monthly Installment</span>
                    <strong className="text-sm sm:text-base font-bold text-emerald-800 block mt-0.5">
                      ₹{activeChit.monthlyInstallment.toLocaleString('en-IN')}
                    </strong>
                    <span className="text-[11px] text-neutral-500">Per Month</span>
                  </div>

                  <div>
                    <span className="text-xs text-neutral-500 font-medium block">Your Ticket No.</span>
                    <strong className="text-sm sm:text-base font-bold text-neutral-900 block mt-0.5">
                      {activeChit.ticketNumber}
                    </strong>
                    <span className="text-[11px] text-emerald-600 font-medium">Assigned Subscriber</span>
                  </div>
                </div>

                {/* Live Progress Bar Section */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-slate-50 border border-emerald-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="font-bold text-neutral-900 text-sm sm:text-base flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        Chit Cycle Completion
                      </h4>
                      <p className="text-xs text-neutral-600 mt-0.5">
                        {activeChit.installmentsPaid} of {activeChit.duration} monthly installments completed
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-emerald-800">
                        {activeChit.progressPercent}%
                      </span>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        Active Cycle
                      </span>
                    </div>
                  </div>

                  {/* Visual Bar */}
                  <div className="w-full h-3.5 bg-neutral-200/80 rounded-full overflow-hidden p-0.5 shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-1000 shadow-sm"
                      style={{ width: `${Math.max(5, activeChit.progressPercent)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-neutral-500 mt-3 pt-2 border-t border-emerald-200/40">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      Next Due Date: <strong className="text-neutral-800">{activeChit.dueDate}</strong>
                    </span>
                    <span className="font-semibold text-emerald-800">
                      Remaining: {Math.max(0, activeChit.duration - activeChit.installmentsPaid)} Months
                    </span>
                  </div>
                </div>

                {/* Scheme Specific Special Metrics */}
                {activeChit.schemeDetails && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeChit.scheme.includes('Auction') && (
                      <>
                        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70">
                          <span className="text-xs text-amber-800 font-semibold block">Total Dividend Discount Earned</span>
                          <p className="text-lg font-bold text-amber-950 mt-1">{activeChit.schemeDetails.dividendEarned || '₹28,500'}</p>
                          <span className="text-[11px] text-amber-700 mt-0.5 block">Shared from previous prized auction rounds</span>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-xs text-slate-600 font-semibold block">Upcoming Online Auction</span>
                          <p className="text-lg font-bold text-slate-900 mt-1">{activeChit.schemeDetails.nextAuctionDate || '15th Nov 2026, 04:00 PM'}</p>
                          <span className="text-[11px] text-slate-500 mt-0.5 block">Eligible to place live reverse bid in app</span>
                        </div>
                      </>
                    )}

                    {activeChit.scheme.includes('Fixed') && (
                      <>
                        <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200/70">
                          <span className="text-xs text-sky-800 font-semibold block">Fixed Payout Selection</span>
                          <p className="text-lg font-bold text-sky-950 mt-1">{activeChit.schemeDetails.payoutTurnMonth || 'Month 14'}</p>
                          <span className="text-[11px] text-sky-700 mt-0.5 block">Zero auction discount loss guaranteed</span>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-xs text-slate-600 font-semibold block">Prize Amount at Turn</span>
                          <p className="text-lg font-bold text-slate-900 mt-1">{activeChit.schemeDetails.guaranteedPayout || '₹1,90,000'}</p>
                          <span className="text-[11px] text-slate-500 mt-0.5 block">100% Face Value less 5% foreman fee</span>
                        </div>
                      </>
                    )}

                    {activeChit.scheme.includes('Regular') && (
                      <>
                        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
                          <span className="text-xs text-emerald-800 font-semibold block">Milestone Rotation Turn</span>
                          <p className="text-lg font-bold text-emerald-950 mt-1">{activeChit.schemeDetails.scheduledTurn || 'Turn #03 of 20'}</p>
                          <span className="text-[11px] text-emerald-700 mt-0.5 block">Scheduled milestone disbursal</span>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-xs text-slate-600 font-semibold block">Predictable Monthly Outflow</span>
                          <p className="text-lg font-bold text-slate-900 mt-1">₹{activeChit.monthlyInstallment.toLocaleString('en-IN')}</p>
                          <span className="text-[11px] text-slate-500 mt-0.5 block">Consistent disciplined installment</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Financial Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-neutral-200 bg-white shadow-sm">
                    <span className="text-xs text-neutral-500 font-medium">Total Paid by You</span>
                    <p className="text-xl font-black text-neutral-900 mt-1">
                      ₹{trackedData.totalPaid.toLocaleString('en-IN')}
                    </p>
                    <span className="text-[11px] text-emerald-700 font-semibold mt-1 inline-block">
                      ✓ Fully accounted & secure
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-neutral-200 bg-white shadow-sm">
                    <span className="text-xs text-neutral-500 font-medium">Current Dues / Overdue</span>
                    <p className={`text-xl font-black mt-1 ${trackedData.pending > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {trackedData.pending > 0 ? `₹${trackedData.pending.toLocaleString('en-IN')}` : '₹0.00'}
                    </p>
                    <span className="text-[11px] text-neutral-500 mt-1 inline-block">
                      {trackedData.pending > 0 ? 'Due for upcoming cycle' : 'No overdue balance'}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-neutral-200 bg-white shadow-sm">
                    <span className="text-xs text-neutral-500 font-medium">Next Action</span>
                    <p className="text-sm font-bold text-neutral-900 mt-1">
                      {activeChit.scheme.includes('Auction') ? 'Auction Bidding Room' :
                       activeChit.scheme.includes('Fixed') ? 'Monthly Draw Audit' :
                       'Scheduled Rotation'}
                    </p>
                    <span className="text-[11px] text-neutral-500 mt-1 inline-block">
                      {activeChit.scheme.includes('Auction') ? 'Eligible to bid in monthly cycle' :
                       activeChit.scheme.includes('Fixed') ? 'Guaranteed draw transparent record' :
                       'Active rotational participant'}
                    </span>
                  </div>
                </div>

                {/* Action Links */}
                <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <PhoneCall className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Need personal assistance with this ticket? Call branch directly at +91 94432 10987</span>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Link to="/login" className="flex-1 sm:flex-none">
                      <Button variant="primary" className="w-full sm:w-auto h-11 px-6 font-semibold shadow-md">
                        Login to Member Portal <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scheme Detail Modal for Track Chit Section */}
      {showSchemeModal && activeChit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative">
            <div className="bg-gradient-to-r from-slate-900 to-emerald-950 text-white p-6 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                    {activeChit.scheme.includes('Auction') ? <Gavel className="w-5 h-5 text-amber-300" /> :
                     activeChit.scheme.includes('Fixed') ? <Lock className="w-5 h-5 text-sky-300" /> :
                     <Layers className="w-5 h-5 text-emerald-300" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{activeChit.scheme} Rules & Architecture</h3>
                    <p className="text-xs text-emerald-200">Ticket: {activeChit.ticketNumber} • {activeChit.groupName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSchemeModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 text-sm text-neutral-700 max-h-[75vh] overflow-y-auto">
              {activeChit.scheme.includes('Auction') && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
                    <p className="font-bold text-xs uppercase tracking-wider text-amber-800 mb-1">How Reverse Auction Works</p>
                    <p className="text-xs leading-relaxed">
                      Every month, members who require immediate funds submit competitive bids. The member who bids the highest discount takes the prize money. The discount (minus 5% foreman commission) is divided equally among all non-prized members as a dividend deduction on their next installment.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                      <span className="text-xs text-neutral-500 font-semibold block">Disbursal Window</span>
                      <strong className="text-sm text-neutral-900 block mt-0.5">Within 7 Days</strong>
                      <span className="text-[11px] text-neutral-500">Post standard surety verification</span>
                    </div>
                    <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                      <span className="text-xs text-neutral-500 font-semibold block">Dividend Sharing</span>
                      <strong className="text-sm text-neutral-900 block mt-0.5">100% Transparent</strong>
                      <span className="text-[11px] text-neutral-500">Directly lowers monthly payments</span>
                    </div>
                  </div>
                </div>
              )}

              {activeChit.scheme.includes('Fixed') && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-950">
                    <p className="font-bold text-xs uppercase tracking-wider text-sky-800 mb-1">Fixed Scheme Architecture</p>
                    <p className="text-xs leading-relaxed">
                      Ideal for disciplined investors who do not want the volatility of auction bidding. You pay a constant fixed installment every month throughout the {activeChit.duration} months. The prize winner is selected by a transparent monthly draw supervised by the foreman, receiving 100% full face value (minus 5% foreman commission).
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                      <span className="text-xs text-neutral-500 font-semibold block">Monthly Outflow</span>
                      <strong className="text-sm text-neutral-900 block mt-0.5">Fixed ₹{activeChit.monthlyInstallment.toLocaleString('en-IN')}</strong>
                      <span className="text-[11px] text-neutral-500">No fluctuation</span>
                    </div>
                    <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                      <span className="text-xs text-neutral-500 font-semibold block">Guaranteed Payout</span>
                      <strong className="text-sm text-neutral-900 block mt-0.5">Full Face Value</strong>
                      <span className="text-[11px] text-neutral-500">Minus 5% statutory fee</span>
                    </div>
                  </div>
                </div>
              )}

              {activeChit.scheme.includes('Regular') && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                    <p className="font-bold text-xs uppercase tracking-wider text-emerald-800 mb-1">Regular Scheme Architecture</p>
                    <p className="text-xs leading-relaxed">
                      Systematic planned milestone savings where payouts follow a predetermined schedule. Subscribers know their disbursal timeline in advance, making it the perfect vehicle for children's higher education fees, planned wedding expenses, or yearly gold investments.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                      <span className="text-xs text-neutral-500 font-semibold block">Predetermined Turn</span>
                      <strong className="text-sm text-neutral-900 block mt-0.5">Preset Seniority</strong>
                      <span className="text-[11px] text-neutral-500">Zero bidding uncertainty</span>
                    </div>
                    <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                      <span className="text-xs text-neutral-500 font-semibold block">Compliance</span>
                      <strong className="text-sm text-neutral-900 block mt-0.5">Chit Funds Act 1982</strong>
                      <span className="text-[11px] text-neutral-500">Regulated & secure</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-neutral-200 flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => setShowSchemeModal(false)}
                  className="px-5 py-2 text-xs font-semibold"
                >
                  Understood & Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
