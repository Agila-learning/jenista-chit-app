import { useState } from 'react';
import { 
  FileSignature, 
  Calculator, 
  PiggyBank, 
  HandCoins, 
  ShieldCheck, 
  ArrowRight, 
  X, 
  CheckCircle2
} from 'lucide-react';

interface StepDetail {
  step: string;
  icon: any;
  title: string;
  description: string;
  badge: string;
  modalTitle: string;
  modalSubtitle: string;
  sections: {
    heading: string;
    text: string;
    points?: string[];
  }[];
  ctaText: string;
  ctaHref: string;
}

export const HowItWorksSection = () => {
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  const steps: StepDetail[] = [
    {
      step: '01',
      icon: <Calculator className="w-7 h-7 text-cyan-400" />,
      title: "Select Your Chit Plan",
      description: "Choose from our government-regulated Fixed, Auction, or Regular schemes tailored to your monthly savings capacity.",
      badge: "Scheme Selection",
      modalTitle: "Understanding Fixed, Auction & Regular Chit Plans",
      modalSubtitle: "Compare how each government-regulated scheme functions so you pick the perfect plan for your financial goals.",
      sections: [
        {
          heading: "Fixed Chit Plan (Zero Bidding Risk)",
          text: "Foreman monthly draw selects one lucky ticket each month to receive 100% face value (less standard 5% foreman commission). Best for conservative savers and salaried employees who prefer fixed, predictable monthly outflow throughout without the hassle of bidding.",
          points: [
            "Fixed predictable monthly payment throughout the full duration",
            "100% full prize pool payout without discount loss",
            "Fair transparent monthly draw conducted with subscriber witnesses"
          ]
        },
        {
          heading: "Auction Chit Plan (Reverse Bidding & Dividend Yield)",
          text: "Subscribers take part in open monthly reverse auctions. The member bidding the highest discount wins the prize fund for urgent capital needs. The discount (less 5% foreman fee) is redistributed equally as dividends to all other subscribers, lowering their next installment.",
          points: [
            "Monthly dividend distribution reduces your effective installment cost",
            "Instant liquidity: bid and withdraw funds in early months for business/emergencies",
            "Highest cumulative return for subscribers who take the chit towards the end"
          ]
        },
        {
          heading: "Regular Chit Plan (Scheduled Milestone Turns)",
          text: "Preset turn order agreed at enrollment. Each member knows the exact scheduled month when they will receive their full prize money. Perfect for planned family weddings, children's university admissions, and scheduled home renovations.",
          points: [
            "Predetermined turn schedule known in advance for easy financial planning",
            "Full capital value released on your allotted month without bidding discount",
            "Strict disciplined forced savings habit"
          ]
        }
      ],
      ctaText: "Explore Available Chit Schemes",
      ctaHref: "#plans"
    },
    {
      step: '02',
      icon: <FileSignature className="w-7 h-7 text-blue-400" />,
      title: "Fast Paperless KYC",
      description: "Submit Aadhaar & PAN online with instant digital verification. No tedious branch queues or redundant paperwork.",
      badge: "Digital Onboarding",
      modalTitle: "100% Paperless & Compliant Digital KYC",
      modalSubtitle: "Join in under 3 minutes with digital identity verification under RBI & Central Chit Fund guidelines.",
      sections: [
        {
          heading: "Required Documentation",
          text: "All you need is your Aadhaar number, PAN card, and bank account details. Our system uses secure digital OTP verification to authenticate your identity immediately.",
          points: [
            "Aadhaar OTP instant verification",
            "PAN verification with ITD database",
            "Bank account validation via penny drop verification"
          ]
        },
        {
          heading: "Regulatory Compliance & Security",
          text: "As a registered chit fund operator, your data is protected with bank-grade encryption and stored securely in compliance with the Information Technology Act and the Chit Funds Act, 1982.",
          points: [
            "Instant digital agreement signed via e-Sign",
            "Dedicated digital passbook created on enrollment",
            "Transparent subscriber passbook accessible 24/7 on web & mobile"
          ]
        }
      ],
      ctaText: "Register Online Now",
      ctaHref: "/register"
    },
    {
      step: '03',
      icon: <PiggyBank className="w-7 h-7 text-emerald-400" />,
      title: "Save & Earn Dividends",
      description: "Pay comfortable monthly installments via UPI or net banking and enjoy dividend discounts distributed every month.",
      badge: "Monthly Growth",
      modalTitle: "How Monthly Dividends Maximize Your Returns",
      modalSubtitle: "Learn why chit funds offer better effective annual returns than conventional savings accounts.",
      sections: [
        {
          heading: "Flexible Digital Payment Modes",
          text: "Make your monthly installments seamlessly using UPI (Google Pay, PhonePe, Paytm), Net Banking, NEFT/RTGS, or through authorized field collection executives.",
          points: [
            "Instant payment receipts with official transaction reference number",
            "Automated payment reminders and WhatsApp balance updates",
            "Real-time passbook ledger balance credit"
          ]
        },
        {
          heading: "Dividend Redistribution Mechanism",
          text: "In Auction Chits, when a member bids for the chit at a discount, that discount amount (minus 5% foreman commission) is divided equally among all non-prized members. This reduces your next month's payable installment, giving an effective yield of 12% to 18% APY.",
          points: [
            "Zero dividend tax deducted at source (TDS exempt)",
            "Compounded savings benefit over the entire 20 to 40 months tenure"
          ]
        }
      ],
      ctaText: "Calculate Your Monthly Returns",
      ctaHref: "#plans"
    },
    {
      step: '04',
      icon: <HandCoins className="w-7 h-7 text-amber-400" />,
      title: "Bid or Draw Prize Fund",
      description: "Bid in transparent online auctions whenever emergency funds are required, or claim your full face value on scheduled draw.",
      badge: "Payout & Liquidity",
      modalTitle: "Claiming Your Prize Money & Auction Rules",
      modalSubtitle: "Fast, transparent, and legally secured disbursal straight to your verified bank account.",
      sections: [
        {
          heading: "Auction Participation & Bidding Guidelines",
          text: "Auctions are conducted monthly at our registered office and streamed transparently. Members can place competitive bids in reverse auctions to claim the prize money early in their cycle.",
          points: [
            "Reverse bidding ceiling capped at 40% (Tamil Nadu Chit Rules)",
            "Transparent online auction tracker visible in your customer portal",
            "Foreman commission strictly regulated at standard 5%"
          ]
        },
        {
          heading: "Disbursal & Surety Settlement",
          text: "Once prized, submit required surety/guarantors as mandated by the Chit Funds Act. Payouts are transferred via direct NEFT/RTGS to your verified bank account within 24–48 hours of documentation approval.",
          points: [
            "Direct RTGS / NEFT bank transfer with zero cash hassle",
            "Continued dividend sharing after prize money withdrawal (Fixed & Regular)",
            "Clear EOD settlement receipts and clearance certificates"
          ]
        }
      ],
      ctaText: "Track Live Chit & Auctions",
      ctaHref: "#track-chit"
    }
  ];

  const activeStep = selectedStepIndex !== null ? steps[selectedStepIndex] : null;

  return (
    <section id="how-it-works" className="py-24 bg-[#070e1d] text-white relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 text-cyan-300 border border-blue-400/25 text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Simple, Transparent & Secure</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-4">
            How Jenista Chits Works
          </h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            A seamless, four-step journey to disciplined savings, monthly dividend gains, and accessible milestone liquidity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {steps.map((item, index) => (
            <div 
              key={index} 
              className="relative bg-white/[0.04] backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-white/10 hover:border-white/25 hover:bg-white/[0.08] transition-all duration-300 group hover:-translate-y-1.5 hover:shadow-2xl flex flex-col justify-between"
            >
              {/* Step Number Badge */}
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                  {item.icon}
                </div>
                <span className="text-3xl font-black text-slate-700 group-hover:text-cyan-400 transition-colors">
                  {item.step}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-400/20 px-2 py-0.5 rounded-md inline-block mb-2">
                  {item.badge}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-normal">
                  {item.description}
                </p>
              </div>

              {/* Responsive Clickable Learn More Action Button */}
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Stage {index + 1} of 4</span>
                <button
                  type="button"
                  onClick={() => setSelectedStepIndex(index)}
                  className="inline-flex items-center gap-1.5 font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer active:scale-95 shadow-xs"
                  aria-label={`Learn more about ${item.title}`}
                >
                  <span>Learn more</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Interactive Step Details Modal (Fully Responsive on Mobile & Desktop) */}
      {activeStep && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedStepIndex(null)}
        >
          <div 
            className="bg-[#0b1426] text-white w-full max-w-2xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 sm:p-7 border-b border-white/10 flex items-start justify-between bg-gradient-to-r from-blue-950/80 via-slate-900 to-emerald-950/80">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  {activeStep.icon}
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
                    <span>Stage {activeStep.step}</span>
                    <span>•</span>
                    <span>{activeStep.badge}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {activeStep.modalTitle}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    {activeStep.modalSubtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStepIndex(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/15 transition-colors shrink-0 ml-2"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable Content with Scheme Differentiations */}
            <div className="p-6 sm:p-7 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm text-slate-300">
              {activeStep.sections.map((sec, idx) => (
                <div key={idx} className="bg-white/[0.03] rounded-2xl p-4 sm:p-5 border border-white/10 space-y-2.5">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{sec.heading}</span>
                  </h4>
                  <p className="text-slate-300 leading-relaxed font-normal">
                    {sec.text}
                  </p>
                  {sec.points && (
                    <ul className="space-y-1.5 pt-1.5">
                      {sec.points.map((pt, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2 text-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-5 sm:p-6 border-t border-white/10 bg-[#091122] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {steps.map((st, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => setSelectedStepIndex(sIdx)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      selectedStepIndex === sIdx
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st.step}
                  </button>
                ))}
              </div>

              <a 
                href={activeStep.ctaHref} 
                onClick={() => setSelectedStepIndex(null)}
                className="w-full sm:w-auto"
              >
                <button
                  type="button"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                  <span>{activeStep.ctaText}</span>
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
