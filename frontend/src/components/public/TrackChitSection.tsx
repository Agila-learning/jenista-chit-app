import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Search } from 'lucide-react';

export const TrackChitSection = () => {
  const [customerId, setCustomerId] = useState('');
  const [mobile, setMobile] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      setIsSearching(false);
      // Show mock result or error
    }, 1000);
  };

  return (
    <section className="py-16 bg-white border-y border-neutral-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold text-primary-900 mb-2">Track Your Chit</h2>
        <p className="text-neutral-500 mb-8 max-w-2xl mx-auto">
          Enter your membership details below to check your current cycle progress, pending installments, and upcoming auction dates.
        </p>
        
        <form onSubmit={handleSearch} className="bg-secondary-50 p-6 rounded-lg border border-neutral-200 shadow-sm max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2 text-left">
              <Input 
                label="Customer ID / Membership No." 
                placeholder="e.g. TC-10452"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
              />
            </div>
            <div className="md:col-span-2 text-left">
              <Input 
                label="Registered Mobile Number" 
                placeholder="Enter 10 digit number"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
              />
            </div>
            <div className="md:col-span-1">
              <Button type="submit" variant="primary" className="w-full h-[42px]" isLoading={isSearching}>
                {!isSearching && <Search className="w-4 h-4 mr-2" />}
                Track
              </Button>
            </div>
          </div>
          <p className="text-xs text-neutral-400 mt-4 text-left">
            * An OTP will be sent to your registered mobile number for secure access to detailed financial records.
          </p>
        </form>
      </div>
    </section>
  );
};
