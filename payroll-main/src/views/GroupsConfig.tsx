import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Shield, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export default function GroupsConfig() {
  const [groups, setGroups] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [calcType, setCalcType] = useState('Standard');
  const [sunRule, setSunRule] = useState('Earned');
  const [holRule, setHolRule] = useState('Pay');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/groups').then(res => res.json()).then(setGroups);
  }, []);

  const handleCreate = async () => {
    if (!name) return;
    setIsSaving(true);
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, calculation_type: calcType, sunday_rule: sunRule, holiday_rule: holRule, user: 'Admin' })
    });
    if (res.ok) {
      setName('');
      fetch('/api/groups').then(res => res.json()).then(setGroups);
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure? This might affect employees in this group.')) return;
    await fetch(`/api/groups/${id}`, { method: 'DELETE' });
    setGroups(groups.filter(g => g.id !== id));
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="border-l-4 border-indigo-500 pl-4 py-1">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase">Organizational Clusters</h1>
        <p className="text-slate-400 text-[10px] font-bold mt-2 uppercase tracking-widest flex items-center gap-2">
          <Shield size={12} className="text-indigo-500" />
          Rule Definition Node: Configure Payout Protocols
        </p>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-4">
           <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm sticky top-6">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <Plus size={14} className="text-indigo-500" />
                Initialize New Group
              </h2>
              <div className="space-y-5">
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Group Label</label>
                    <input 
                      type="text" 
                      placeholder="e.g. SECURITY DEPT, CONTRACTORS..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all uppercase"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Salary Calculation Logic</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all"
                      value={calcType}
                      onChange={(e) => setCalcType(e.target.value)}
                    >
                       <option value="Standard">STANDARD (PER-UNIT/ATTENDANCE)</option>
                       <option value="Fixed">FIXED (FULL MONTHLY/CONTRACTOR)</option>
                    </select>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sunday Payment Rule</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all"
                      value={sunRule}
                      onChange={(e) => setSunRule(e.target.value)}
                    >
                       <option value="Earned">EARNED (3+ WORKING DAYS/WEEK)</option>
                       <option value="Fixed">FIXED (ALWAYS PAY SUNDAYS)</option>
                       <option value="None">NONE (NO SUNDAY PAY)</option>
                    </select>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Holiday Entitlement</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all"
                      value={holRule}
                      onChange={(e) => setHolRule(e.target.value)}
                    >
                       <option value="Pay">PAY ON GAZETTED HOLIDAYS</option>
                       <option value="NoPay">DEDUCT ON HOLIDAYS</option>
                    </select>
                 </div>

                 <button 
                  onClick={handleCreate}
                  disabled={isSaving}
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                 >
                    Provision Group
                 </button>
              </div>

              <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                 <div className="flex gap-3">
                    <Info size={14} className="text-amber-500 shrink-0" />
                    <p className="text-[9px] text-amber-700 font-bold leading-relaxed uppercase">
                       Rule nodes are immutable once assigned to a payroll cycle. Changes will reflect in subsequent ledger generations.
                    </p>
                 </div>
              </div>
           </div>
        </div>

        <div className="col-span-8">
           <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                       <th className="px-6 py-4">Defined Cluster</th>
                       <th className="px-6 py-4">Calc Logic</th>
                       <th className="px-6 py-4">Sunday Rule</th>
                       <th className="px-6 py-4">Holiday</th>
                       <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {groups.map(g => (
                       <tr key={g.id} className="group hover:bg-indigo-50/30 transition-colors">
                          <td className="px-6 py-5">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                   <Users size={16} />
                                </div>
                                <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{g.name}</span>
                             </div>
                          </td>
                          <td className="px-6 py-5">
                             <span className={cn("px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase", g.calculation_type === 'Fixed' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>
                                {g.calculation_type}
                             </span>
                          </td>
                          <td className="px-6 py-5">
                             <span className="text-[10px] font-bold text-slate-500 uppercase">{g.sunday_rule}</span>
                          </td>
                          <td className="px-6 py-5">
                             <span className="text-[10px] font-bold text-slate-500 uppercase">{g.holiday_rule}</span>
                          </td>
                          <td className="px-6 py-5 text-center">
                             <button 
                                onClick={() => handleDelete(g.id)}
                                className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                             >
                                <Trash2 size={16} />
                             </button>
                          </td>
                       </tr>
                    ))}
                    {groups.length === 0 && (
                       <tr>
                          <td colSpan={5} className="py-20 text-center text-slate-300 font-black italic uppercase tracking-widest">No rule nodes registered in the cluster</td>
                       </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
}
