import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Layers, 
  UserPlus, 
  UserCheck, 
  CreditCard, 
  AlertTriangle, 
  Calendar, 
  BarChart3, 
  Keyboard, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { isMacPlatform } from '../../utils/keyboardShortcuts';

interface QuickActionItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  shortcut: string[];
  macShortcut: string[];
  route?: string;
  action?: () => void;
  badge?: string;
}

interface QuickActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcutGuide: () => void;
}

export const QuickActionsModal: React.FC<QuickActionsModalProps> = ({
  isOpen,
  onClose,
  onOpenShortcutGuide
}) => {
  const navigate = useNavigate();
  const isMac = isMacPlatform();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const actions: QuickActionItem[] = [
    {
      id: 'create-group',
      title: 'Create Chit Group',
      description: 'Launch new auction or fixed chit group scheme',
      icon: Layers,
      shortcut: ['Alt', 'G'],
      macShortcut: ['⌥', 'G'],
      route: '/admin/chit-groups?action=create'
    },
    {
      id: 'register-customer',
      title: 'Register Customer',
      description: 'Onboard and register new customer with KYC details',
      icon: UserPlus,
      shortcut: ['Alt', 'C'],
      macShortcut: ['⌥', 'C'],
      route: '/admin/customers/add'
    },
    {
      id: 'add-member',
      title: 'Add Member / Enroll Chit',
      description: 'Attach registered customer to active chit scheme and ticket',
      icon: UserCheck,
      shortcut: ['Alt', 'M'],
      macShortcut: ['⌥', 'M'],
      route: '/admin/customers/approvals'
    },
    {
      id: 'record-payment',
      title: 'Record Payment (Receipt)',
      description: 'Issue collection receipt for customer monthly installment',
      icon: CreditCard,
      shortcut: ['Alt', 'P'],
      macShortcut: ['⌥', 'P'],
      route: '/admin/receipts'
    },
    {
      id: 'check-overdue',
      title: 'Check Overdue Accounts',
      description: 'Review overdue balances, non-payers, and penalty tracking',
      icon: AlertTriangle,
      shortcut: ['Alt', 'O'],
      macShortcut: ['⌥', 'O'],
      route: '/admin/reports/non-payers'
    },
    {
      id: 'today-collection',
      title: "Today's Collection",
      description: "Inspect collections recorded today in day ledger",
      icon: Calendar,
      shortcut: ['Alt', 'T'],
      macShortcut: ['⌥', 'T'],
      route: '/admin/ledger?filter=today'
    },
    {
      id: 'view-reports',
      title: 'View Reports',
      description: 'Open financial ledgers, audit registers, and analytics',
      icon: BarChart3,
      shortcut: ['Alt', 'R'],
      macShortcut: ['⌥', 'R'],
      route: '/admin/reports/non-payers'
    },
    {
      id: 'shortcut-guide',
      title: 'Keyboard Shortcuts Guide',
      description: 'View complete shortcut reference sheet across all modules',
      icon: Keyboard,
      shortcut: ['Shift', '?'],
      macShortcut: ['⇧', '?'],
      action: () => {
        onClose();
        onOpenShortcutGuide();
      }
    }
  ];

  const filteredActions = actions.filter(action => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      action.title.toLowerCase().includes(q) ||
      action.description.toLowerCase().includes(q) ||
      action.shortcut.join(' ').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const executeAction = (action: QuickActionItem) => {
    onClose();
    if (action.action) {
      action.action();
    } else if (action.route) {
      navigate(action.route);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredActions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredActions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        executeAction(filteredActions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Palette Search Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 bg-white flex items-center gap-3">
          <Search className="w-5 h-5 text-amber-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Type a command or jump to feature (Alt+G, Alt+P)..."
            className="flex-1 text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded">
            Esc
          </kbd>
        </div>

        {/* Action List */}
        <div className="p-2 overflow-y-auto max-h-[60vh] divide-y divide-slate-100/60 scrollbar-thin scrollbar-thumb-slate-200">
          {filteredActions.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <Sparkles className="w-6 h-6 mx-auto mb-1 text-slate-300" />
              <p className="text-xs font-semibold">No action found matching "{searchQuery}"</p>
            </div>
          ) : (
            filteredActions.map((action, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = action.icon;
              const displayKeys = isMac ? action.macShortcut : action.shortcut;

              return (
                <div
                  key={action.id}
                  onClick={() => executeAction(action)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected 
                      ? 'bg-amber-500/10 text-slate-900 border border-amber-300/60' 
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected 
                        ? 'bg-amber-600 text-white shadow-2xs' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${isSelected ? 'text-[#102B63]' : 'text-slate-900'}`}>
                          {action.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {action.description}
                      </p>
                    </div>
                  </div>

                  {/* Shortcut Badges */}
                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    <div className="flex items-center gap-1">
                      {displayKeys.map((k, i) => (
                        <kbd 
                          key={i} 
                          className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600 bg-white border border-slate-200 rounded shadow-2xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                    <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-600' : 'text-transparent'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-[10px]">↑</kbd> <kbd className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-[10px]">↓</kbd> Navigate</span>
            <span><kbd className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-[10px]">↵</kbd> Select</span>
          </div>
          <span className="font-medium text-[#102B63]">Jenista Chits Quick Actions</span>
        </div>
      </div>
    </div>
  );
};
