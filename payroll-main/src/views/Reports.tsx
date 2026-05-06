import React, { useState, useEffect } from 'react';
import { 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Activity,
  Search
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';

export default function Reports() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch(`/api/payroll-batch/${month}/${year}`)
      .then(res => res.json())
      .then(resData => {
        if (isMounted) {
          setData(resData);
          setLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [month, year]);

  const changeMonth = (offset: number) => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + offset);
    setCurrentDate(next);
  };

  const filtered = data.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div className="border-l-4 border-blue-500 pl-4 py-1">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase">Settlement Master Report</h1>
          <p className="text-slate-400 text-[10px] font-bold mt-2 uppercase tracking-widest flex items-center gap-2">
            <Activity size={12} className="text-blue-500" />
            Central Data Ledger Node: Verified Results Only
          </p>
        </div>
        <div className="flex gap-4">
           <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden h-fit">
             <button onClick={() => changeMonth(-1)} className="p-2.5 hover:bg-slate-50 transition-colors border-r border-slate-100 text-slate-400"><ChevronLeft size={16}/></button>
             <div className="px-6 py-2 bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-600 min-w-[140px] text-center">
                {format(currentDate, 'MMMM yyyy')}
             </div>
             <button onClick={() => changeMonth(1)} className="p-2.5 hover:bg-slate-50 transition-colors border-l border-slate-100 text-slate-400"><ChevronRight size={16}/></button>
           </div>
           <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">
             <Download size={14} /> Export Dataset
           </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
         <div className="p-4 border-b border-slate-100 flex items-center gap-4">
            <div className="flex-1 relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
               <input 
                 type="text" 
                 placeholder="SEARCH MASTER LEDGER..." 
                 className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-10 pr-4 py-2.5 text-[10px] font-bold outline-none focus:bg-white focus:border-blue-400 transition-all uppercase"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-[9px] uppercase font-bold tracking-tight text-slate-600">
               <thead>
                  <tr className="bg-slate-50 text-slate-400 font-black tracking-widest border-b border-slate-100">
                     <th className="px-6 py-4 text-left">Employee Name</th>
                     <th className="px-6 py-4 text-center">Working Breakdown (P/OT/S/H)</th>
                     <th className="px-6 py-4 text-center">ESI Days</th>
                     <th className="px-6 py-4 text-right">Adv Deduction</th>
                     <th className="px-6 py-4 text-right">ESI Deduction</th>
                     <th className="px-6 py-4 text-right">Net Payable</th>
                     <th className="px-6 py-4 text-center pr-6">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={10} className="py-20 text-center text-slate-300 animate-pulse font-black italic tracking-widest text-[10px]">Compiling Dataset...</td></tr>
                  ) : filtered.map(item => (
                    <tr key={item.employeeId} className="group hover:bg-blue-50/30 transition-colors">
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center font-black text-slate-400 border border-slate-200 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all uppercase">
                                {item.name[0]}
                             </div>
                             <div>
                                <p className="text-slate-800 font-black leading-none">{item.name}</p>
                                <p className="text-[8px] opacity-60 mt-1 uppercase">ID: {item.employeeId} • {item.group_name || 'NO GRP'}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                             <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded" title="Present">{item.presentDays}</span>
                             <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded" title="OT">{item.otDays}</span>
                             <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded" title="Sundays">{item.paidSundays}</span>
                             <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded" title="Holidays">{item.holidayDays}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4 text-center font-black text-slate-400">
                          {item.esiDays || 0}
                       </td>
                       <td className="px-6 py-4 text-right font-black text-rose-500">
                          -{formatCurrency(item.totalAdvances)}
                       </td>
                       <td className="px-6 py-4 text-right font-black text-rose-400">
                          -{formatCurrency(item.esiDeduction)}
                       </td>
                       <td className="px-6 py-4 text-right pr-4">
                          <span className="text-xs font-black text-slate-900 tracking-tighter decoration-blue-500 underline decoration-2 underline-offset-4">{formatCurrency(item.payableSalary)}</span>
                       </td>
                       <td className="px-6 py-4 text-center pr-6">
                          {item.isPaid ? (
                            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[8px] font-black tracking-widest border border-emerald-200">DISBURSED</span>
                          ) : (
                            <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-[8px] font-black tracking-widest border border-slate-200">PENDING</span>
                          )}
                       </td>
                    </tr>
                  ))}
                  {!loading && filtered.length === 0 && (
                     <tr><td colSpan={10} className="py-20 text-center text-slate-300 font-black italic tracking-widest text-[10px]">No records found for this period</td></tr>
                  )}
               </tbody>
            </table>
         </div>
         <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center text-[10px] font-black uppercase tracking-tight text-slate-500">
            <div>Result Count: {filtered.length} Employees</div>
            <div className="flex gap-8">
               <div className="flex gap-2 items-center">
                  <span className="text-slate-400">Total Net Liability:</span>
                  <span className="text-slate-900 text-xs">{formatCurrency(filtered.reduce((sum, e) => sum + e.payableSalary, 0))}</span>
               </div>
               <div className="flex gap-2 items-center">
                  <span className="text-rose-400">Total Recovery:</span>
                  <span className="text-rose-600 text-xs">{formatCurrency(filtered.reduce((sum, e) => sum + e.totalAdvances + e.esiDeduction, 0))}</span>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
