import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  Check, 
  Link as LinkIcon, 
  LogOut, 
  Settings, 
  User, 
  CreditCard, 
  Users, 
  Layers, 
  X,
  Clock
} from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { isMockCustomer, isMockGroup } from '../../utils/cleanMockData';

interface TopbarProps {
  onMenuClick?: () => void;
  isSidebarOpen?: boolean;
}

export const Topbar = (_props: TopbarProps = {}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Registration link copy state
  const [copied, setCopied] = useState(false);
  const copyRegistrationLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/register`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    customers: any[];
    groups: any[];
    payments: any[];
  }>({ customers: [], groups: [], payments: [] });
  const searchRef = useRef<HTMLDivElement>(null);

  // Notification state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  
  // Profile dropdown state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Live pending counts for notifications
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  const loadNotificationsData = () => {
    try {
      const reqs = JSON.parse(localStorage.getItem('paymentRequests') || '[]');
      const filteredReqs = reqs.filter((r: any) => r.status === 'PENDING_VERIFICATION' || r.status === 'PENDING');
      setPendingPayments(filteredReqs);

      const custs = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
      const filteredCusts = custs.filter((c: any) => c.status === 'PENDING_APPROVAL' && !isMockCustomer(c));
      setPendingApprovals(filteredCusts);
    } catch {
      setPendingPayments([]);
      setPendingApprovals([]);
    }
  };

  useEffect(() => {
    loadNotificationsData();
    window.addEventListener('storage', loadNotificationsData);
    const interval = setInterval(loadNotificationsData, 3000);
    return () => {
      window.removeEventListener('storage', loadNotificationsData);
      clearInterval(interval);
    };
  }, []);

  // Global Search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ customers: [], groups: [], payments: [] });
      setIsSearchOpen(false);
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    const cleanDigits = searchQuery.replace(/\D/g, '');

    // 1. Search Customers
    const diskCusts = JSON.parse(localStorage.getItem('mockCustomers') || '[]').filter((c: any) => !isMockCustomer(c));
    const matchedCusts = diskCusts.filter((c: any) => {
      const cMobile = (c.mobile || c.phone || '').replace(/\D/g, '');
      const cName = (c.name || c.fullName || '').toLowerCase();
      const cId = (c.id || c.customerCode || '').toLowerCase();
      return cName.includes(q) || cId.includes(q) || (cleanDigits && cMobile.includes(cleanDigits));
    }).slice(0, 4);

    // 2. Search Groups
    const diskGroups = JSON.parse(localStorage.getItem('mockChitGroups') || '[]').filter((g: any) => !isMockGroup(g));
    const matchedGroups = diskGroups.filter((g: any) => {
      const gName = (g.name || g.groupName || '').toLowerCase();
      const gId = (g.id || g.code || '').toLowerCase();
      return gName.includes(q) || gId.includes(q);
    }).slice(0, 4);

    // 3. Search Payments
    const diskPayments = JSON.parse(localStorage.getItem('paymentRequests') || '[]');
    const matchedPayments = diskPayments.filter((p: any) => {
      const pRef = (p.referenceNo || '').toLowerCase();
      const pName = (p.customerName || '').toLowerCase();
      return pRef.includes(q) || pName.includes(q);
    }).slice(0, 3);

    setSearchResults({
      customers: matchedCusts,
      groups: matchedGroups,
      payments: matchedPayments
    });
    setIsSearchOpen(true);
  }, [searchQuery]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalNotifications = pendingPayments.length + pendingApprovals.length;
  const adminName = user?.name || 'Santy Y';
  const adminInitials = adminName.slice(0, 2).toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 relative z-30 shadow-2xs">
      {/* Left: Global Search Field */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        {/* Global Search Bar */}
        <div ref={searchRef} className="relative flex-1">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim()) setIsSearchOpen(true);
              }}
              placeholder="Search members, groups, receipts..."
              className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in duration-150">
              <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100 text-xs">
                {/* Customers Result */}
                {searchResults.customers.length > 0 && (
                  <div className="py-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-1">
                      Members ({searchResults.customers.length})
                    </span>
                    {searchResults.customers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery('');
                          navigate(`/admin/customers/${c.id}`);
                        }}
                        className="px-3 py-2 hover:bg-amber-50/60 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-amber-600" />
                          <span className="font-bold text-slate-800">{c.name || c.fullName}</span>
                          <span className="text-[11px] text-slate-400 font-mono">({c.id})</span>
                        </div>
                        <span className="text-[11px] text-slate-500">{c.mobile || c.phone}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Groups Result */}
                {searchResults.groups.length > 0 && (
                  <div className="py-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-1">
                      Chit Groups ({searchResults.groups.length})
                    </span>
                    {searchResults.groups.map((g) => (
                      <div
                        key={g.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery('');
                          navigate(`/admin/dashboard?group=${encodeURIComponent(g.name || g.id)}`);
                        }}
                        className="px-3 py-2 hover:bg-amber-50/60 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-amber-600" />
                          <span className="font-bold text-slate-800">{g.name}</span>
                        </div>
                        <span className="text-[11px] text-emerald-700 font-semibold">{g.status || 'Active'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Payments Result */}
                {searchResults.payments.length > 0 && (
                  <div className="py-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-1">
                      Payments & Receipts ({searchResults.payments.length})
                    </span>
                    {searchResults.payments.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery('');
                          navigate(`/admin/payments`);
                        }}
                        className="px-3 py-2 hover:bg-amber-50/60 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-amber-600" />
                          <span className="font-bold text-slate-800">{p.customerName}</span>
                          <span className="font-mono text-[10px] text-slate-500">UTR: {p.referenceNo}</span>
                        </div>
                        <span className="font-bold text-emerald-700">₹{Number(p.amount).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.customers.length === 0 && searchResults.groups.length === 0 && searchResults.payments.length === 0 && (
                  <div className="py-6 text-center text-slate-400">
                    <Search className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                    <p className="text-xs font-medium">No matching members, groups, or transactions found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions, Notifications & Administrator Profile */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Customer Registration Link Feature */}
        <button 
          onClick={copyRegistrationLink}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-medium transition-all shadow-2xs hover:shadow-xs active:scale-95"
          title="Copy customer self-registration portal link"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
          <span>{copied ? 'Link Copied!' : 'Registration Link'}</span>
        </button>

        {/* Notifications Bell Dropdown */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {totalNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#e02424] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-xs border-2 border-white">
                {totalNotifications > 9 ? '9+' : totalNotifications}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in duration-150">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Notifications & Alerts</h4>
                  <p className="text-[11px] text-slate-500">Live system updates needing attention</p>
                </div>
                {totalNotifications > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    {totalNotifications} New
                  </span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                {pendingPayments.length === 0 && pendingApprovals.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <Check className="w-7 h-7 mx-auto text-emerald-500 mb-1" />
                    <p className="font-semibold text-slate-700 text-xs">All caught up!</p>
                    <p className="text-[11px]">No pending payments or registrations requiring approval.</p>
                  </div>
                ) : (
                  <>
                    {pendingPayments.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          navigate('/admin/payments');
                        }}
                        className="p-3.5 hover:bg-amber-50/50 cursor-pointer transition-colors flex items-start gap-3"
                      >
                        <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate">
                            Payment Verification Required
                          </p>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            {p.customerName} submitted <strong>₹{Number(p.amount).toLocaleString('en-IN')}</strong> via {p.paymentMode}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> UTR: {p.referenceNo}
                          </span>
                        </div>
                      </div>
                    ))}

                    {pendingApprovals.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          navigate('/admin/customers/approvals');
                        }}
                        className="p-3.5 hover:bg-blue-50/50 cursor-pointer transition-colors flex items-start gap-3"
                      >
                        <div className="p-2 bg-blue-100 text-blue-800 rounded-xl shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate">
                            New Member Registration
                          </p>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            {c.name} registered and awaits verification.
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Administrator Profile Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1 sm:pl-2 sm:pr-3 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors"
            aria-label="User Profile"
          >
            <div className="w-9 h-9 rounded-full bg-[#f8ebd3] text-[#8c601c] border border-[#ebd8b3] font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              {adminInitials}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 leading-tight">
                {adminName}
              </span>
              <span className="text-[10px] font-normal text-slate-400 leading-tight">
                Admin
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in duration-150">
              <div className="p-3 bg-slate-50 border-b border-slate-100">
                <p className="font-bold text-slate-800 text-xs truncate">{adminName}</p>
                <p className="text-[11px] text-slate-500 font-medium">System Administrator</p>
              </div>

              <div className="p-1.5 space-y-0.5 text-xs font-medium text-slate-700">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/admin/settings');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Settings & Preferences</span>
                </button>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/admin/banks');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-left"
                >
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  <span>Bank Accounts Desk</span>
                </button>
                <button
                  onClick={copyRegistrationLink}
                  className="w-full md:hidden flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-left"
                >
                  <LinkIcon className="w-4 h-4 text-slate-500" />
                  <span>Copy Registration Link</span>
                </button>
              </div>

              <div className="p-1.5 border-t border-slate-100">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold transition-colors text-left text-xs"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
