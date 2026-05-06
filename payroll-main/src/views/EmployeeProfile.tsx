import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { 
  UserCircle, 
  Banknote, 
  PlusCircle, 
  Info,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Wallet,
  CheckCircle2,
  X,
  ShieldCheck
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';

export default function EmployeeProfile() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [payroll, setPayroll] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<{advances: any[], payments: any[], revisions: any[], logs: any[], adjustments: any[], settlements: any[]}>({
    advances: [], payments: [], revisions: [], logs: [], adjustments: [], settlements: []
  });
  const [activeTab, setActiveTab] = useState('Advances');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modals
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);

  // Adjustment Form
  const [adjAmount, setAdjAmount] = useState('');
  const [adjType, setAdjType] = useState('Commission');
  const [adjDesc, setAdjDesc] = useState('');

  // Settlement Form
  const [settleAmount, setSettleAmount] = useState('');
  const [settleReason, setSettleReason] = useState('');
  
  // Advance Form
  const [advType, setAdvType] = useState<'Temporary' | 'Permanent'>('Temporary');
  const [advAmount, setAdvAmount] = useState(0);
  const [advRemarks, setAdvRemarks] = useState('');
  const [advSchedule, setAdvSchedule] = useState<{month: number, year: number, amount: number}[]>([]);

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const fetchData = useCallback(() => {
    const m = currentDate.getMonth() + 1;
    const y = currentDate.getFullYear();
    Promise.all([
      fetch(`/api/employees/${id}`).then(res => res.json()),
      fetch(`/api/payroll/${id}/${m}/${y}`).then(res => res.json()),
      fetch(`/api/employees/${id}/history`).then(res => res.json())
    ]).then(([emp, pay, hist]) => {
      setData(emp);
      setPayroll(pay);
      setHistory(hist);
      setLoading(false);
      setPaymentAmount(pay.netSalary);
    });
  }, [id, currentDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePostPayment = async () => {
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employee_id: id, 
          date: format(new Date(), 'yyyy-MM-dd'),
          month,
          year,
          amount: paymentAmount, 
          user: 'Admin' 
        })
      });
      if (res.ok) {
        setShowPaymentConfirm(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAdvance = async () => {
    const body = {
      employee_id: id,
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: advType === 'Temporary' ? advAmount : advSchedule.reduce((s, i) => s + i.amount, 0),
      type: advType,
      remarks: advRemarks,
      schedule: advType === 'Permanent' ? advSchedule : null,
      user: 'Admin'
    };

    const res = await fetch('/api/advances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
       setShowAdvanceModal(false);
       setAdvAmount(0);
       setAdvRemarks('');
       setAdvSchedule([]);
       fetchData();
    }
  };

  const handleAddAdjustment = async () => {
    await fetch('/api/adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: id,
        month,
        year,
        amount: parseFloat(adjAmount),
        description: adjDesc,
        type: adjType
      })
    });
    setShowAdjustmentModal(false);
    setAdjAmount('');
    setAdjDesc('');
    fetchData();
  };

  const handleAddSettlement = async () => {
    await fetch('/api/settlements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: id,
        amount: parseFloat(settleAmount),
        reason: settleReason
      })
    });
    setShowSettlementModal(false);
    setSettleAmount('');
    setSettleReason('');
    fetchData();
  };

  const addScheduleItem = () => {
    const last = advSchedule.length > 0 ? new Date(advSchedule[advSchedule.length-1].year, advSchedule[advSchedule.length-1].month-1) : new Date();
    const next = addMonths(last, 1);
    setAdvSchedule([...advSchedule, { month: next.getMonth()+1, year: next.getFullYear(), amount: 0 }]);
  };

  if (loading) return (
     <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
     </div>
  );

  const days = eachDayOfInterval({ 
    start: startOfMonth(currentDate), 
    end: endOfMonth(currentDate) 
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      {/* 1. Header + Selector */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 bg-white border border-slate-200 rounded-xl p-6 flex items-center gap-8 shadow-sm">
          <div className="w-24 h-24 rounded-2xl bg-slate-50 border-4 border-white shadow-lg flex items-center justify-center text-slate-200 shrink-0 overflow-hidden group">
             {data.photo ? <img src={data.photo} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /> : <UserCircle size={48} />}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-none">{data.name}</h1>
                <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">{data.employee_type} • ID: {data.id} • Joined {format(new Date(data.doj), 'dd MMM yyyy')}</p>
              </div>
              <div className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border", data.status === 'Active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100")}>
                {data.status}
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg">
                <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Monthly Salary</p>
                <p className="text-xs font-black text-slate-700">{formatCurrency(data.monthly_salary)}</p>
              </div>
              {data.esi_enabled === 1 && (
                <div className="bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg">
                  <p className="text-[8px] font-black text-blue-400 uppercase leading-none mb-1">ESI Basis</p>
                  <p className="text-xs font-black text-blue-700">{formatCurrency(data.esi_salary)}</p>
                </div>
              )}
              <div className="bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
                <p className="text-[8px] font-black text-emerald-600 uppercase leading-none mb-1">Paid this Month</p>
                <p className="text-xs font-black text-emerald-700">{formatCurrency(payroll?.paidAmount || 0)}</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg">
                <p className="text-[8px] font-black text-amber-500 uppercase leading-none mb-1">Advance Debt</p>
                <p className="text-xs font-black text-amber-700">-{formatCurrency(payroll?.totalPendingAdvances || 0)}</p>
              </div>
              <div className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg">
                <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Settlement Balance</p>
                <p className={cn("text-xs font-black", (payroll?.totalSettledAllTime || 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {formatCurrency(payroll?.totalSettledAllTime || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-4 bg-slate-900 rounded-xl p-6 text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
           <Wallet className="absolute -right-6 -bottom-6 w-32 h-32 opacity-5 -rotate-12" />
           <div className="flex justify-between items-center relative z-10">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payroll Calculation</h2>
              <div className="flex items-center bg-white/10 rounded-lg p-1">
                 <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-white/10 rounded"><ChevronLeft size={14}/></button>
                 <span className="text-[9px] font-black uppercase px-2 w-24 text-center">{format(currentDate, 'MMM yyyy')}</span>
                 <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-white/10 rounded"><ChevronRight size={14}/></button>
              </div>
           </div>
           
           <div className="mt-4 relative z-10 flex flex-col gap-2">
               <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10 pb-2">
                  <span>Gross Month</span>
                  <span className="text-slate-200">{formatCurrency(payroll?.grossSalary || 0)}</span>
               </div>
               <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10 pb-2">
                  <span>Adv / ESI</span>
                  <span className="text-rose-400">-{formatCurrency((payroll?.totalAdvances || 0) + (payroll?.esiDeduction || 0))}</span>
               </div>
               <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10 pb-2">
                  <span>Adj / Bonus</span>
                  <span className="text-emerald-400">+{formatCurrency((payroll?.monthAdjustments || 0) + (payroll?.monthBonuses || 0))}</span>
               </div>

               {payroll?.isPaid ? (
                  <div className="flex items-end gap-3 mt-2">
                     <div className="flex-1">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Disbursed Amount</p>
                        <p className="text-3xl font-black text-emerald-400">{formatCurrency(payroll.paidAmount)}</p>
                     </div>
                     <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-emerald-500/30">
                        <CheckCircle2 size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest tracking-tighter">PAID</span>
                     </div>
                  </div>
               ) : (
                  <div className="flex items-end justify-between mt-2">
                     <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest underline decoration-blue-500 underline-offset-4">Net Payable</p>
                        <p className="text-4xl font-black tracking-tighter mt-1">{formatCurrency(payroll?.netSalary || 0)}</p>
                     </div>
                     <button 
                       onClick={() => setShowPaymentConfirm(true)}
                       className="bg-blue-600 hover:bg-blue-700 h-10 px-6 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                     >
                        Pay Now
                     </button>
                  </div>
               )}
               
               <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                  <button 
                    onClick={() => setShowAdjustmentModal(true)}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle size={10} /> Adjustment
                  </button>
                  <button 
                    onClick={() => setShowSettlementModal(true)}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck size={10} /> Settle Balance
                  </button>
               </div>
            </div>
        </div>
      </div>

      {/* 2. Breakdown and Details */}
      <div className="grid grid-cols-12 gap-6">
         <div className="col-span-8 space-y-6">
            <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm overflow-hidden">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={14} className="text-blue-500" />
                    Activity Log: {format(currentDate, 'MMMM yyyy')}
                  </h3>
                  <div className="flex gap-4 text-[8px] font-black uppercase tracking-tight text-slate-400">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-600 rounded-full" /> Full Present</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-300 rounded-full" /> Half Day</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-100 border border-slate-300 rounded-full" /> Absent</span>
                  </div>
               </div>
               <div className="grid grid-cols-7 gap-1">
                  {['S','M','T','W','T','F','S'].map((d, i) => (
                    <div key={i} className="text-center text-[8px] font-black text-slate-300 uppercase py-2 py-2">{d}</div>
                  ))}
                  {Array.from({ length: currentDate.getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-12 border border-slate-50 rounded bg-slate-50 opacity-20" />
                  ))}
                  {days.map(d => {
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const dayLogs = (data.attendance || []).filter((a: any) => a.date === dateStr);
                    const isSun = format(d, 'E') === 'Sun';
                    let bg = "bg-slate-50 border-slate-100 text-slate-300";
                    if (isSun) bg = "bg-amber-500 border-amber-600 text-white shadow-sm";
                    
                    const dayShift = dayLogs.find((l: any) => l.shift === 'Day');
                    if (dayShift?.status === 'Present') bg = "bg-blue-600 border-blue-700 text-white shadow-inner";
                    if (dayShift?.status === 'HalfDay') bg = "bg-blue-300 border-blue-400 text-white shadow-inner";

                    return (
                      <div key={dateStr} className={cn("h-12 border rounded-lg flex flex-col items-center justify-center relative group transition-all", bg)}>
                         <span className="text-[9px] font-black leading-none">{format(d, 'd')}</span>
                         {dayLogs.length > 1 && <div className="absolute top-1 right-1 w-1 h-1 bg-white rounded-full opacity-50" />}
                      </div>
                    );
                  })}
               </div>
            </section>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
               <div className="bg-slate-50 border-b border-slate-200 flex">
                  {['Advances', 'Payments', 'Adjustments', 'Settlements', 'System Logs'].map((tab) => (
                    <button 
                      key={tab} 
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === tab ? "bg-white text-blue-600 border-r border-slate-200 shadow-sm" : "text-slate-400 hover:bg-slate-100"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                  <div className="flex-1 flex justify-end p-2 px-4">
                     <button 
                      onClick={() => setShowAdvanceModal(true)}
                      className="bg-amber-500 text-white px-4 py-1 rounded text-[9px] font-black uppercase tracking-widest hover:bg-amber-600 transition-colors shadow-sm"
                     >
                       New Advance
                     </button>
                  </div>
               </div>
               <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left">
                     <thead className="sticky top-0 bg-white border-b border-slate-100 shadow-sm z-10">
                        <tr className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                           <th className="px-6 py-3">Reference Data</th>
                           <th className="px-6 py-3">Category</th>
                           <th className="px-6 py-3 text-right">Value</th>
                           <th className="px-6 py-3 text-right pr-8">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {activeTab === 'Advances' && history.advances.map(a => (
                           <tr key={a.id} className="text-[10px] font-bold text-slate-600">
                              <td className="px-6 py-3 uppercase">{a.date}</td>
                              <td className="px-6 py-3 uppercase">
                                 {a.type} {a.scheduled_month ? `(Sch: ${a.scheduled_month}/${a.scheduled_year})` : ''}
                                 {a.remarks && <p className="text-[8px] opacity-60 normal-case">{a.remarks}</p>}
                              </td>
                              <td className="px-6 py-3 text-right text-rose-500 font-black">{formatCurrency(a.amount)}</td>
                              <td className="px-6 py-3 text-right pr-8">
                                 <span className={cn("px-2 py-0.5 rounded text-[8px] uppercase", a.is_deducted ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                                    {a.is_deducted ? 'Deducted' : 'Pending'}
                                 </span>
                              </td>
                           </tr>
                        ))}
                        {activeTab === 'Payments' && history.payments.map(p => (
                           <tr key={p.id} className="text-[10px] font-bold text-slate-600">
                              <td className="px-6 py-3 uppercase">{p.date}</td>
                              <td className="px-6 py-3 uppercase">Salary Settlement {p.month}/{p.year}</td>
                              <td className="px-6 py-3 text-right text-emerald-600 font-black">{formatCurrency(p.amount)}</td>
                              <td className="px-6 py-3 text-right pr-8">
                                 <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[8px]">FINALIZED</span>
                              </td>
                           </tr>
                        ))}
                        {activeTab === 'Adjustments' && (history.adjustments || []).map(adj => (
                           <tr key={adj.id} className="text-[10px] font-bold text-slate-600">
                              <td className="px-6 py-3 uppercase">{adj.month}/{adj.year}</td>
                              <td className="px-6 py-3 uppercase italic text-[9px]">{adj.description || adj.type}</td>
                              <td className="px-6 py-3 text-right text-blue-600 font-black">+{formatCurrency(adj.amount)}</td>
                              <td className="px-6 py-3 text-right pr-8">
                                 <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[8px]">{adj.type.toUpperCase()}</span>
                              </td>
                           </tr>
                        ))}
                        {activeTab === 'Settlements' && (history.settlements || []).map(s => (
                           <tr key={s.id} className="text-[10px] font-bold text-slate-600">
                              <td className="px-6 py-3 uppercase">{s.date}</td>
                              <td className="px-6 py-3 uppercase italic text-[9px]">{s.reason}</td>
                              <td className={cn("px-6 py-3 text-right font-black", s.amount >= 0 ? "text-rose-600" : "text-emerald-600")}>
                                 {s.amount >= 0 ? '+' : ''}{formatCurrency(s.amount)}
                              </td>
                              <td className="px-6 py-3 text-right pr-8">
                                 <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[8px]">SETTLED</span>
                              </td>
                           </tr>
                        ))}
                        {activeTab === 'System Logs' && (history.logs || []).map(log => (
                           <tr key={log.id} className="text-[10px] font-bold text-slate-600">
                              <td className="px-6 py-3 uppercase">{format(new Date(log.timestamp), 'dd MMM HH:mm')}</td>
                              <td className="px-6 py-3 uppercase truncate max-w-xs">{log.action}: {log.category}</td>
                              <td className="px-6 py-3 text-right text-slate-400 font-mono">{log.user}</td>
                              <td className="px-6 py-3 text-right pr-8 text-slate-300">
                                 <Info size={12} />
                              </td>
                           </tr>
                        ))}
                        {/* Fallback for empty */}
                        {((activeTab === 'Advances' && history.advances.length === 0) || 
                          (activeTab === 'Payments' && history.payments.length === 0) ||
                          (activeTab === 'Adjustments' && (!history.adjustments || history.adjustments.length === 0)) ||
                          (activeTab === 'Settlements' && (!history.settlements || history.settlements.length === 0)) ||
                          (activeTab === 'System Logs' && (!history.logs || history.logs.length === 0))) && (
                           <tr>
                              <td colSpan={10} className="py-20 text-center text-slate-300 font-black italic tracking-widest text-[10px]">No encrypted records found in this sequence</td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>

         <div className="col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
               <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <ShieldCheck size={14} className="text-blue-500" />
                 Ledger Calculation Breakdown
               </h3>
               <div className="space-y-4">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                     <span className="text-slate-400 uppercase tracking-tight">Present Count</span>
                     <span className="text-slate-900">{payroll?.presentDays || 0} Days</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold">
                     <span className="text-slate-400 uppercase tracking-tight">Paid Sundays (1:3 Rule)</span>
                     <span className="text-slate-900">{payroll?.paidSundays || 0} Days</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold">
                     <span className="text-slate-400 uppercase tracking-tight">Gazetted Holidays</span>
                     <span className="text-emerald-500">{payroll?.holidayDays || 0} Days</span>
                  </div>
                  <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-[11px] font-black">
                     <span className="text-slate-800 uppercase tracking-widest">Gross Earnings</span>
                     <span className="text-slate-900 underline decoration-2 decoration-blue-500 underline-offset-4">{formatCurrency(payroll?.grossSalary || 0)}</span>
                  </div>
                  
                  <div className="space-y-2 pt-2">
                     <div className="flex justify-between items-center text-[11px] font-bold text-rose-500">
                        <span className="uppercase tracking-tight">ESI DEDUCTION</span>
                        <span>-{formatCurrency(payroll?.esiDeduction || 0)}</span>
                     </div>
                     <div className="flex justify-between items-center text-[11px] font-bold text-rose-500">
                        <span className="uppercase tracking-tight">ADVANCE OFFSET</span>
                        <span>-{formatCurrency(payroll?.totalAdvances || 0)}</span>
                     </div>
                  </div>

                  <div className="pt-4 mt-2 border-t-2 border-slate-900 flex justify-between items-center">
                     <span className="text-xs font-black text-slate-900 uppercase">Settlement Net</span>
                     <span className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency(payroll?.netSalary || 0)}</span>
                  </div>
               </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 shadow-inner">
               <div className="flex gap-4">
                  <Info size={18} className="text-amber-500 shrink-0" />
                  <div className="space-y-2">
                     <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Adjustment Protocol</h4>
                     <p className="text-[9px] text-amber-700 font-bold leading-relaxed">
                        The "Settlement Net" represents the liquidity currently reserved for the employee. Posting payment will lock this month for further financial modifications.
                     </p>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Confirmation Modal */}
      {showPaymentConfirm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-200">
              <div className="bg-slate-900 p-6 text-white text-center">
                 <Banknote size={48} className="mx-auto mb-4 text-emerald-400" />
                 <h2 className="text-xl font-black uppercase tracking-tight">Final Authorization</h2>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Payout of {formatCurrency(payroll.netSalary)} for {format(currentDate, 'MMMM yyyy')}</p>
              </div>
              <div className="p-8 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verify Payout Figure</label>
                    <input 
                       type="number" 
                       className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-xl font-black text-center focus:border-blue-500 transition-all outline-none"
                       value={paymentAmount}
                       onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-[8px] text-center text-slate-400 font-black italic">System defaults to calculated balance ({formatCurrency(payroll.netSalary)})</p>
                 </div>
                 <div className="flex gap-4">
                    <button onClick={() => setShowPaymentConfirm(false)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
                    <button onClick={handlePostPayment} className="flex-2 bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 active:scale-95 transition-all">Execute Payment</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Advance Modal */}
      {showAdvanceModal && (
         <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-200">
              <div className="bg-amber-500 p-6 text-white flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <PlusCircle size={24} />
                    <h2 className="text-lg font-black uppercase tracking-tight tracking-widest">Issue New Advance</h2>
                 </div>
                 <button onClick={() => setShowAdvanceModal(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={20}/></button>
              </div>
              
              <div className="p-8 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Advance Type</label>
                       <select 
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase outline-none focus:border-amber-400"
                         value={advType}
                         onChange={(e) => setAdvType(e.target.value as any)}
                       >
                          <option value="Temporary">Temporary (Immediate)</option>
                          <option value="Permanent">Permanent (Scheduled)</option>
                       </select>
                    </div>
                    {advType === 'Temporary' && (
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount</label>
                          <input 
                            type="number" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:border-amber-400"
                            placeholder="Enter amount..."
                            value={advAmount}
                            onChange={(e) => setAdvAmount(parseFloat(e.target.value) || 0)}
                          />
                       </div>
                    )}
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Remarks</label>
                    <textarea 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:border-amber-400 h-20 resize-none"
                      placeholder="Specify purpose..."
                      value={advRemarks}
                      onChange={(e) => setAdvRemarks(e.target.value)}
                    />
                 </div>

                 {advType === 'Permanent' && (
                    <div className="space-y-4">
                       <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deduction Schedule</label>
                          <button 
                            onClick={addScheduleItem}
                            className="bg-slate-900 text-white text-[8px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-2"
                          >
                            <PlusCircle size={10} /> Add Interval
                          </button>
                       </div>
                       <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                          {advSchedule.map((item, idx) => (
                             <div key={idx} className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div className="flex-1 flex gap-2">
                                   <div className="bg-white border rounded px-3 py-1 text-[10px] font-black">{item.month}/{item.year}</div>
                                   <input 
                                     type="number" 
                                     className="flex-1 bg-white border border-slate-200 rounded px-3 py-1 text-xs font-black outline-none focus:border-amber-400"
                                     placeholder="Amt..."
                                     value={item.amount}
                                     onChange={(e) => {
                                        const next = [...advSchedule];
                                        next[idx].amount = parseFloat(e.target.value) || 0;
                                        setAdvSchedule(next);
                                     }}
                                   />
                                </div>
                                <button className="text-slate-300 hover:text-rose-500"><X size={14}/></button>
                             </div>
                          ))}
                       </div>
                       <p className="text-[10px] font-black text-right text-slate-400">Total Asset Liability: <span className="text-slate-900">{formatCurrency(advSchedule.reduce((s, i) => s + i.amount, 0))}</span></p>
                    </div>
                 )}

                 <button 
                    onClick={handleAddAdvance}
                    className="w-full bg-amber-500 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-amber-200 hover:bg-amber-600 active:scale-[0.98] transition-all"
                 >
                    Confirm & Provision
                 </button>
              </div>
           </div>
         </div>
      )}
      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-blue-600 p-6 flex justify-between items-center">
                 <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-3">
                    <PlusCircle size={20} />
                    Add Monthly Adjustment
                 </h3>
                 <button onClick={() => setShowAdjustmentModal(false)} className="text-white/60 hover:text-white transition-colors">
                    <X size={24} />
                 </button>
              </div>
              <div className="p-8 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                       <select 
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase outline-none focus:border-blue-400"
                         value={adjType}
                         onChange={(e) => setAdjType(e.target.value)}
                       >
                          <option value="Commission">Commission</option>
                          <option value="Off-Book Extra">Off-Book Extra</option>
                          <option value="Allowance">Allowance</option>
                          <option value="Other">Other</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</label>
                       <input 
                         type="number" 
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:border-blue-400"
                         placeholder="Enter amount..."
                         value={adjAmount}
                         onChange={(e) => setAdjAmount(e.target.value)}
                       />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                    <textarea 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black h-24 resize-none outline-none focus:border-blue-400"
                      placeholder="Specify reason for adjustment..."
                      value={adjDesc}
                      onChange={(e) => setAdjDesc(e.target.value)}
                    />
                 </div>
                 <button 
                  onClick={handleAddAdjustment}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all font-black"
                 >
                  Add Adjustment
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Settlement Modal */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-indigo-600 p-6 flex justify-between items-center">
                 <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-3">
                    <ShieldCheck size={20} />
                    Settle / Adjust Balance
                 </h3>
                 <button onClick={() => setShowSettlementModal(false)} className="text-white/60 hover:text-white transition-colors">
                    <X size={24} />
                 </button>
              </div>
              <div className="p-8 space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adjustment Amount</label>
                    <p className="text-[10px] text-slate-400 -mt-1 italic font-bold">Positive reduces what you owe. Negative increases it.</p>
                    <input 
                      type="number" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:border-indigo-400"
                      placeholder="Enter amount..."
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(e.target.value)}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason for Settlement</label>
                    <textarea 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black h-24 resize-none outline-none focus:border-indigo-400"
                      placeholder="Accounting reason for settlement..."
                      value={settleReason}
                      onChange={(e) => setSettleReason(e.target.value)}
                    />
                 </div>
                 <button 
                  onClick={handleAddSettlement}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all font-black"
                 >
                  Confirm Settlement
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
