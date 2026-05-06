import React, { useState, useEffect } from 'react';
import { Gift, Search, ChevronLeft, ChevronRight, UserPlus, Save } from 'lucide-react';
import { Employee } from '../types';
import { format } from 'date-fns';
import { formatCurrency, cn } from '../lib/utils';

export default function BonusManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmps, setSelectedEmps] = useState<number[]>([]);
  const [lastYearEarnings, setLastYearEarnings] = useState<{[key: number]: number}>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bonusAmount, setBonusAmount] = useState('');
  const [description, setDescription] = useState('');
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    const res = await fetch('/api/employees');
    const data = await res.json();
    setEmployees(data);
  }, []);

  const fetchBonuses = useCallback(async () => {
    const res = await fetch('/api/bonuses');
    const data = await res.json();
    setBonuses(data);
  }, []);

  const fetchLastYearEarnings = useCallback(async () => {
    const res = await fetch(`/api/employees/last-year-earnings/${currentDate.getFullYear()}`);
    const data = await res.json();
    const mapping: {[key: number]: number} = {};
    data.forEach((r: any) => mapping[r.employee_id] = r.total_earnings);
    setLastYearEarnings(mapping);
  }, [currentDate]);

  useEffect(() => {
    fetchEmployees();
    fetchBonuses();
  }, [fetchEmployees, fetchBonuses]);

  useEffect(() => {
    fetchLastYearEarnings();
  }, [fetchLastYearEarnings]);

  const toggleEmp = (id: number) => {
    setSelectedEmps(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDistribute = async () => {
    if (selectedEmps.length === 0 || !bonusAmount) return;
    setIsLoading(true);
    try {
      await fetch('/api/bonuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_ids: selectedEmps,
          year: currentDate.getFullYear(),
          month: currentDate.getMonth() + 1,
          amount: parseFloat(bonusAmount),
          description
        })
      });
      setBonusAmount('');
      setDescription('');
      setSelectedEmps([]);
      fetchBonuses();
      alert('Bonus distributed successfully!');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const approveBonus = async (id: number) => {
    await fetch(`/api/bonuses/approve/${id}`, { method: 'POST' });
    fetchBonuses();
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Gift className="text-pink-600" />
          Bonus Management
        </h1>
        <div className="flex items-center gap-4 bg-white p-2 rounded-lg shadow-sm">
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft size={20} />
          </button>
          <span className="font-medium min-w-[120px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Employee Selection */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search employees..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-pink-500 text-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setSelectedEmps(employees.map(e => e.id))}
              className="text-xs text-pink-600 font-medium hover:underline"
            >
              Select All
            </button>
          </div>
          
          <div className="overflow-x-auto h-[500px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="p-4 w-12">
                    <input 
                      type="checkbox" 
                      onChange={(e) => setSelectedEmps(e.target.checked ? employees.map(emp => emp.id) : [])}
                      checked={selectedEmps.length === employees.length && employees.length > 0}
                      className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                  </th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Last Year Salary</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Input Figure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className={cn("hover:bg-gray-50 transition-colors", selectedEmps.includes(emp.id) && "bg-pink-50/30")}>
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedEmps.includes(emp.id)}
                        onChange={() => toggleEmp(emp.id)}
                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                      />
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{emp.name}</div>
                      <div className="text-xs text-gray-500">{emp.employee_type}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-mono text-sm">
                        {lastYearEarnings[emp.id] ? formatCurrency(lastYearEarnings[emp.id]) : '--'}
                      </div>
                    </td>
                    <td className="p-4">
                       <input 
                        type="number" 
                        placeholder="Manual..." 
                        className="w-24 p-1 text-sm border rounded"
                        defaultValue={lastYearEarnings[emp.id] || 0}
                       />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Distribution Form */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UserPlus size={20} className="text-pink-600" />
              Distribute Bonus
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Amount (per person)</label>
                <input 
                  type="number" 
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                  value={bonusAmount}
                  onChange={e => setBonusAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description / Reason</label>
                <textarea 
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ex: Performance Bonus 2025"
                />
              </div>
              <div className="pt-2">
                <div className="text-sm text-gray-500 mb-2">
                  Total Selected: <span className="font-bold text-gray-900">{selectedEmps.length}</span>
                </div>
                <div className="text-sm text-gray-500 mb-4">
                  Grand Total: <span className="font-bold text-pink-600">{formatCurrency(selectedEmps.length * (parseFloat(bonusAmount) || 0))}</span>
                </div>
                <button 
                  onClick={handleDistribute}
                  disabled={isLoading || selectedEmps.length === 0 || !bonusAmount}
                  className="w-full bg-pink-600 text-white py-3 rounded-lg font-bold shadow-lg shadow-pink-200 hover:bg-pink-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Confirm Distribution
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <h3 className="text-sm font-bold text-gray-600 mb-3 uppercase tracking-wider">Recent Activity</h3>
            <div className="space-y-3">
              {bonuses.slice(0, 5).map(b => (
                <div key={b.id} className="flex justify-between items-start bg-white p-3 rounded shadow-sm border border-gray-100">
                  <div>
                    <div className="font-medium text-sm text-gray-900">{b.employee_name}</div>
                    <div className="text-xs text-gray-500">{b.description}</div>
                    <div className="text-[10px] text-gray-400 mt-1">{format(new Date(b.year, b.month - 1), 'MMM yyyy')}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-pink-600 text-sm">{formatCurrency(b.amount)}</div>
                    {b.is_approved ? (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Approved</span>
                    ) : (
                      <button 
                        onClick={() => approveBonus(b.id)}
                        className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium hover:bg-amber-200"
                      >
                        Pending
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
