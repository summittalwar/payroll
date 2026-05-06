import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Clock, 
  AlertCircle, 
  Banknote, 
  ArrowUpRight, 
  Calendar,
  History,
  ShieldCheck,
  Search
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';

const StatCard = ({ icon: Icon, label, value, color, delay }: { icon: any, label: string, value: string, color: string, delay: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3 group hover:border-blue-400 transition-colors"
  >
    <div className="flex justify-between items-start">
      <div className={`p-2.5 rounded-lg ${color} bg-opacity-10 text-slate-800`}>
        <Icon size={20} className="stroke-[2.5]" />
      </div>
      <div className="flex items-center gap-1 text-emerald-600 font-black text-[10px] tracking-tighter bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
        <ArrowUpRight size={12} />
        <span>4.2%</span>
      </div>
    </div>
    <div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
    </div>
  </motion.div>
);

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    pendingAdvances: 0,
    totalPayroll: 0
  });

  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        setStats(prev => ({ ...prev, totalEmployees: data.length }));
      });
    
    fetch('/api/logs')
      .then(res => res.json())
      .then(setLogs);
  }, []);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div className="border-l-4 border-blue-500 pl-4 py-1">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase">Dashboard Analytics</h1>
          <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-wider">Operational Status: <span className="text-emerald-500 italic lowercase font-medium">real-time sync active</span></p>
        </div>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-3 text-xs font-bold tracking-widest shadow-md">
          <Calendar size={14} className="text-blue-400" />
          <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Workforce" value={stats.totalEmployees.toString()} color="bg-blue-500" delay={0.1} />
        <StatCard icon={Clock} label="Daily Ops" value={`${stats.totalEmployees}/${stats.totalEmployees}`} color="bg-indigo-500" delay={0.15} />
        <StatCard icon={AlertCircle} label="Advances" value={formatCurrency(45000)} color="bg-amber-500" delay={0.2} />
        <StatCard icon={Banknote} label="Payroll Pool" value={formatCurrency(1240000)} color="bg-slate-800" delay={0.25} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    Attendance Trends
                  </h3>
                  <select className="bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase rounded p-1.5 outline-none focus:border-blue-400">
                    <option>7-Day View</option>
                    <option>30-Day View</option>
                  </select>
               </div>
               <div className="h-48 flex items-end justify-between gap-3">
                   {[40, 60, 45, 80, 55, 90, 75].map((val, i) => (
                     <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                        <div 
                          className="w-full bg-slate-100 rounded-t relative group-hover:bg-blue-600 transition-all cursor-pointer shadow-inner" 
                          style={{ height: `${val}%` }}
                        >
                           <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {val}%
                           </div>
                        </div>
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">OCT {14- (6-i)}</span>
                     </div>
                   ))}
               </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
               <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <History size={16} className="text-blue-500" />
                    Security Event Log
                  </h3>
                  <span className="text-[10px] font-bold text-blue-600 cursor-pointer hover:underline">VIEW FULL SCAN</span>
               </div>
                <div className="divide-y divide-slate-100">
                   {logs.slice(0, 5).map((log, i) => (
                     <div key={i} className="flex items-center justify-between p-4 px-6 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                           <div className={cn(
                             "w-8 h-8 rounded flex items-center justify-center font-black text-xs border uppercase",
                             log.changed_by === 'Admin' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-400 border-slate-200"
                           )}>
                             {log.changed_by ? log.changed_by[0] : '?'}
                           </div>
                           <div>
                             <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-tight">{log.action || log.module}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Record: <span className="font-mono text-blue-500 tracking-normal">{log.record_id}</span></p>
                           </div>
                        </div>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                     </div>
                   ))}
                   {logs.length === 0 && <div className="p-8 text-center text-slate-300 font-black italic text-[10px] uppercase">No events logged</div>}
                </div>
            </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
           <div className="bg-indigo-premium p-6 rounded-xl shadow-lg relative overflow-hidden text-white flex flex-col justify-between h-48 border border-white/10">
              <div className="relative z-10">
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1 opacity-70">Current Batch</p>
                <h3 className="text-xl font-black tracking-tight">OCTOBER FINAL RUN</h3>
                
                <div className="mt-4 space-y-2">
                   <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-indigo-400">Lock Status</span>
                      <span className="text-amber-400">77% COMPLETED</span>
                   </div>
                   <div className="w-full bg-white/5 h-2 rounded overflow-hidden border border-white/5 shadow-inner">
                      <div className="bg-blue-400 h-full w-[77%]" />
                   </div>
                </div>
              </div>
              <button className="relative z-10 w-full mt-4 bg-white text-indigo-900 font-black text-[10px] uppercase py-2.5 rounded shadow-xl tracking-widest hover:bg-blue-50 transition-colors">
                 Synchronize & Lock
              </button>
              <div className="absolute -right-6 -bottom-6 text-white/5">
                 <ShieldCheck size={140} />
              </div>
           </div>

           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">Employee Quick Query</h3>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={14} />
                <input 
                  type="text" 
                  placeholder="UID OR NAME..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded px-9 py-2.5 text-[10px] font-bold focus:bg-white focus:ring-1 focus:ring-blue-400 outline-none transition-all placeholder:text-slate-300 uppercase"
                />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
