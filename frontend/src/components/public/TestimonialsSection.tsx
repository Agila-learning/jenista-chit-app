import { Star, Quote, CheckCircle2 } from 'lucide-react';

export const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Rajesh Kumar",
      role: "Textile Business Owner, Erode",
      scheme: "₹10 Lakh Auction Chit",
      quote: "Jenista Chits provided me the capital to expand my shop exactly when the banks delayed my loan. The auction process is fully transparent and incredibly fast.",
      image: "/assets/business.jpg"
    },
    {
      name: "Sneha Reddy",
      role: "Software Professional, Chennai",
      scheme: "₹2.5 Lakh Regular Chit",
      quote: "I use Jenista Chits as a disciplined monthly saving tool. The dividend I get every month makes my effective return much higher than standard bank recurring deposits.",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200"
    },
    {
      name: "Amit Desai",
      role: "Logistics Partner, Hosur",
      scheme: "₹5 Lakh Fixed Chit",
      quote: "I planned my daughter's education through a 25-month scheme. The customer portal is so easy to use, I can track my passbook and pay directly from my phone.",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200"
    }
  ];

  return (
    <section className="py-24 bg-[#060c18] text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/25 text-xs font-bold uppercase tracking-wider mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Verified Subscriber Feedback</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-4">
            Loved by Thousands Across India
          </h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Real stories from our community of savers and entrepreneurs who achieved their family milestones with Jenista Chits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((t, i) => (
            <div 
              key={i} 
              className="bg-white/[0.04] backdrop-blur-xl rounded-3xl p-7 sm:p-8 border border-white/10 hover:border-white/25 hover:bg-white/[0.07] hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 relative group flex flex-col justify-between"
            >
              <Quote className="absolute top-6 right-6 w-10 h-10 text-white/10 group-hover:text-cyan-400/40 transition-colors duration-300" />
              
              <div>
                <div className="flex items-center space-x-1 mb-4 text-amber-400">
                  {[1,2,3,4,5].map(star => <Star key={star} className="w-4 h-4 fill-current" />)}
                </div>
                
                <p className="text-slate-200 text-sm sm:text-base mb-8 leading-relaxed font-normal">
                  "{t.quote}"
                </p>
              </div>
              
              <div className="flex items-center space-x-3.5 pt-4 border-t border-white/10">
                <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400/50 shadow-md" />
                <div>
                  <h4 className="font-extrabold text-white text-sm sm:text-base flex items-center gap-1.5">
                    {t.name}
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  </h4>
                  <p className="text-xs text-slate-400">{t.role}</p>
                  <span className="inline-block text-[10px] font-bold text-cyan-300 mt-0.5">
                    {t.scheme}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
