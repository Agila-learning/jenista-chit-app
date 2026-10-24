import { HeartHandshake, Shield, Target } from 'lucide-react';

export const AboutUsSection = () => {
  return (
    <section id="about" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div className="space-y-6">
            <div className="inline-flex items-center space-x-2 bg-primary-50 rounded-full px-4 py-1.5 mb-2">
              <span className="text-xs font-bold text-primary-900 tracking-wider uppercase">Our Legacy</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-primary-950 leading-tight">
              Six Decades of Empowering <br/>
              <span className="text-accent-dark">Indian Aspirations.</span>
            </h2>
            <p className="text-lg text-neutral-600 leading-relaxed">
              Jenista Chits is not just a financial institution; we are a community-driven movement. Since our inception, we have championed the dual power of disciplined savings and accessible credit, helping millions of families and small businesses achieve their dreams without the burden of traditional debt.
            </p>
            
            <div className="space-y-8 pt-8">
              <div className="flex gap-4 group">
                <div className="bg-primary-50 p-3 rounded-lg text-primary-900 group-hover:bg-primary-900 group-hover:text-white transition-colors duration-300">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-primary-900">100% Regulated & Secure</h4>
                  <p className="text-neutral-500 mt-1">Registered under the Chit Fund Act. All operations are strictly audited and transparent.</p>
                </div>
              </div>
              
              <div className="flex gap-4 group">
                <div className="bg-success-50 p-3 rounded-lg text-success group-hover:bg-success group-hover:text-white transition-colors duration-300">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-primary-900">Goal-Oriented Financials</h4>
                  <p className="text-neutral-500 mt-1">Whether it's a daughter's wedding or business expansion, our flexible plans meet you where you are.</p>
                </div>
              </div>

              <div className="flex gap-4 group">
                <div className="bg-accent-light p-3 rounded-lg text-accent-dark group-hover:bg-accent-dark group-hover:text-white transition-colors duration-300">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-primary-900">Community Trust</h4>
                  <p className="text-neutral-500 mt-1">Over 2 Lakh active subscribers trust us with their hard-earned money every single month.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary-100 to-accent opacity-50 blur-2xl rounded-[3rem]"></div>
            <img 
              src="/assets/family.jpg" 
              alt="Happy Family Planning Finances" 
              className="relative z-10 w-full h-[600px] object-cover rounded-[2rem] shadow-2xl hover:-translate-y-2 transition-transform duration-500"
            />
            
            <div className="absolute bottom-10 -left-10 bg-white p-6 rounded-2xl shadow-xl z-20 hidden md:block hover:scale-105 transition-transform duration-300">
              <p className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-2">Total Disbursals</p>
              <h3 className="text-3xl font-extrabold text-success">₹5,000+ Cr</h3>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
};
