import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { QuickActionsModal } from '../common/QuickActionsModal';
import { ShortcutGuideModal } from '../common/ShortcutGuideModal';
import { useGlobalShortcuts } from '../../hooks/useGlobalShortcuts';
import { useSmartEnterNavigation } from '../../utils/smartEnter';

export const AdminLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Keyboard Shortcuts & Quick Actions Modals State
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isShortcutGuideOpen, setIsShortcutGuideOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Enable Smart Enter navigation globally across all form inputs and modals
  useSmartEnterNavigation(true);

  // Enable Global Keyboard Shortcuts (Alt+G, Alt+C, Alt+M, Alt+P, Alt+O, Alt+T, Alt+R, Ctrl+K, Ctrl+S, Esc, Shift+?)
  useGlobalShortcuts({
    onOpenQuickActions: () => {
      setIsShortcutGuideOpen(false);
      setIsQuickActionsOpen(prev => !prev);
    },
    onOpenShortcutGuide: () => {
      setIsQuickActionsOpen(false);
      setIsShortcutGuideOpen(prev => !prev);
    },
    onCloseModals: () => {
      setIsQuickActionsOpen(false);
      setIsShortcutGuideOpen(false);
    }
  });

  return (
    <div className="flex h-screen bg-[#f4f6fa] overflow-hidden font-sans relative">
      {/* Responsive & Non-Overlapping Deep Navy Sidebar */}
      <Sidebar 
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f4f6fa] transition-all duration-300">
        <Topbar 
          onMenuClick={() => {
            if (window.innerWidth < 1024) {
              setIsMobileOpen(!isMobileOpen);
            } else {
              toggleSidebar();
            }
          }}
          isSidebarOpen={!isSidebarCollapsed}
          onOpenQuickActions={() => setIsQuickActionsOpen(true)}
          onOpenShortcutGuide={() => setIsShortcutGuideOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f4f6fa] h-full flex flex-col p-4 md:p-6 lg:p-8 scrollbar-thin scrollbar-thumb-slate-300">
          <div className="flex-1 max-w-[1600px] mx-auto w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Quick Actions Palette (Ctrl + K) */}
      <QuickActionsModal
        isOpen={isQuickActionsOpen}
        onClose={() => setIsQuickActionsOpen(false)}
        onOpenShortcutGuide={() => {
          setIsQuickActionsOpen(false);
          setIsShortcutGuideOpen(true);
        }}
      />

      {/* Global Shortcut Guide Modal (Shift + ?) */}
      <ShortcutGuideModal
        isOpen={isShortcutGuideOpen}
        onClose={() => setIsShortcutGuideOpen(false)}
      />
    </div>
  );
};
