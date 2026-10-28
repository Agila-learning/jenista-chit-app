import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { saveWebsiteLead } from '../../utils/notificationsData';

export const ContactSection = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [interestedPlan, setInterestedPlan] = useState('Auction Chit Plan');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !phone.trim()) return;

    // Save lead into Admin system
    saveWebsiteLead({
      fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      message: message.trim() || undefined,
      interestedPlan: interestedPlan
    });

    setIsSubmitted(true);
    // Reset inputs
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setMessage('');
  };

  return (
    <section id="contact" className="py-24 bg-neutral-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-950 mb-4">Join a Plan or Get in Touch</h2>
          <p className="text-neutral-600 text-lg">
            Have questions about our chit plans or ready to enrol? Submit your details below and our financial advisors will assist you immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* Contact Information */}
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-200">
              <h3 className="text-2xl font-bold text-primary-950 mb-8">Contact & Office Details</h3>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="bg-primary-50 p-3 rounded-lg mr-4 text-primary-500 flex-shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-primary-950">Head Office</h4>
                    <p className="text-neutral-600 mt-1">
                      D.No. 4/342/4, Mani Road, Pudukkottai,<br />
                      Thoothukudi - 628 103, Tamil Nadu
                    </p>
                    <div className="mt-3 pt-3 border-t border-neutral-100">
                      <h5 className="font-bold text-primary-950 text-sm">Branch Office</h5>
                      <p className="text-neutral-600 text-sm mt-0.5">Hosur, Tamil Nadu</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-primary-50 p-3 rounded-lg mr-4 text-primary-500 flex-shrink-0">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-primary-950">Call Us</h4>
                    <p className="text-neutral-600 mt-1 space-y-1">
                      <a href="tel:+917094295556" className="block hover:text-primary-600 transition-colors">
                        +91 70942 95556
                      </a>
                      <a href="tel:+917094045556" className="block hover:text-primary-600 transition-colors">
                        +91 70940 45556
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-primary-50 p-3 rounded-lg mr-4 text-primary-500 flex-shrink-0">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-primary-950">Email</h4>
                    <p className="text-neutral-600 mt-1">
                      <a href="mailto:jenistachits@gmail.com" className="hover:text-primary-600 transition-colors">
                        jenistachits@gmail.com
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-primary-50 p-3 rounded-lg mr-4 text-primary-500 flex-shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-primary-950">Working Hours</h4>
                    <p className="text-neutral-600 mt-1">
                      Mon - Sat: 9:30 AM to 6:30 PM<br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-neutral-200">
            <h3 className="text-2xl font-bold text-primary-950 mb-2">Enrol / Send an Enquiry</h3>
            <p className="text-neutral-500 mb-8">We will review your inquiry and connect with you within 24 hours.</p>

            {isSubmitted ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3 animate-in fade-in">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-extrabold text-emerald-900">Enquiry Received!</h4>
                <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed max-w-sm mx-auto">
                  Thank you! Our senior chit advisor will call you shortly to assist with plan enrollment and documentation.
                </p>
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="mt-3 px-4 py-2 text-xs font-bold bg-white text-emerald-800 rounded-xl border border-emerald-300 hover:bg-emerald-50"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-neutral-700">First Name *</label>
                    <Input 
                      placeholder="e.g. Anand" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-neutral-700">Last Name</label>
                    <Input 
                      placeholder="e.g. Kumar" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-700">Email Address</label>
                  <Input 
                    type="email" 
                    placeholder="e.g. anand@example.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-neutral-700">Phone Number *</label>
                    <Input 
                      type="tel" 
                      placeholder="+91 98765 43210" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-neutral-700">Interested Chit Scheme</label>
                    <select
                      value={interestedPlan}
                      onChange={(e) => setInterestedPlan(e.target.value)}
                      className="w-full h-10 px-3 border border-neutral-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                    >
                      <option value="Auction Chit Plan (Monthly Bidding)">Auction Chit Plan (Monthly Bidding)</option>
                      <option value="Fixed Chit Plan (Guaranteed Draw)">Fixed Chit Plan (Guaranteed Draw)</option>
                      <option value="Regular Chit Plan (Milestone Seniority)">Regular Chit Plan (Milestone Seniority)</option>
                      <option value="Custom High Value Chit (10L - 25L)">Custom High Value Chit (10L - 25L)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-700">Message / Preferred Plan</label>
                  <textarea 
                    className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[120px] resize-none"
                    placeholder="Tell us which plan you are interested in (Fixed, Auction, or Regular) or your target savings goal."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  ></textarea>
                </div>

                <Button type="submit" variant="primary" className="w-full h-12 flex items-center justify-center gap-2">
                  <span>Submit Plan Enquiry</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};
