import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  CalendarCheck, 
  FileText, 
  Settings, 
  LogOut,
  Gift,
  Coins
} from 'lucide-react';
import Dashboard from './views/Dashboard';
import EmployeeList from './views/EmployeeList';
import DailyAttendance from './views/DailyAttendance';
import EmployeeProfile from './views/EmployeeProfile';
import Reports from './views/Reports';
import ESIContributorList from './views/ESIContributorList';
import HolidaysConfig from './views/HolidaysConfig';
import GroupsConfig from './views/GroupsConfig';
import BonusManagement from './views/BonusManagement';
import { cn } from './lib/utils';

const SidebarItem = ({ to, icon: Icon, active }: { to: string, icon: React.ComponentType<any>, active?: boolean }) => (
  <Link 
    to={to} 
    className={cn(
      "p-2.5 rounded-lg transition-all group relative",
      active ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
    )}
  >
    <Icon size={22} strokeWidth={2} />
    {active && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-l-full" />}
  </Link>
);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  
  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Top Navigation Bar */}
      <nav className="h-14 bg-slate-900 text-white flex items-center justify-between px-6 shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-10">
          <span className="text-xl font-bold tracking-tight text-blue-400">
            PAYROLL<span className="text-white">PRO</span>
          </span>
          <div className="hidden md:flex gap-6 text-xs font-bold uppercase tracking-widest text-slate-400">
            <Link to="/" className={cn("hover:text-white transition-colors", location.pathname === '/' && "text-white")}>Dashboard</Link>
            <Link to="/employees" className={cn("hover:text-white transition-colors", location.pathname.startsWith('/employees') && "text-white border-b-2 border-blue-400 pb-1")}>Employees</Link>
            <Link to="/attendance" className={cn("hover:text-white transition-colors", location.pathname === '/attendance' && "text-white")}>Attendance</Link>
            <Link to="/groups" className={cn("hover:text-white transition-colors", location.pathname === '/groups' && "text-white")}>Groups</Link>
            <Link to="/esi" className={cn("hover:text-white transition-colors", location.pathname === '/esi' && "text-white")}>ESI Registry</Link>
            <Link to="/holidays" className={cn("hover:text-white transition-colors", location.pathname === '/holidays' && "text-white")}>Holidays</Link>
            <Link to="/bonus" className={cn("hover:text-white transition-colors", location.pathname === '/bonus' && "text-white")}>Bonus</Link>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex flex-col items-end leading-tight">
            <span className="font-bold text-xs uppercase tracking-tight text-white">Admin User</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">System Controller</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-black text-sm shadow-inner">AD</div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Compact Sidebar Rail */}
        <aside className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-8 shrink-0 shadow-sm z-0">
          <SidebarItem to="/" icon={BarChart3} active={location.pathname === '/'} />
          <SidebarItem to="/employees" icon={Users} active={location.pathname.startsWith('/employees')} />
          <SidebarItem to="/attendance" icon={CalendarCheck} active={location.pathname === '/attendance'} />
          <SidebarItem to="/reports" icon={FileText} active={location.pathname === '/reports'} />
          <SidebarItem to="/bonus" icon={Gift} active={location.pathname === '/bonus'} />
          <SidebarItem to="/groups" icon={Coins} active={location.pathname === '/groups'} />
          
          <div className="mt-auto p-4 border-t border-slate-100 flex flex-col items-center gap-6">
            <Settings size={20} className="text-slate-300 hover:text-slate-600 cursor-pointer transition-colors" />
            <LogOut size={20} className="text-slate-300 hover:text-red-600 cursor-pointer transition-colors" />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            {children}
          </div>
          
          {/* Footer Status Bar */}
          <footer className="h-8 bg-white border-t border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
            <div className="flex gap-4 text-[10px] text-slate-500 font-bold tracking-tight">
              <span className="flex items-center gap-1.5">SERVER: <span className="text-emerald-600 font-black italic">RUNNING</span></span>
              <span className="flex items-center gap-1.5">DB: <span className="text-blue-600 font-black">SECURE</span></span>
              <span className="flex items-center gap-1.5">AUDIT: <span className="text-emerald-600">ACTIVE</span></span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono italic">
              V.1.0.4 PRO-BUILD
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/employees" element={<EmployeeList />} />
          <Route path="/employees/:id" element={<EmployeeProfile />} />
          <Route path="/attendance" element={<DailyAttendance />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/esi" element={<ESIContributorList />} />
          <Route path="/holidays" element={<HolidaysConfig />} />
          <Route path="/groups" element={<GroupsConfig />} />
          <Route path="/bonus" element={<BonusManagement />} />
        </Routes>
      </Layout>
    </Router>
  );
}
