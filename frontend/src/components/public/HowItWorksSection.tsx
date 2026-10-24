import { FileSignature, Calculator, PiggyBank, HandCoins } from 'lucide-react';

export const HowItWorksSection = () => {
  const steps = [
    {
      icon: <Calculator className="w-8 h-8 text-primary-500" />,
      title: "1. Choose Your Plan",
      description: "Select from a wide range of government-approved chit schemes based on your monthly budget and ultimate financial goals."
    },
    {
      icon: <FileSignature className="w-8 h-8 text-primary-500" />,
      title: "2. Simple Registration",
      description: "Complete our seamless digital KYC and document verification from the comfort of your home. No physical branch visits required."
    },
    {
      icon: <PiggyBank className="w-8 h-8 text-primary-500" />,
      title: "3. Start Saving",
      description: "Pay your monthly installments through our secure online portal and track your growing investments in your digital passbook."
    },
    {
      icon: <HandCoins className="w-8 h-8 text-primary-500" />,
      title: "4. Bid & Borrow",
      description: "Participate in monthly transparent online auctions. Bid for the prized amount whenever you need urgent liquidity for life's milestones."
    }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-950 mb-4">How Jenista Chits Works</h2>
          <p className="text-neutral-600 text-lg">
            A simple, transparent, and rewarding 4-step process to financial empowerment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              {/* Connector Line for Desktop */}
              {index !== steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-neutral-200 z-0"></div>
              )}
              
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-950 group-hover:scale-110 transition-all duration-300 shadow-sm border border-neutral-100">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-primary-950 mb-3">{step.title}</h3>
                <p className="text-neutral-600 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
