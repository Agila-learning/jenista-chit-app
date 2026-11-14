import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Keyboard, 
  Layers, 
  Users, 
  CreditCard, 
  FileText, 
  Compass, 
  Sparkles 
} from 'lucide-react';
import { 
  KEYBOARD_SHORTCUTS, 
  isMacPlatform 
} from '../../utils/keyboardShortcuts';

interface ShortcutGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutGuideModal: React.FC<ShortcutGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const isMac = isMacPlatform();

  const categories: { id: string; label: string; icon: any }[] = [
    { id: 'ALL', label: 'All Shortcuts', icon: Keyboard },
    { id: 'Group Management', label: 'Group Management', icon: Layers },
    { id: 'Customer Management', label: 'Customer Management', icon: Users },
    { id: 'Payments', label: 'Payments', icon: CreditCard },
    { id: 'Overdue & Reports', label: 'Overdue & Reports', icon: FileText },
    { id: 'Navigation & Forms', label: 'Navigation & Forms', icon: Compass }
  ];

  const filteredShortcuts = useMemo(() => {
    return KEYBOARD_SHORTCUTS.filter(s => {
      const matchesCategory = activeCategory === 'ALL' || s.category === activeCategory;
      const matchesQuery = 
        !searchQuery.trim() || 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.keys.join(' ').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-[#102B63] to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-white">Keyboard Shortcut Reference</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 uppercase tracking-wider">
                  Quick Guide
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Operate Jenista Chits at lightning speed with native keyboard shortcuts
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            title="Close (Escape)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter shortcuts (e.g. payment, group)..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 font-medium"
              autoFocus
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0 scrollbar-none">
            {categories.map(c => {
              const Icon = c.icon;
              const isActive = activeCategory === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCategory(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    isActive 
                      ? 'bg-[#102B63] text-white shadow-2xs' 
                      : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Shortcuts Content List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 scrollbar-thin scrollbar-thumb-slate-200">
          {filteredShortcuts.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Sparkles className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No shortcuts matching "{searchQuery}"</p>
              <p className="text-xs text-slate-400 mt-1">Try searching for generic terms like group, report, or member.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredShortcuts.map((shortcut) => {
                const displayKeys = (isMac && shortcut.macKeys) ? shortcut.macKeys : shortcut.keys;
                return (
                  <div 
                    key={shortcut.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-amber-300/80 hover:bg-amber-50/20 transition-all flex items-start justify-between gap-3 shadow-2xs group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#102B63]">
                          {shortcut.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {shortcut.description}
                      </p>
                      <span className="inline-block mt-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        {shortcut.category}
                      </span>
                    </div>

                    {/* Keyboard Key Badges */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {displayKeys.map((k, idx) => (
                        <React.Fragment key={idx}>
                          <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-[11px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-md shadow-2xs">
                            {k}
                          </kbd>
                          {idx < displayKeys.length - 1 && (
                            <span className="text-[10px] text-slate-400 font-bold">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Shortcuts reference stored in <code className="font-mono text-[11px] bg-slate-200 px-1 py-0.5 rounded text-slate-800">src/utils/keyboardShortcuts.ts</code></span>
          </div>
          <div className="flex items-center gap-3">
            <span>Press <kbd className="font-mono font-bold bg-white border border-slate-300 px-1.5 py-0.5 rounded text-[10px]">Esc</kbd> to close</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
