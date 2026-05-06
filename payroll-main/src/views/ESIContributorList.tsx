import React, { useState, useEffect } from 'react';
import { ShieldCheck, Info, Search, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Employee } from '../types';
import { format, endOfMonth } from 'date-fns';

export default function ESIContributorList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [esiDays, setEsiDays] = useState<{[key: number]: number}>({});
  const [isSaving, setIsSaving] = useState(false);

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  useEffect(() => {
    fetch('/api/esi-eligible')
      .then(res => res.json())
      .then(setEmployees);
  }, []);

  useEffect(() => {
    fetch(`/api/esi-records/${month}/${year}`)
      .then(res => res.json())
      .then(data => {
        const mapping: {[key: number]: number} = {};
        data.forEach((r: any) => mapping[r.employee_id] = r.days);
        setEsiDays(mapping);
      });
  }, [month, year]);

  const handleSave = async () => {
    setIsSaving(true);
    const records = employees.map(emp => ({
      employee_id: emp.id,
      month,
      year,
      days: esiDays[emp.id] || 0
    }));

    await fetch('/api/esi-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records, user: 'Admin' })
    });
    setIsSaving(false);
  };

  const calculateDeduction = (salary: number, days: number) => {
    if (days === 0) return 0;
    const daysInMonth = parseInt(format(endOfMonth(currentDate), 'd'));
    const basis = (salary / daysInMonth) * days;
    return (basis * 0.0175) + 5;
  };

  const filtered = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.id.toString().includes(searchTerm)
  );

  const changeMonth = (offset: number) => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + offset);
    setCurrentDate(next);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div className="border-l-4 border-blue-500 pl-4 py-1">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase">ESI Contributor Registry</h1>
          <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-wider">Node: <span className="text-blue-500 underline decoration-blue-200 underline-offset-4">Social Security Compliance</span></p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden h-fit">
            <button onClick={() => changeMonth(-1)} className="p-2.5 hover:bg-slate-50 transition-colors border-r border-slate-100 text-slate-400"><ChevronLeft size={16}/></button>
            <div className="px-6 py-2 bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-600">
               {format(currentDate, 'MMMM yyyy')}
            </div>
            <button onClick={() => changeMonth(1)} className="p-2.5 hover:bg-slate-50 transition-colors border-l border-slate-100 text-slate-400"><ChevronRight size={16}/></button>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            <Save size={14} />
            <span>{isSaving ? 'Saving...' : 'Commit Days'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
             <div className="flex-1 relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={14} />
                <input 
                  type="text" 
                  placeholder="FILTER CONTRIBUTORS..." 
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-9 pr-4 py-2 text-[10px] font-bold outline-none focus:bg-white focus:border-blue-400 transition-all placeholder:text-slate-300 uppercase"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left table-fixed">
              <thead>
                <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                  <th className="px-6 py-4 w-1/3">Employee Entity</th>
                  <th className="px-6 py-4 text-center">ESI Days</th>
                  <th className="px-6 py-4 text-right">ESI Salary Basis</th>
                  <th className="px-6 py-4 text-right pr-6">ESI Deduction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-black text-[10px] uppercase">
                           {emp.name[0]}
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-800 uppercase leading-none">{emp.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold mt-1">ID: {emp.id} • {emp.employee_type.toUpperCase()}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <input 
                          type="number" 
                          step="0.5"
                          min="0"
                          max="31"
                          className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] font-black text-center focus:border-blue-400 transition-all outline-none"
                          value={esiDays[emp.id] || 0}
                          onChange={(e) => setEsiDays({...esiDays, [emp.id]: parseFloat(e.target.value) || 0})}
                       />
                    </td>
                    <td className="px-6 py-4 text-right">
                       <span className="text-[11px] font-black text-slate-700 tracking-tight">{formatCurrency(emp.esi_salary)}</span>
                    </td>
                    <td className="px-6 py-4 text-right pr-6">
                       <div className="flex flex-col items-end">
                          <span className="text-[11px] font-black text-rose-600">-{formatCurrency(calculateDeduction(emp.esi_salary, esiDays[emp.id] || 0))}</span>
                          <span className="text-[8px] text-slate-400 uppercase font-black italic">1.75% + ₹5 (PRO)</span>
                       </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                   <tr>
                      <td colSpan={4} className="py-20 text-center text-slate-300 font-black uppercase italic tracking-widest">No active ESI contributors found</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-4 space-y-6">
           <div className="bg-slate-900 rounded-xl p-6 text-white shadow-xl relative overflow-hidden">
              <ShieldCheck className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 rotate-12" />
              <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-6">Aggregate Liability</h3>
              <div className="space-y-4">
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Active Contributors</p>
                    <p className="text-3xl font-black">{filtered.length}</p>
                 </div>
                 <div className="pt-4 border-t border-white/10">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Total Employee Deduction</p>
                    <p className="text-2xl font-black text-rose-400">
                      {formatCurrency(filtered.reduce((sum, e) => sum + calculateDeduction(e.esi_salary, esiDays[e.id] || 0), 0))}
                    </p>
                 </div>
                 <div className="pt-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Employer Liability (EST.)</p>
                    <p className="text-xl font-black text-emerald-400">
                      {formatCurrency(filtered.reduce((sum, e) => {
                        const days = esiDays[e.id] || 0;
                        const daysInMonth = parseInt(format(endOfMonth(currentDate), 'd'));
                        const basis = (e.esi_salary / daysInMonth) * days;
                        return sum + (basis * 0.0325);
                      }, 0))}
                    </p>
                    <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Calculated at 3.25% basis</p>
                 </div>
              </div>
           </div>

           <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                 <Info className="text-amber-500 shrink-0" size={18} />
                 <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Rule Node Compliance</h4>
                    <p className="text-[9px] text-amber-700 font-bold leading-relaxed">
                      Employees with monthly wages up to ₹21,000 are eligible for ESI. The current system applies a custom deduction formula: <span className="italic underline">Basis * 1.75% + 5 fixed unit</span>.
                      <br/><br/>
                      Note: ESI Basis is calculated as <span className="italic">(ESI Basis Salary / Month Days) * Recorded ESI Days</span>.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
