import { Star, Quote } from 'lucide-react';

export const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Rajesh Kumar",
      role: "Textile Business Owner",
      quote: "Jenista Chits provided me the capital to expand my shop exactly when the banks delayed my loan. The auction process is fully transparent and incredibly fast.",
      image: "/assets/business.jpg"
    },
    {
      name: "Sneha Reddy",
      role: "Software Engineer",
      quote: "I use Jenista Chits as a disciplined saving tool. The dividend I get every month makes my effective return much higher than standard bank recurring deposits.",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200"
    },
    {
      name: "Amit Desai",
      role: "Father of two",
      quote: "I planned my daughter's education through a 50-month scheme. The customer portal is so easy to use, I can track my passbook right from my phone.",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200"
    }
  ];

  return (
    <section className="py-24 bg-primary-950 text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by Millions Across India</h2>
          <p className="text-primary-200 max-w-2xl mx-auto text-lg">
            Don't just take our word for it. Hear from our community of savers and borrowers who have achieved their financial milestones with us.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-primary-900 rounded-2xl p-8 border border-primary-800 hover:-translate-y-2 hover:shadow-2xl hover:shadow-accent/20 transition-all duration-300 relative group">
              <Quote className="absolute top-6 right-6 w-12 h-12 text-primary-800 opacity-50 group-hover:text-accent transition-colors duration-300" />
              
              <div className="flex items-center space-x-1 mb-6 text-accent">
                {[1,2,3,4,5].map(star => <Star key={star} className="w-4 h-4 fill-current" />)}
              </div>
              
              <p className="text-primary-100 text-lg mb-8 leading-relaxed">
                "{t.quote}"
              </p>
              
              <div className="flex items-center space-x-4">
                <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full object-cover border-2 border-primary-700" />
                <div>
                  <h4 className="font-bold text-white">{t.name}</h4>
                  <p className="text-sm text-primary-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
