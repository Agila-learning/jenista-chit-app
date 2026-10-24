export const AppFeaturesSection = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">
        
        {/* Simplified Borrowing & Amplified Saving (Piggy Bank) */}
        <div>
          <div className="grid md:grid-cols-2 gap-16 mb-16">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-primary-950 mb-4">Simplified Borrowing</h3>
              <p className="text-neutral-600 leading-relaxed">
                Borrowing has never been this easy as you can do while investing in a chit fund. The simplified documentation process allows you to make a hassle-free borrowing that can be highly helpful to handle your financial commitments.
              </p>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-primary-950 mb-4">Amplified Saving</h3>
              <p className="text-neutral-600 leading-relaxed">
                Investing in a chit fund scheme has many benefits but the most striking one amongst everything is the fact that it gives you a dividend amount every month that can multiply your savings effectively which can be a great source of an alternate income.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/3 relative mb-12 md:mb-0">
              <div className="absolute inset-0 bg-primary-200 rounded-full blur-3xl opacity-50 transform -translate-x-12"></div>
              <img src="/assets/piggy.jpg" alt="Savings Piggy Bank" className="relative z-10 w-full max-w-sm mx-auto hover:-translate-y-4 transition-transform duration-500 drop-shadow-2xl mix-blend-multiply" />
            </div>
            <div className="md:w-1/2 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold text-primary-950 mb-6">Make Your Dreams Come True!</h2>
              <p className="text-neutral-600 leading-relaxed text-lg">
                A simple borrowing process that cuts down a complicated documentation procedure and also that does not make you payback with high interest rates is what that makes a chit fund plan your best bet when it comes to borrowing. Plan properly and borrow at the right time within your chit tenure and make your dreams come true!
              </p>
            </div>
          </div>
        </div>

        {/* Digital App Features Section */}
        <div className="text-center border-t border-neutral-100 pt-24">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-950 mb-4">Jenista Chits Digital App</h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto mb-16">
            Download our user-friendly mobile application and carry every detail in your pocket to access them from anywhere.
          </p>

          <div className="grid md:grid-cols-3 gap-8 items-center">
            
            {/* Left Features */}
            <div className="space-y-16 order-2 md:order-1">
              <div className="group hover:-translate-y-2 transition-transform duration-300">
                <div className="bg-primary-50 w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:bg-primary-500 transition-colors">
                  <span className="text-2xl">📅</span>
                </div>
                <h4 className="font-bold text-primary-950 text-lg">See dues and payment schedule</h4>
              </div>
              
              <div className="group hover:-translate-y-2 transition-transform duration-300">
                <div className="bg-primary-50 w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:bg-primary-500 transition-colors">
                  <span className="text-2xl">⏰</span>
                </div>
                <h4 className="font-bold text-primary-950 text-lg">Get payment and reminder notifications</h4>
              </div>
            </div>

            {/* Center Image */}
            <div className="relative order-1 md:order-2">
              <div className="absolute inset-0 bg-primary-200 rounded-[3rem] blur-3xl opacity-40 scale-90"></div>
              <img src="/assets/app.jpg" alt="Digital Chit Fund App" className="relative z-10 w-full hover:scale-105 transition-transform duration-700 drop-shadow-2xl mix-blend-multiply rounded-3xl" />
            </div>

            {/* Right Features */}
            <div className="space-y-16 order-3">
              <div className="group hover:-translate-y-2 transition-transform duration-300">
                <div className="bg-primary-50 w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:bg-primary-500 transition-colors">
                  <span className="text-2xl">📱</span>
                </div>
                <h4 className="font-bold text-primary-950 text-lg">Subscribe & manage all your chits</h4>
              </div>
              
              <div className="group hover:-translate-y-2 transition-transform duration-300">
                <div className="bg-primary-50 w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:bg-primary-500 transition-colors">
                  <span className="text-2xl">💳</span>
                </div>
                <h4 className="font-bold text-primary-950 text-lg">Make Digitally Secured Payments Online</h4>
              </div>
            </div>

          </div>
        </div>
        
      </div>
    </section>
  );
};
