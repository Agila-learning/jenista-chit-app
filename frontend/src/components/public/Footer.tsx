import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-primary-950 text-neutral-400 py-12 border-t border-primary-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <img src="/assets/Chit logo.jpg.jpeg" alt="Jenista Chits Logo" className="h-12 w-12 object-contain" />
              <span className="font-bold text-xl text-white tracking-tight">Jenista Chits</span>
            </div>
            <p className="text-sm">
              Professional, transparent, and digitally managed chit fund services ensuring your wealth grows securely.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 uppercase tracking-wider text-sm">Plans</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/fixed-plans" className="hover:text-accent transition-colors">Fixed Plans</Link></li>
              <li><Link to="/auction-plans" className="hover:text-accent transition-colors">Auction Plans</Link></li>
              <li><Link to="/how-it-works" className="hover:text-accent transition-colors">How It Works</Link></li>
              <li><Link to="/eligibility" className="hover:text-accent transition-colors">Eligibility</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 uppercase tracking-wider text-sm">Customer Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/login" className="hover:text-accent transition-colors">Customer Portal</Link></li>
              <li><Link to="/track" className="hover:text-accent transition-colors">Track Chit Status</Link></li>
              <li><Link to="/faq" className="hover:text-accent transition-colors">FAQ</Link></li>
              <li><Link to="/complaints" className="hover:text-accent transition-colors">Register Complaint</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 uppercase tracking-wider text-sm">Contact Us</h4>
            <ul className="space-y-3.5 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-1" />
                <div className="space-y-2">
                  <div>
                    <span className="block font-semibold text-neutral-200 text-xs uppercase tracking-wide">Head Office</span>
                    <p className="text-neutral-400 leading-relaxed">
                      D.No. 4/342/4, Mani Road,<br />
                      Pudukkottai, Thoothukudi - 628 103.
                    </p>
                  </div>
                  <div>
                    <span className="block font-semibold text-neutral-200 text-xs uppercase tracking-wide">Branch Office</span>
                    <p className="text-neutral-400 leading-relaxed">Hosur</p>
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <div className="flex flex-wrap gap-x-1.5 text-neutral-400">
                  <a href="tel:+917094295556" className="hover:text-accent transition-colors">+91 70942 95556</a>,
                  <a href="tel:+917094045556" className="hover:text-accent transition-colors">70940 45556</a>
                </div>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <a href="mailto:jenistachits@gmail.com" className="hover:text-accent transition-colors text-neutral-400">
                  jenistachits@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-4 h-4 text-neutral-400 flex-shrink-0 flex items-center justify-center font-bold text-[10px] tracking-tight border border-neutral-600 rounded-sm">CIN</span>
                <span className="text-neutral-400 font-mono text-xs tracking-wide">U67190TZ2020PTC033361</span>
              </li>
            </ul>
          </div>

        </div>
        
        <div className="pt-8 border-t border-primary-900 flex flex-col md:flex-row justify-between items-center text-xs">
          <p>&copy; {new Date().getFullYear()} Jenista Chits Pvt. Ltd. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
