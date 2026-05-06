import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Info } from 'lucide-react';
import { format } from 'date-fns';
import { Holiday } from '../types';

export default function HolidaysConfig() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [isLoading, setIsLoading] = useState(false);

  const fetchHolidays = () => {
    fetch('/api/holidays')
      .then(res => res.json())
      .then(setHolidays);
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.date || !newHoliday.name) return;

    setIsLoading(true);
    const res = await fetch('/api/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newHoliday, user: 'Admin' })
    });

    if (res.ok) {
      setNewHoliday({ date: '', name: '' });
      fetchHolidays();
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this gazetted holiday?')) return;
    const res = await fetch(`/api/holidays/${id}`, { method: 'DELETE' });
    if (res.ok) fetchHolidays();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="border-l-4 border-amber-500 pl-4 py-1">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase">Gazetted Registry</h1>
        <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-wider">Node: <span className="text-amber-500 underline decoration-amber-200 underline-offset-4">Public Holidays & Mandatory Offs</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4">
          <form onSubmit={handleAdd} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Plus size={16} className="text-blue-500" />
              Add Holiday
            </h3>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Event Designation</label>
              <input 
                required
                type="text" 
                placeholder="E.g. INDEPENDENCE DAY"
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-[10px] font-bold outline-none focus:border-blue-400 transition-all uppercase placeholder:text-slate-300"
                value={newHoliday.name}
                onChange={e => setNewHoliday({...newHoliday, name: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Temporal Key</label>
              <input 
                required
                type="date" 
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-[10px] font-bold outline-none focus:border-blue-400 transition-all"
                value={newHoliday.date}
                onChange={e => setNewHoliday({...newHoliday, date: e.target.value})}
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-slate-900 text-white py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all disabled:opacity-50"
            >
              Commit to Registry
            </button>
          </form>

          <div className="mt-6 bg-blue-50/50 border border-blue-100 rounded-xl p-5 shadow-inner">
             <div className="flex gap-4">
                <Info size={18} className="text-blue-500 shrink-0" />
                <div className="space-y-2">
                   <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Protocol Insight</h4>
                   <p className="text-[9px] text-blue-700 font-bold leading-relaxed">
                     Holidays registered here will automatically be considered as <span className="underline italic">Paid Days</span> for employees with "Holiday Rule" enabled in their dossier.
                   </p>
                </div>
             </div>
          </div>
        </div>

        <div className="md:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
           <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <Calendar size={14} />
                 Active Calendrical Exceptions
              </h3>
              <span className="text-[10px] font-black text-slate-300 uppercase">{holidays.length} Entries</span>
           </div>
           <div className="divide-y divide-slate-100">
              {holidays.map(h => (
                <div key={h.id} className="group flex items-center justify-between p-4 px-6 hover:bg-slate-50 transition-colors">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded shrink-0 bg-white border border-slate-200 flex flex-col items-center justify-center p-1 shadow-sm group-hover:border-blue-200 transition-colors">
                         <span className="text-[8px] font-black text-blue-500 uppercase leading-none">{format(new Date(h.date), 'MMM')}</span>
                         <span className="text-sm font-black text-slate-800 leading-none">{format(new Date(h.date), 'dd')}</span>
                      </div>
                      <div>
                         <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{h.name}</p>
                         <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{format(new Date(h.date), 'EEEE')}</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => handleDelete(h.id)}
                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-all opacity-0 group-hover:opacity-100"
                   >
                     <Trash2 size={14} />
                   </button>
                </div>
              ))}
              {holidays.length === 0 && (
                <div className="p-12 text-center text-slate-300 font-black italic text-[10px] uppercase tracking-widest">
                   No exceptions logged in database node
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
