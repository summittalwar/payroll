import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Download, 
  UserPlus, 
  ArrowRight
} from 'lucide-react';
import { Employee } from '../types';
import { formatCurrency, cn } from '../lib/utils';

export default function EmployeeList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const [newEmp, setNewEmp] = useState({
    name: '',
    doj: new Date().toISOString().split('T')[0],
    monthly_salary: 15000,
    employee_type: 'Worker',
    shift_type: 'Day',
    weekly_off: 0,
    group_id: '',
    esi_enabled: false,
    esi_salary: 0
  });

  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(setEmployees);
    fetch('/api/groups')
      .then(res => res.json())
      .then(setGroups);
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEmp)
    });
    if (res.ok) {
      const added = await res.json();
      setEmployees([...employees, { id: added.id, ...newEmp } as any]);
      setIsAdding(false);
    }
  };

  const filtered = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.id.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div className="border-l-4 border-blue-500 pl-4 py-1">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase">Personnel Registry</h1>
          <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-wider">Active Directory: <span className="text-blue-500 underline decoration-blue-200 underline-offset-4">{filtered.length} Entities found</span></p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-black transition-all active:scale-95"
          >
            <UserPlus size={14} />
            <span>Onboard New Hire</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
        <div className="flex-1 relative group max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={14} />
          <input 
            type="text" 
            placeholder="GLOBAL SEARCH (NAME / ID)..." 
            className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-9 pr-4 py-2.5 text-[10px] font-bold outline-none focus:bg-white focus:border-blue-400 transition-all placeholder:text-slate-300 uppercase"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="p-2.5 bg-slate-100 text-slate-400 rounded-lg hover:text-slate-600 transition-colors border border-slate-200">
            <Filter size={18} />
          </button>
          <button className="p-2.5 bg-slate-100 text-slate-400 rounded-lg hover:text-slate-600 transition-colors border border-slate-200">
            <Download size={18} />
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Registration Registry</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Onboard a new entity to the system node.</p>
            </div>
            <form onSubmit={handleAdd} className="p-8 grid grid-cols-2 gap-6">
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Full Legal Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 text-[10px] font-bold focus:ring-1 focus:ring-blue-400 outline-none transition-all placeholder:text-slate-300 uppercase"
                  value={newEmp.name}
                  onChange={e => setNewEmp({...newEmp, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Joining Date</label>
                <input 
                  required
                  type="date" 
                  className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-[10px] font-bold focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                  value={newEmp.doj}
                  onChange={e => setNewEmp({...newEmp, doj: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Base Monthly Payout</label>
                <input 
                  required
                  type="number" 
                  className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-[10px] font-bold focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                  value={newEmp.monthly_salary}
                  onChange={e => setNewEmp({...newEmp, monthly_salary: parseInt(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Classification</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-400"
                  value={newEmp.employee_type}
                  onChange={e => setNewEmp({...newEmp, employee_type: e.target.value})}
                >
                  <option>Worker</option>
                  <option>Staff</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Organizational Group</label>
                <select 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-400"
                  value={newEmp.group_id}
                  onChange={e => setNewEmp({...newEmp, group_id: e.target.value})}
                >
                  <option value="">Select Group...</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Shift Protocol</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-400"
                  value={newEmp.shift_type}
                  onChange={e => setNewEmp({...newEmp, shift_type: e.target.value as any})}
                >
                  <option>Day</option>
                  <option>Night</option>
                  <option>Rotational</option>
                </select>
              </div>
              <div className="col-span-2 flex gap-6 py-4 border-y border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={newEmp.esi_enabled} onChange={e => setNewEmp({...newEmp, esi_enabled: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-blue-600 transition-colors">ESI ACTIVE</span>
                </label>
                <div className="flex-1 text-right">
                   <p className="text-[8px] font-bold text-slate-400 uppercase">Assignment to a group automates Sunday/Holiday rules</p>
                </div>
              </div>
              {newEmp.esi_enabled && (
                <div className="space-y-2 col-span-2 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">ESI Contribution Salary Basis</label>
                  <input 
                    required={newEmp.esi_enabled}
                    type="number" 
                    className="w-full bg-white border border-blue-200 rounded px-4 py-2 text-[10px] font-bold focus:ring-1 focus:ring-blue-400 outline-none transition-all placeholder:text-slate-300"
                    placeholder="Enter salary component for ESI calculation..."
                    value={newEmp.esi_salary}
                    onChange={e => setNewEmp({...newEmp, esi_salary: parseInt(e.target.value)})}
                  />
                  <p className="text-[8px] font-bold text-blue-400 uppercase mt-1">Formula: (ESI Salary * 1.75%) + ₹5 deduction</p>
                </div>
              )}
              <div className="col-span-2 flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 px-8 py-3 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded hover:bg-slate-200 transition-all border border-slate-200"
                >
                  Terminate Action
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-8 py-3 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded hover:bg-blue-700 transition-all shadow-xl active:scale-95"
                >
                  Commit Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left table-fixed">
          <thead>
            <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <th className="px-6 py-4 w-1/3">Identity & Role</th>
              <th className="px-6 py-4">Status / Shift</th>
              <th className="px-6 py-4 text-right">Settlement Base</th>
              <th className="px-6 py-4 text-center">Lifecycle</th>
              <th className="px-6 py-4 text-right pr-6">Dossier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((emp) => (
              <tr key={emp.id} className="group hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold overflow-hidden shadow-inner uppercase shrink-0">
                       {emp.name ? emp.name[0] : '?'}
                    </div>
                    <div>
                      <Link to={`/employees/${emp.id}`} className="block text-xs font-black text-slate-800 hover:text-blue-600 transition-colors uppercase tracking-tight">
                        {emp.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-[9px] font-black text-slate-400 uppercase">#{emp.id}</span>
                         <span className="w-1 h-1 bg-slate-300 rounded-full" />
                         <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{emp.employee_type}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-600 flex items-center gap-2 uppercase">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> {emp.shift_type}
                      </span>
                      <span className="text-[9px] text-indigo-500 font-black uppercase tracking-widest italic ml-3.5">GRP: {emp.group_name || 'UNASSIGNED'}</span>
                   </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-xs font-black text-slate-900 tracking-tight underline decoration-blue-200 underline-offset-4">{formatCurrency(emp.monthly_salary)}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border",
                    emp.status === 'Active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                  )}>
                    <div className={cn("w-1 h-1 rounded-full", emp.status === 'Active' ? "bg-emerald-500" : "bg-rose-500")} />
                    {emp.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right pr-6">
                   <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link to={`/employees/${emp.id}`} title="View Dossier" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all">
                        <ArrowRight size={14} />
                      </Link>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
