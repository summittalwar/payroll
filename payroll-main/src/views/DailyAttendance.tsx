import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Sun, 
  Moon, 
  CheckCircle2, 
  Save, 
  LayoutGrid, 
  List,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Employee, AttendanceRecord } from '../types';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';

type AttendanceState = {
  [empId: number]: {
    [shift: string]: {
      status: string;
      overtime: string;
      is_late: number;
      unsaved?: boolean;
    }
  }
};

export default function DailyAttendance() {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceState>({});
  const [monthlyAttendance, setMonthlyAttendance] = useState<any[]>([]);
  const [isFinalized, setIsFinalized] = useState(false);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  useEffect(() => {
    fetch('/api/holidays')
      .then(res => res.json())
      .then(setHolidays);
  }, []);

  const loadMonthlyAttendance = useCallback(() => {
    const month = format(currentMonth, 'M');
    const year = format(currentMonth, 'yyyy');
    fetch(`/api/attendance/monthly/${month}/${year}`)
      .then(res => res.json())
      .then(setMonthlyAttendance);
  }, [currentMonth]);

  const loadAttendance = useCallback((date: string) => {
    fetch(`/api/attendance/${date}`)
      .then(res => res.json())
      .then(data => {
        const state: AttendanceState = {};
        data.forEach((rec: AttendanceRecord) => {
          if (!state[rec.employee_id]) state[rec.employee_id] = {};
          state[rec.employee_id][rec.shift] = {
            status: rec.status,
            overtime: rec.overtime,
            is_late: rec.is_late
          };
        });
        setAttendance(state);
        setIsFinalized(data.some((r: any) => r.locked));
      });
  }, []);

  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        setEmployees(data);
        if (viewMode === 'daily') {
          loadAttendance(selectedDate);
        } else {
          loadMonthlyAttendance();
        }
      });
  }, [selectedDate, viewMode, loadAttendance, loadMonthlyAttendance]);

  const handleEditToggle = () => {
    if (isEditMode) {
      setIsEditMode(false);
    } else {
      setShowPasswordPrompt(true);
    }
  };

  const verifyPassword = () => {
    if (password === 'admin123') { // Simple password for now
      setIsEditMode(true);
      setShowPasswordPrompt(false);
      setPassword('');
    } else {
      alert('Incorrect Password');
    }
  };

  const updateMonthlyCell = async (empId: number, date: string, shift: string, value: string) => {
    const v = value.toUpperCase();
    if (!['P', 'HD', 'OT', 'A', ''].includes(v)) return;
    
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const finalStatus = v === 'P' || v === 'OT' ? 'Present' : (v === 'HD' ? 'HalfDay' : (v === 'A' ? 'Absent' : 'Absent'));
    let finalOvertime = v === 'OT' ? 'Full' : 'None';

    // Rule: Sunday/Holiday work is automatically OT if applicable to group
    const isSunday = format(parseISO(date), 'E') === 'Sun';
    const isHoliday = holidays.some(h => h.date === date);

    if (v === 'P') {
      const applySunRule = isSunday && emp.sunday_rule !== 'None';
      const applyHolRule = isHoliday && emp.holiday_rule !== 'NoPay';

      if (applySunRule || applyHolRule) {
        finalOvertime = 'Full';
      } else {
        // Mutual exclusion: If already present in the other shift, this one becomes OT
        const otherShift = shift === 'Day' ? 'Night' : 'Day';
        const otherRec = monthlyAttendance.find(a => a.employee_id === empId && a.date === date && a.shift === otherShift);
        const otherIsPresent = otherRec && (
          otherRec.status === 'Present' || 
          otherRec.status === 'P' || 
          otherRec.overtime === 'Full' || 
          otherRec.status === 'OT'
        );
        
        if (otherIsPresent) {
          finalOvertime = 'Full';
        }
      }
    }

    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: empId,
          date,
          shift,
          status: finalStatus,
          overtime: finalOvertime,
          is_late: 0,
          user: 'Admin'
        })
      });
      loadMonthlyAttendance();
    } catch (error) {
      console.error(error);
    }
  };

  const updateAttendance = (empId: number, shift: string, field: string, value: any) => {
    if (isFinalized) return;

    setAttendance(prev => {
      const currentVal = prev[empId]?.[shift]?.[field];
      const finalValue = (field === 'status' && currentVal === value) ? 'Absent' : value;

      return {
        ...prev,
        [empId]: {
          ...(prev[empId] || {}),
          [shift]: {
            ...(prev[empId]?.[shift] || { status: 'Absent', overtime: 'None', is_late: 0 }),
            [field]: finalValue,
            unsaved: true
          }
        }
      };
    });
  };

  const handleSave = async () => {
    const records = [];
    for (const empId in attendance) {
      for (const shift in attendance[empId]) {
        if (attendance[empId][shift].unsaved) {
          records.push({
            employee_id: parseInt(empId),
            date: selectedDate,
            shift,
            ...attendance[empId][shift]
          });
        }
      }
    }

    if (records.length === 0) return;

    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records, user: 'Admin' })
    });
    loadAttendance(selectedDate);
  };

  const markAllPresent = () => {
    if (isFinalized) return;
    const newState = { ...attendance };
    employees.forEach(emp => {
      if (!newState[emp.id]) newState[emp.id] = {};
      // By default mark Day shift as Present
      newState[emp.id]['Day'] = {
        status: 'Present',
        overtime: 'None',
        is_late: 0,
        unsaved: true
      };
    });
    setAttendance(newState);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'p':
      case 'present': return 'bg-emerald-500 text-white border-emerald-600';
      case 'hd':
      case 'halfday': return 'bg-lime-400 text-slate-900 border-lime-500';
      case 'ot': return 'bg-amber-400 text-slate-900 border-amber-500';
      case 'a':
      case 'absent': return 'bg-rose-50 text-rose-400 border-rose-100';
      default: return 'bg-white text-slate-300 border-slate-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'p': return 'P';
      case 'hd': return 'HD';
      case 'ot': return 'OT';
      case 'a': return 'A';
      default: return '';
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header Container */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="border-l-4 border-blue-500 pl-4 py-1">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase">Registry Terminal</h1>
            <div className="flex gap-4 mt-2">
              <button 
                onClick={() => setViewMode('daily')}
                className={cn("flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'daily' ? "text-blue-600" : "text-slate-400 hover:text-slate-600")}
              >
                <List size={14} /> Daily Entry
              </button>
              <button 
                onClick={() => setViewMode('monthly')}
                className={cn("flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'monthly' ? "text-blue-600" : "text-slate-400 hover:text-slate-600")}
              >
                <LayoutGrid size={14} /> Monthly View
              </button>
            </div>
          </div>

          <div className="flex items-center bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 gap-3">
            <div className="flex items-center gap-2 px-3 border-r border-slate-100">
              <Calendar size={14} className="text-slate-400" />
              <input 
                type="date" 
                className="bg-transparent text-[10px] font-black uppercase outline-none w-28" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
              />
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={markAllPresent}
                disabled={isFinalized}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                <CheckCircle2 size={14} /> Mark All Present
              </button>
              <button 
                onClick={handleSave}
                disabled={isFinalized}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200 disabled:opacity-50"
              >
                <Save size={14} /> Save Changes
              </button>
              <button 
                onClick={() => setIsFinalized(!isFinalized)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  isFinalized ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-slate-950 text-white hover:bg-black"
                )}
              >
                {isFinalized ? <Unlock size={14} /> : <Lock size={14} />}
                {isFinalized ? "Unlock" : "Finalize"}
              </button>
            </div>
          </div>
        </div>

        {holidays.find(h => h.date === selectedDate) && (
          <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-center gap-4 text-amber-800 shadow-sm animate-in zoom-in duration-300">
             <div className="w-10 h-10 rounded-lg bg-amber-400 flex flex-col items-center justify-center text-white shrink-0 shadow-md">
                <span className="text-[10px] font-black uppercase leading-none">{format(new Date(selectedDate), 'MMM')}</span>
                <span className="text-sm font-black leading-none">{format(new Date(selectedDate), 'dd')}</span>
             </div>
             <div>
                <h3 className="text-xs font-black uppercase tracking-tight leading-none">Gazetted Holiday: {holidays.find(h => h.date === selectedDate).name}</h3>
                <p className="text-[9px] font-bold text-amber-600 mt-1 uppercase tracking-widest">Mandatory Paid Leave Protocol Active</p>
             </div>
          </div>
        )}

        {isFinalized && (
           <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-center gap-4 text-amber-800 shadow-inner">
              <ShieldCheck size={18} className="text-amber-500 shrink-0" />
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest">Period Locked</p>
                 <p className="text-[9px] font-medium opacity-80 uppercase tracking-tight">Manual entry disabled. Audit trail enabled for current sequence.</p>
              </div>
           </div>
        )}
      </div>

      {viewMode === 'daily' ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left table-fixed">
            <thead>
              <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                <th className="px-6 py-4 w-1/4">Employee Entity</th>
                <th className="px-6 py-4 w-24 text-center">Shift</th>
                <th className="px-6 py-4 w-40">Status Action</th>
                <th className="px-6 py-4 w-24 text-center">Late</th>
                <th className="px-6 py-4 w-16 text-center">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => (
                <React.Fragment key={emp.id}>
                  {/* Day Shift Row */}
                  <tr className="bg-blue-50/10 group transition-colors hover:bg-blue-50/30">
                    <td className="px-6 py-3" rowSpan={2}>
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center font-black text-[10px] text-slate-400 border border-slate-200 uppercase">
                            {emp.name ? emp.name[0] : '?'}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight leading-none">{emp.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">ID: {emp.id} • {emp.employee_type}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-3 text-center border-r border-slate-50">
                       <Sun size={14} className="inline text-amber-500" />
                       <span className="text-[10px] font-black text-slate-400 ml-2">DAY</span>
                    </td>
                    <td className="px-6 py-3 border-r border-slate-50">
                       <div className="flex gap-1.5">
                          {['P', 'HD', 'OT'].filter(s => {
                            const nightStatus = (attendance[emp.id]?.['Night']?.status || '').toLowerCase();
                            if (nightStatus === 'p' && s === 'P') return false;
                            return true;
                          }).map(s => (
                            <button
                              key={s}
                              onClick={() => updateAttendance(emp.id, 'Day', 'status', s)}
                              className={cn(
                                "flex-1 py-1 px-2 rounded text-[9px] font-black uppercase tracking-tighter border transition-all",
                                (attendance[emp.id]?.['Day']?.status || '').toLowerCase() === s.toLowerCase() 
                                  ? getStatusColor(s)
                                  : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
                              )}
                            >
                              {s}
                            </button>
                          ))}
                       </div>
                    </td>
                    <td className="px-6 py-3 text-center border-r border-slate-50">
                       <input 
                        type="checkbox" 
                        checked={attendance[emp.id]?.['Day']?.is_late === 1}
                        onChange={(e) => updateAttendance(emp.id, 'Day', 'is_late', e.target.checked ? 1 : 0)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                       />
                    </td>
                    <td className="px-6 py-3 text-center text-[10px] font-black text-slate-400 font-mono">
                      {getStatusLabel(attendance[emp.id]?.['Day']?.status || '')}
                    </td>
                  </tr>
                  {/* Night Shift Row */}
                  <tr className="bg-slate-900/[0.05] group transition-colors hover:bg-slate-950/[0.08]">
                    <td className="px-6 py-3 text-center border-r border-slate-100">
                       <Moon size={14} className="inline text-blue-500" />
                       <span className="text-[10px] font-black text-slate-400 ml-2">NIGHT</span>
                    </td>
                    <td className="px-6 py-3 border-r border-slate-100">
                       <div className="flex gap-1.5">
                          {['P', 'OT'].filter(s => {
                             const dayStatus = (attendance[emp.id]?.['Day']?.status || '').toLowerCase();
                             if (dayStatus === 'p' && s === 'P') return false;
                             return true;
                          }).map(s => (
                            <button
                              key={s}
                              onClick={() => updateAttendance(emp.id, 'Night', 'status', s)}
                              className={cn(
                                "flex-1 py-1 px-2 rounded text-[9px] font-black uppercase tracking-tighter border transition-all",
                                (attendance[emp.id]?.['Night']?.status || '').toLowerCase() === s.toLowerCase() 
                                  ? getStatusColor(s)
                                  : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
                              )}
                            >
                              {s}
                            </button>
                          ))}
                       </div>
                    </td>
                    <td className="px-6 py-3 text-center border-r border-slate-100">
                       <span className="text-[10px] text-slate-300">N/A</span>
                    </td>
                    <td className="px-6 py-3 text-center text-[10px] font-black text-slate-400">
                       {['Present', 'P', 'OT'].includes(attendance[emp.id]?.['Night']?.status || '') ? '1.0' : '0'}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center shrink-0">
             <div className="flex items-center gap-4">
                <button 
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                  className="p-1.5 hover:bg-slate-200 rounded transition-colors text-slate-400"
                >
                  <ChevronLeft size={16}/>
                </button>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">{format(currentMonth, 'MMMM yyyy')}</h3>
                <button 
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                  className="p-1.5 hover:bg-slate-200 rounded transition-colors text-slate-400"
                >
                  <ChevronRight size={16}/>
                </button>

                <button 
                  onClick={handleEditToggle}
                  className={cn(
                    "ml-4 flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                    isEditMode ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {isEditMode ? <Unlock size={12}/> : <Lock size={12}/>}
                  {isEditMode ? 'Editing Active' : 'Enable Edit'}
                </button>
             </div>
             <div className="flex gap-4 text-[9px] font-black uppercase tracking-tight text-slate-400">
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-500" /> Present</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-lime-400" /> Half Day</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-amber-500" /> Sunday</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-rose-50 border border-slate-200" /> Absent</span>
             </div>
          </div>
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full border-collapse text-[9px] table-fixed min-w-[1200px]">
              <thead className="sticky top-0 bg-white z-20">
                <tr className="bg-slate-50">
                  <th className="w-48 border border-slate-200 p-2 font-black uppercase text-slate-400 text-left sticky left-0 bg-slate-50 shadow-[2px_0_5px_0_rgba(0,0,0,0.05)] z-30">Employee</th>
                  <th className="w-12 border border-slate-200 p-2 font-black uppercase text-slate-400 text-center sticky left-48 bg-slate-50 z-30">Shift</th>
                  {eachDayOfInterval({ 
                    start: startOfMonth(currentMonth), 
                    end: endOfMonth(currentMonth) 
                  }).map((date, i) => (
                    <th 
                      key={i} 
                      className={cn(
                        "border border-slate-100 p-1 font-bold",
                        format(date, 'E') === 'Sun' ? "text-amber-600 bg-amber-50" : "text-slate-600"
                      )}
                    >
                      {format(date, 'd')}<br/>{format(date, 'E')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-800">
                {employees.map(emp => (
                  <React.Fragment key={emp.id}>
                    {/* Day Row */}
                    <tr className="bg-white hover:bg-slate-50 transition-colors group">
                      <td rowSpan={2} className="px-6 py-4 border-r-2 border-slate-200 sticky left-0 bg-white z-10 shadow-[4px_0_10px_0_rgba(0,0,0,0.08)]">
                         <div className="flex flex-col items-center justify-center h-full gap-1">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{emp.name}</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">EMP #{emp.id}</p>
                            <div className="mt-2 px-3 py-1 bg-indigo-50 rounded-full text-[9px] font-black text-indigo-600 uppercase tracking-widest border border-indigo-100">
                               {emp.group_name || 'DEFAULT'}
                            </div>
                         </div>
                      </td>
                      <td className="w-12 px-1 py-4 border-r-2 border-slate-100 bg-white text-center sticky left-48 z-10">
                         <Sun size={14} className="text-amber-500 mx-auto mb-1" />
                         <span className="text-[8px] font-black text-slate-400 uppercase">DAY</span>
                      </td>
                      {eachDayOfInterval({ 
                        start: startOfMonth(currentMonth), 
                        end: endOfMonth(currentMonth) 
                      }).map((date, i) => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const rec = monthlyAttendance.find(a => a.employee_id === emp.id && a.date === dateStr && a.shift === 'Day');
                        let status = '-';
                        if (rec) {
                          if (rec.overtime === 'Full') status = 'OT';
                          else if (rec.status === 'Present') status = 'P';
                          else if (rec.status === 'HalfDay') status = 'HD';
                          else if (rec.status === 'Absent') status = 'A';
                        }
                        
                        return (
                          <td key={i} className={cn("border border-slate-100 p-0 text-center font-black relative cursor-pointer", format(date, 'E') === 'Sun' && "bg-amber-500/5")}>
                             {isEditMode ? (
                                <input 
                                  type="text"
                                  placeholder=""
                                  className={cn(
                                    "w-full h-14 text-center text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500 z-10 relative transition-all",
                                    status === 'P' ? "bg-emerald-500 text-white" :
                                    status === 'OT' ? "bg-indigo-600 text-white" :
                                    status === 'HD' ? "bg-amber-400 text-amber-950" :
                                    status === 'A' ? "bg-rose-600 text-white" : "bg-transparent hover:bg-slate-50"
                                  )}
                                  defaultValue={status === '-' ? '' : status}
                                  onBlur={(e) => updateMonthlyCell(emp.id, dateStr, 'Day', e.target.value)}
                                />
                             ) : (
                                <div className={cn(
                                  "w-full h-14 flex items-center justify-center text-xs transition-colors",
                                  status === 'P' ? "bg-emerald-500 text-white" : 
                                  status === 'OT' ? "bg-indigo-600 text-white" :
                                  status === 'HD' ? "bg-amber-400 text-amber-950" :
                                  status === 'A' ? "bg-rose-600 text-white" : "text-transparent" 
                                )}>{status === '-' || status === 'A' && !rec ? '' : status}</div>
                             )}
                          </td>
                        );
                      })}
                    </tr>
                    {/* Night Row */}
                    <tr className="bg-slate-400/80 hover:bg-slate-400 transition-colors group">
                      <td className="w-12 px-1 py-4 border-r-2 border-slate-300 bg-white text-center sticky left-48 z-10 transition-colors group-hover:bg-slate-50">
                         <Moon size={14} className="text-blue-600 mx-auto mb-1" />
                         <span className="text-[8px] font-black text-slate-400 uppercase">NIGHT</span>
                      </td>
                      {eachDayOfInterval({ 
                        start: startOfMonth(currentMonth), 
                        end: endOfMonth(currentMonth) 
                      }).map((date, i) => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const rec = monthlyAttendance.find(a => a.employee_id === emp.id && a.date === dateStr && a.shift === 'Night');
                        let status = '-';
                        if (rec) {
                          if (rec.overtime === 'Full') status = 'OT';
                          else if (rec.status === 'Present') status = 'P';
                          else if (rec.status === 'HalfDay') status = 'HD';
                          else if (rec.status === 'Absent') status = 'A';
                        }
                        return (
                          <td key={i} className={cn("border border-slate-300/30 p-0 text-center font-black relative cursor-pointer", format(date, 'E') === 'Sun' && "bg-slate-800/10")}>
                             {isEditMode ? (
                                <input 
                                  type="text"
                                  placeholder=""
                                  className={cn(
                                    "w-full h-14 text-center text-xs uppercase outline-none focus:ring-2 focus:ring-blue-400 z-10 relative transition-all",
                                    status === 'P' ? "bg-emerald-500 text-white" :
                                    status === 'OT' ? "bg-indigo-600 text-white" :
                                    status === 'HD' ? "bg-amber-400 text-amber-950" :
                                    status === 'A' ? "bg-rose-600 text-white" : "bg-transparent text-slate-100 hover:bg-white/10"
                                  )}
                                  defaultValue={status === '-' ? '' : status}
                                  onBlur={(e) => updateMonthlyCell(emp.id, dateStr, 'Night', e.target.value)}
                                />
                             ) : (
                                <div className={cn(
                                  "w-full h-14 flex items-center justify-center text-xs transition-colors",
                                  status === 'P' ? "bg-emerald-500 text-white" : 
                                  status === 'OT' ? "bg-indigo-600 text-white" :
                                  status === 'HD' ? "bg-amber-400 text-amber-950" :
                                  status === 'A' ? "bg-rose-600 text-white" : "text-transparent" 
                                )}>{status === '-' || status === 'A' && !rec ? '' : status}</div>
                             )}
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-6">
                 <Lock size={32} />
              </div>
              <h2 className="text-xl font-black text-slate-800 text-center uppercase tracking-tight mb-2">Elevated Access</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mb-8">Verification required to modify historical units</p>
              
              <div className="space-y-4">
                 <input 
                  type="password" 
                  placeholder="AUTHORIZATION KEY"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 text-sm font-black text-center outline-none focus:bg-white focus:border-indigo-400 transition-all tracking-[0.5em]"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && verifyPassword()}
                 />
                 <div className="flex gap-3">
                    <button 
                      onClick={() => { setShowPasswordPrompt(false); setPassword(''); }}
                      className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600"
                    >
                      Abort
                    </button>
                    <button 
                      onClick={verifyPassword}
                      className="flex-1 bg-indigo-600 text-white rounded-xl py-4 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700"
                    >
                      Override
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Legend Footer */}
      <footer className="fixed bottom-0 left-16 right-0 bg-white border-t border-slate-200 px-8 py-3 flex gap-8 z-50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Present (P)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-lime-400" />
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Half Day (HD)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Overtime (OT)</span>
        </div>
        <div className="flex items-center gap-2 opacity-40">
          <div className="w-3 h-3 rounded-full bg-rose-50 border border-slate-200" />
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Absent</span>
        </div>
      </footer>
    </div>
  );
}
