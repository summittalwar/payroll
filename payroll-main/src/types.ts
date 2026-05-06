export interface Employee {
  id: number;
  name: string;
  photo?: string;
  doj: string;
  status: 'Active' | 'Left';
  employee_type: 'Worker' | 'Staff';
  monthly_salary: number;
  shift_type: 'Day' | 'Night' | 'Rotational';
  weekly_off: number;
  sunday_rule: number;
  holiday_rule: number;
  esi_enabled: number;
  esi_salary: number;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  date: string;
  shift: 'Day' | 'Night';
  status: 'Present' | 'Absent' | 'HalfDay';
  overtime: 'None' | 'Half' | 'Full';
  is_late: number;
  is_locked: number;
}

export interface Advance {
  id: number;
  employee_id: number;
  date: string;
  amount: number;
  type: 'Temporary' | 'Permanent';
  remarks: string;
}

export interface Payment {
  id: number;
  employee_id: number;
  date: string;
  amount: number;
  entered_by: string;
}

export interface Adjustment {
  id: number;
  employee_id: number;
  month: number;
  year: number;
  amount: number;
  description: string;
  type: string;
  date: string;
}

export interface Settlement {
  id: number;
  employee_id: number;
  amount: number;
  reason: string;
  date: string;
}

export interface Bonus {
  id: number;
  employee_id: number;
  year: number;
  month: number;
  amount: number;
  description: string;
  is_approved: number;
}
