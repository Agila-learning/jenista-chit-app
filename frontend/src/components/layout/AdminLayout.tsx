import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AdminLayout = () => {
  return (
    <div className="flex h-screen bg-[#f4f6fa] overflow-hidden font-sans relative">
      {/* Hover Mode Deep Navy Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f4f6fa] pl-[68px] transition-all duration-300">
        <Topbar />
        
        <main className="flex-1 overflow-y-auto bg-[#f4f6fa] h-full flex flex-col p-4 md:p-6 lg:p-8 scrollbar-thin scrollbar-thumb-slate-300">
          <div className="flex-1 max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
