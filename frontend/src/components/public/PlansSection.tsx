import { ShieldCheck, Lock, Gavel, ArrowRight } from 'lucide-react';

const PLANS = [
  {
    type: 'Fixed Plan',
    icon: Lock,
    badge: 'Guaranteed Draw',
    badgeColor: 'bg-primary-100 text-primary-700 border-primary-200',
    accentColor: 'text-primary-600',
    borderColor: 'border-primary-100',
    bgGrad: 'from-white to-primary-50/30',
    iconBg: 'bg-primary-100',
    description:
      'A Fixed Chit Plan is the most secure and predictable form of chit fund. Every month, a draw is conducted randomly among all members. The winner receives the full chit value without any bidding, making it ideal for members who prefer certainty over returns.',
    howItWorks: [
      'All members contribute a fixed monthly installment',
      'A lucky draw is held every month by the foreman',
      'The winner collects the full chit value that month',
      'Remaining members continue their installments',
      'Every member is guaranteed to win once over the tenure',
    ],
    bestFor: 'Salaried individuals, first-time investors, or anyone who prefers a low-risk savings instrument.',
  },
  {
    type: 'Auction Plan',
    icon: Gavel,
    badge: 'High Yield',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
    accentColor: 'text-amber-600',
    borderColor: 'border-amber-100',
    bgGrad: 'from-white to-amber-50/30',
    iconBg: 'bg-amber-100',
    description:
      'An Auction Chit Plan rewards patient members. Instead of a random draw, members who need funds urgently bid to receive the prize at a discount. The difference (dividend) is distributed to all other members, reducing everyone\'s effective installment.',
    howItWorks: [
      'Members bid the amount they are willing to forgo',
      'The highest bidder wins and collects the reduced prize',
      'The bid amount is split equally as dividend among all members',
      'Non-winners enjoy a lower effective monthly installment',
      'Patient members who wait longer earn higher dividends',
    ],
    bestFor: 'Members seeking better returns on savings or those who can wait longer to collect the prize amount.',
  },
];

export const PlansSection = () => {
  return (
    <section id="plans" className="py-24 bg-neutral-50 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-950 mb-4">Our Chit Plan Types</h2>
          <p className="text-neutral-500 text-lg">
            We offer two types of government-regulated chit fund plans. Choose the one that suits your financial goals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {PLANS.map(plan => {
            const Icon = plan.icon;
            return (
              <div key={plan.type}
                className={`rounded-2xl border ${plan.borderColor} bg-gradient-to-br ${plan.bgGrad} p-8 shadow-sm hover:shadow-lg transition-shadow duration-300`}>
                
                {/* Icon + Badge */}
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl ${plan.iconBg} flex items-center justify-center`}>
                    <Icon className={`w-7 h-7 ${plan.accentColor}`} />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-2xl font-black text-slate-900 mb-3">{plan.type}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-7">{plan.description}</p>

                {/* How it works */}
                <div className="mb-7">
                  <p className={`text-xs font-black uppercase tracking-widest ${plan.accentColor} mb-4`}>How It Works</p>
                  <ul className="space-y-2.5">
                    {plan.howItWorks.map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 ${plan.iconBg} ${plan.accentColor}`}>
                          {i + 1}
                        </span>
                        <span className="text-sm text-slate-600">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Best for */}
                <div className={`rounded-xl border ${plan.borderColor} p-4 mb-6 bg-white/60`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${plan.accentColor} mb-1`}>Best For</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{plan.bestFor}</p>
                </div>

                {/* CTA */}
                <button className={`flex items-center gap-2 text-sm font-bold ${plan.accentColor} hover:gap-3 transition-all`}>
                  Learn More & Enquire <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-14 text-center">
          <div className="inline-flex items-center justify-center p-4 bg-primary-50 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-primary-500 mr-3" />
            <p className="text-primary-950 font-medium text-sm sm:text-base">
              All plans are strictly regulated under the Chit Fund Act. 100% Secure & Transparent.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};
