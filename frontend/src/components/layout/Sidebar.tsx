import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  CreditCard, 
  Receipt,
  ChevronDown,
  Landmark,
  Gavel,
  BarChart3,
  Bell,
  UserCheck,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../store/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
  onToggle?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: number;
  subItems?: { name: string; href: string; }[];
}

// Indian Temple Gopuram Silhouette in Golden Line Art
const TempleSilhouette = () => (
  <svg 
    viewBox="0 0 240 70" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-12 text-amber-400/40 opacity-70 transition-opacity hover:opacity-100"
  >
    {/* Base platform */}
    <line x1="10" y1="65" x2="230" y2="65" stroke="currentColor" strokeWidth="1.5" />
    <line x1="20" y1="62" x2="220" y2="62" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />

    {/* Center Grand Gopuram */}
    {/* Tier 1 (Base) */}
    <path d="M100 62 L104 50 L136 50 L140 62 Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
    <path d="M115 62 L115 54 Q120 52 125 54 L125 62 Z" stroke="currentColor" strokeWidth="1" fill="none" /> {/* Central Arch */}
    
    {/* Tier 2 */}
    <path d="M105 50 L108 40 L132 40 L135 50 Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
    <line x1="110" y1="45" x2="130" y2="45" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="120" cy="45" r="1.5" fill="currentColor" />

    {/* Tier 3 */}
    <path d="M109 40 L112 30 L128 30 L131 40 Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
    <line x1="113" y1="35" x2="127" y2="35" stroke="currentColor" strokeWidth="0.8" />

    {/* Tier 4 */}
    <path d="M113 30 L115 22 L125 22 L127 30 Z" stroke="currentColor" strokeWidth="1.2" fill="none" />

    {/* Top Kalasam / Finials */}
    <path d="M115 22 Q120 16 125 22 Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
    <line x1="120" y1="16" x2="120" y2="9" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="120" cy="8" r="1.5" fill="currentColor" />
    <line x1="117" y1="18" x2="117" y2="12" stroke="currentColor" strokeWidth="1" />
    <circle cx="117" cy="11" r="1" fill="currentColor" />
    <line x1="123" y1="18" x2="123" y2="12" stroke="currentColor" strokeWidth="1" />
    <circle cx="123" cy="11" r="1" fill="currentColor" />

    {/* Left Flanking Gopuram */}
    <path d="M55 62 L58 53 L78 53 L81 62 Z" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M64 62 L64 56 Q68 54 72 56 L72 62 Z" stroke="currentColor" strokeWidth="0.8" fill="none" />
    <path d="M59 53 L61 44 L75 44 L77 53 Z" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M62 44 L64 36 L72 36 L74 44 Z" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M64 36 Q68 31 72 36 Z" stroke="currentColor" strokeWidth="1" fill="none" />
    <line x1="68" y1="31" x2="68" y2="24" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="68" cy="23" r="1" fill="currentColor" />

    {/* Right Flanking Gopuram */}
    <path d="M159 62 L162 53 L182 53 L185 62 Z" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M168 62 L168 56 Q172 54 176 56 L176 62 Z" stroke="currentColor" strokeWidth="0.8" fill="none" />
    <path d="M163 53 L165 44 L179 44 L181 53 Z" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M166 44 L168 36 L176 36 L178 44 Z" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M168 36 Q172 31 176 36 Z" stroke="currentColor" strokeWidth="1" fill="none" />
    <line x1="172" y1="31" x2="172" y2="24" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="172" cy="23" r="1" fill="currentColor" />

    {/* Far Left Pillars & Mini Shrine */}
    <line x1="32" y1="62" x2="32" y2="52" stroke="currentColor" strokeWidth="1" />
    <line x1="42" y1="62" x2="42" y2="52" stroke="currentColor" strokeWidth="1" />
    <path d="M28 52 L37 45 L46 52 Z" stroke="currentColor" strokeWidth="1" fill="none" />
    <line x1="37" y1="45" x2="37" y2="40" stroke="currentColor" strokeWidth="1" />

    {/* Far Right Pillars & Mini Shrine */}
    <line x1="198" y1="62" x2="198" y2="52" stroke="currentColor" strokeWidth="1" />
    <line x1="208" y1="62" x2="208" y2="52" stroke="currentColor" strokeWidth="1" />
    <path d="M194 52 L203 45 L212 52 Z" stroke="currentColor" strokeWidth="1" fill="none" />
    <line x1="203" y1="45" x2="203" y2="40" stroke="currentColor" strokeWidth="1" />
  </svg>
);

export const Sidebar = (_props: SidebarProps = {}) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState<number>(() => {
    const reqs = JSON.parse(localStorage.getItem('paymentRequests') || '[]');
    return reqs.filter((r: any) => r.status === 'PENDING_VERIFICATION' || r.status === 'PENDING').length;
  });

  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(() => {
    const custs = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
    return custs.filter((c: any) => c.status === 'PENDING_APPROVAL').length;
  });

  useEffect(() => {
    const updateCounts = () => {
      const reqs = JSON.parse(localStorage.getItem('paymentRequests') || '[]');
      setPendingPaymentsCount(reqs.filter((r: any) => r.status === 'PENDING_VERIFICATION' || r.status === 'PENDING').length);
      const custs = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
      setPendingApprovalsCount(custs.filter((c: any) => c.status === 'PENDING_APPROVAL').length);
    };
    window.addEventListener('storage', updateCounts);
    const interval = setInterval(updateCounts, 3000);
    return () => {
      window.removeEventListener('storage', updateCounts);
      clearInterval(interval);
    };
  }, []);

  const isStaff = user?.role === 'STAFF';

  // Primary Navigation
  const adminMainNavigation: NavItem[] = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { 
      name: 'Members', 
      href: '/admin/customers', 
      icon: Users,
      badge: pendingApprovalsCount,
      subItems: [
        { name: 'Customer Directory', href: '/admin/customers' },
        { name: 'Register Customer', href: '/admin/customers/add' },
        { name: 'Registration Approvals', href: '/admin/customers/approvals' }
      ]
    },
    { 
      name: 'Payments', 
      href: '/admin/payments', 
      icon: CreditCard,
      badge: pendingPaymentsCount
    },
    { name: 'Schemes', href: '/admin/manage-plans', icon: Gavel },
    { name: 'Manage Bank', href: '/admin/banks', icon: Landmark },
    { name: 'Ledger', href: '/admin/ledger', icon: FileText },
    { 
      name: 'Reports', 
      href: '/admin/reports/non-payers', 
      icon: BarChart3,
      subItems: [
        { name: 'Non Payers List', href: '/admin/reports/non-payers' }
      ]
    },
    { 
      name: 'Notifications', 
      href: '/admin/payments', 
      icon: Bell,
      badge: pendingPaymentsCount + pendingApprovalsCount
    },
  ];

  // Management Navigation
  const adminManagementNavigation: NavItem[] = [
    { name: 'Settings', href: '/admin/settings', icon: Settings },
    { name: 'User Management', href: '/admin/customers/approvals', icon: UserCheck },
    { name: 'Receipt Desk', href: '/admin/receipts', icon: Receipt },
  ];

  const staffNavigation: NavItem[] = [
    { name: 'Staff Dashboard', href: '/staff/dashboard', icon: LayoutDashboard },
    { name: 'Raise Receipt', href: '/admin/receipts', icon: Receipt },
    { 
      name: 'Customers', 
      href: '/admin/customers', 
      icon: Users, 
      subItems: [
        { name: 'Register Customer', href: '/admin/customers/add' },
        { name: 'Customer Directory', href: '/admin/customers' },
      ]
    },
    { 
      name: 'Reports', 
      href: '/admin/reports/non-payers', 
      icon: BarChart3, 
      subItems: [
        { name: 'Non Payers & Dues', href: '/admin/reports/non-payers' }
      ]
    },
  ];

  const mainNav = isStaff ? staffNavigation : adminMainNavigation;
  const mgmtNav = isStaff ? [] : adminManagementNavigation;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* Sidebar Component: Hover Mode Deep Navy Panel */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setOpenSubmenu(null);
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-[#0d1527] text-slate-200 flex flex-col transition-all duration-300 ease-in-out border-r border-[#1e293b]/70 shadow-2xl overflow-x-hidden group/sidebar",
          isHovered ? "w-64" : "w-[68px]"
        )}
      >
        {/* Brand Section Header */}
        <div className="h-16 flex items-center px-3.5 border-b border-slate-800/80 bg-[#0a1120] shrink-0 overflow-hidden">
          <div className="flex items-center gap-3 w-full">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-0.5 shadow-md shadow-amber-900/30 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#0d1527] rounded-[10px] flex items-center justify-center overflow-hidden">
                <img 
                  src="/assets/Chit logo.jpg.jpeg" 
                  alt="Logo" 
                  className="w-7 h-7 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
            {isHovered && (
              <div className="flex flex-col min-w-0 animate-in fade-in duration-200">
                <span className="font-extrabold text-white text-base tracking-tight leading-tight truncate">
                  Jenista Chits
                </span>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest leading-none mt-0.5">
                  Chit Funds
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 overflow-x-hidden">
          {/* Main Navigation */}
          <div className="space-y-1">
            {mainNav.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== '/admin/dashboard' && location.pathname.startsWith(item.href));

              return (
                <div key={item.name} className="flex flex-col">
                  <NavLink
                    to={item.subItems ? '#' : item.href}
                    onClick={(e) => {
                      if (item.subItems) {
                        e.preventDefault();
                        if (!isHovered) setIsHovered(true);
                        setOpenSubmenu(openSubmenu === item.name ? null : item.name);
                      }
                    }}
                    title={!isHovered ? item.name : undefined}
                    className={cn(
                      "flex items-center rounded-xl transition-all font-medium text-xs tracking-wide relative group",
                      isHovered ? "justify-between px-3 py-2.5" : "justify-center h-11 w-11 mx-auto",
                      isActive
                        ? "bg-[#b8860b]/20 text-[#e6c687] border border-[#b8860b]/40 font-semibold shadow-2xs"
                        : "text-[#8b9bb4] hover:text-white hover:bg-white/[0.05]"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <item.icon className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isActive ? "text-[#e6c687]" : "text-[#8b9bb4] group-hover:text-white"
                      )} />
                      {isHovered && <span className="truncate">{item.name}</span>}
                    </div>

                    {/* Collapsed dot badge */}
                    {!isHovered && item.badge !== undefined && item.badge > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-2 right-2 animate-pulse" />
                    )}

                    {/* Hovered pill badge and chevron */}
                    {isHovered && (
                      <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-150">
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className={cn(
                            "text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-xs",
                            isActive 
                              ? "bg-[#b8860b] text-white" 
                              : "bg-amber-500 text-slate-950 animate-pulse"
                          )}>
                            {item.badge}
                          </span>
                        )}
                        {item.subItems && (
                          <ChevronDown className={cn(
                            "w-3.5 h-3.5 text-[#8b9bb4] transition-transform duration-200",
                            openSubmenu === item.name ? "rotate-180" : ""
                          )} />
                        )}
                      </div>
                    )}
                  </NavLink>

                  {/* Expandable Submenu */}
                  {isHovered && item.subItems && openSubmenu === item.name && (
                    <div className="ml-7 mt-1 pl-3 border-l border-slate-800 space-y-1 py-1 animate-in fade-in duration-150">
                      {item.subItems.map(subItem => {
                        const isSubActive = location.pathname === subItem.href;
                        return (
                          <NavLink
                            key={subItem.name}
                            to={subItem.href}
                            className={cn(
                              "block py-1.5 px-2.5 text-[11px] rounded-lg transition-colors font-medium",
                              isSubActive 
                                ? "text-amber-400 font-bold bg-amber-400/10" 
                                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                            )}
                          >
                            {subItem.name}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Management Section */}
          {mgmtNav.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-slate-800/60">
              {isHovered && (
                <div className="px-3 pb-1.5 animate-in fade-in duration-150">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">
                    Management
                  </span>
                </div>
              )}
              {mgmtNav.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    title={!isHovered ? item.name : undefined}
                    className={cn(
                      "flex items-center rounded-xl transition-all font-medium text-xs tracking-wide group",
                      isHovered ? "justify-between px-3 py-2.5" : "justify-center h-11 w-11 mx-auto",
                      isActive
                        ? "bg-[#b8860b]/20 text-[#e6c687] border border-[#b8860b]/40 font-semibold shadow-2xs"
                        : "text-[#8b9bb4] hover:text-white hover:bg-white/[0.05]"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <item.icon className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isActive ? "text-[#e6c687]" : "text-[#8b9bb4] group-hover:text-white"
                      )} />
                      {isHovered && <span className="truncate">{item.name}</span>}
                    </div>
                  </NavLink>
                );
              })}
            </div>
          )}

          {/* Indian Architectural Heritage Vignette */}
          {isHovered && (
            <div className="pt-4 pb-2 text-center border-t border-slate-800/60 animate-in fade-in duration-200">
              <TempleSilhouette />
              <p className="text-[10px] text-amber-200/60 font-serif italic tracking-wider mt-1.5 leading-tight">
                Building Dreams<br />Together Since 1990
              </p>
            </div>
          )}
        </div>
        
        {/* Admin User Profile Bottom Bar */}
        <div className="p-3 border-t border-slate-800 bg-[#090f1d] shrink-0 overflow-hidden">
          <div className={cn(
            "flex items-center",
            isHovered ? "justify-between" : "justify-center"
          )}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                {(user?.name || 'Santy Y').slice(0, 2).toUpperCase()}
              </div>
              {isHovered && (
                <div className="min-w-0 truncate animate-in fade-in duration-150">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {user?.name || 'Santy Y'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">
                    {isStaff ? 'Staff Field Ops' : 'Administrator'}
                  </p>
                </div>
              )}
            </div>

            {isHovered && (
              <button
                onClick={logout}
                title="Log out of session"
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors animate-in fade-in duration-150"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
