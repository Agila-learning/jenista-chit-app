import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AdminLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-[#f4f6fa] overflow-hidden font-sans relative">
      {/* Responsive & Non-Overlapping Deep Navy Sidebar */}
      <Sidebar 
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area - Fully Dynamic Width & No Overlap */}
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
        />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f4f6fa] h-full flex flex-col p-4 md:p-6 lg:p-8 scrollbar-thin scrollbar-thumb-slate-300">
          <div className="flex-1 max-w-[1600px] mx-auto w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

