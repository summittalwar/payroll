import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import Database from "better-sqlite3";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSunday, subDays, isBefore, getDaysInMonth } from "date-fns";

const db = new Database("payroll.db");

// Initialize Database Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  );

  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    calculation_type TEXT DEFAULT 'Standard', -- Standard, Fixed
    sunday_rule TEXT DEFAULT 'Earned',       -- None, Fixed, Earned
    holiday_rule TEXT DEFAULT 'Pay'          -- Pay, NoPay
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    photo TEXT,
    doj TEXT NOT NULL,
    status TEXT DEFAULT 'Active',
    employee_type TEXT,
    group_id INTEGER,
    monthly_salary REAL,
    shift_type TEXT,
    weekly_off INTEGER DEFAULT 0,
    esi_enabled INTEGER DEFAULT 0,
    esi_salary REAL DEFAULT 0,
    FOREIGN KEY(group_id) REFERENCES groups(id)
  );

  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE,
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER,
    month INTEGER,
    year INTEGER,
    amount REAL,
    description TEXT,
    type TEXT,
    date TEXT DEFAULT CURRENT_DATE,
    FOREIGN KEY(employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER,
    amount REAL,
    reason TEXT,
    date TEXT DEFAULT CURRENT_DATE,
    FOREIGN KEY(employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS bonuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER,
    year INTEGER,
    month INTEGER,
    amount REAL,
    description TEXT,
    is_approved INTEGER DEFAULT 0,
    FOREIGN KEY(employee_id) REFERENCES employees(id)
  );
`);

// Migration: Add columns to employees, advances, and payments if missing
const migrations = [
  "ALTER TABLE employees ADD COLUMN group_id INTEGER REFERENCES groups(id)",
  "ALTER TABLE advances ADD COLUMN scheduled_month INTEGER",
  "ALTER TABLE advances ADD COLUMN scheduled_year INTEGER",
  "ALTER TABLE advances ADD COLUMN is_deducted INTEGER DEFAULT 0",
  "ALTER TABLE payments ADD COLUMN month INTEGER",
  "ALTER TABLE payments ADD COLUMN year INTEGER",
  "ALTER TABLE payments ADD COLUMN is_locked INTEGER DEFAULT 1"
];

migrations.forEach(sql => {
  try {
    db.prepare(sql).run();
  } catch {
    // Column likely already exists
  }
});

db.exec(`
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER,
    date TEXT,
    shift TEXT,
    status TEXT,
    overtime TEXT,
    is_late INTEGER DEFAULT 0,
    is_locked INTEGER DEFAULT 0,
    modified_by TEXT,
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date, shift),
    FOREIGN KEY(employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS attendance_locks (
    date TEXT PRIMARY KEY,
    is_finalized INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS advances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER,
    date TEXT,
    amount REAL,
    type TEXT, -- Temporary, Permanent
    remarks TEXT,
    scheduled_month INTEGER, -- Optional: for scheduled deductions
    scheduled_year INTEGER,
    is_deducted INTEGER DEFAULT 0,
    FOREIGN KEY(employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER,
    date TEXT,
    month INTEGER,
    year INTEGER,
    amount REAL,
    entered_by TEXT,
    is_locked INTEGER DEFAULT 1,
    UNIQUE(employee_id, month, year),
    FOREIGN KEY(employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS esi_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER,
    month INTEGER,
    year INTEGER,
    days REAL,
    FOREIGN KEY(employee_id) REFERENCES employees(id),
    UNIQUE(employee_id, month, year)
  );

  CREATE TABLE IF NOT EXISTS salary_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER,
    old_salary REAL,
    new_salary REAL,
    effective_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module TEXT,
    record_id TEXT,
    old_value TEXT,
    new_value TEXT,
    changed_by TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed Admin User
const seedAdmin = db.prepare("INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)");
seedAdmin.run("admin", "admin123", "Admin");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Helper for audit logging
  function logActivity(module: string, recordId: string, oldVal: any, newVal: any, user: string) {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (module, record_id, old_value, new_value, changed_by)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(module, recordId, JSON.stringify(oldVal), JSON.stringify(newVal), user);
  }

  // API Routes
  app.get("/api/groups", (req, res) => {
    const rows = db.prepare("SELECT * FROM groups").all();
    res.json(rows);
  });

  app.post("/api/groups", (req, res) => {
    const { name, calculation_type, sunday_rule, holiday_rule, user } = req.body;
    const stmt = db.prepare("INSERT INTO groups (name, calculation_type, sunday_rule, holiday_rule) VALUES (?, ?, ?, ?)");
    const info = stmt.run(name, calculation_type, sunday_rule, holiday_rule);
    logActivity("Config", "Group", null, req.body, user);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/groups/:id", (req, res) => {
    db.prepare("DELETE FROM groups WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/attendance/monthly/:month/:year", (req, res) => {
    const { month, year } = req.params;
    const start = format(startOfMonth(new Date(parseInt(year), parseInt(month) - 1)), 'yyyy-MM-dd');
    const end = format(endOfMonth(new Date(parseInt(year), parseInt(month) - 1)), 'yyyy-MM-dd');
    
    const rows = db.prepare("SELECT * FROM attendance WHERE date BETWEEN ? AND ?").all(start, end);
    res.json(rows);
  });

  app.get("/api/employees", (req, res) => {
    const rows = db.prepare(`
      SELECT e.*, 
             COALESCE(g.name, 'Default') as group_name, 
             COALESCE(g.calculation_type, 'Standard') as calculation_type, 
             COALESCE(g.sunday_rule, 'Earned') as sunday_rule, 
             COALESCE(g.holiday_rule, 'Pay') as holiday_rule 
      FROM employees e
      LEFT JOIN groups g ON e.group_id = g.id
    `).all();
    res.json(rows);
  });

  app.get("/api/esi-eligible", (req, res) => {
    const rows = db.prepare("SELECT * FROM employees WHERE esi_enabled = 1").all();
    res.json(rows);
  });

  app.get("/api/logs", (req, res) => {
    const logs = db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50").all();
    res.json(logs);
  });

  app.get("/api/holidays", (req, res) => {
    const rows = db.prepare("SELECT * FROM holidays ORDER BY date ASC").all();
    res.json(rows);
  });

  app.post("/api/holidays", (req, res) => {
    const { date, name, user } = req.body;
    const stmt = db.prepare("INSERT INTO holidays (date, name) VALUES (?, ?)");
    const info = stmt.run(date, name);
    logActivity("Config", "Holiday", null, { date, name }, user);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/holidays/:id", (req, res) => {
    const id = req.params.id;
    db.prepare("DELETE FROM holidays WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/employees/:id/history", (req, res) => {
    const id = req.params.id;
    const advances = db.prepare("SELECT * FROM advances WHERE employee_id = ? ORDER BY date DESC").all(id);
    const payments = db.prepare("SELECT * FROM payments WHERE employee_id = ? ORDER BY date DESC").all(id);
    const revisions = db.prepare("SELECT * FROM salary_revisions WHERE employee_id = ? ORDER BY created_at DESC").all(id);
    const adjustments = db.prepare("SELECT * FROM adjustments WHERE employee_id = ? ORDER BY year DESC, month DESC").all(id);
    const settlements = db.prepare("SELECT * FROM settlements WHERE employee_id = ? ORDER BY date DESC").all(id);
    const logs = db.prepare("SELECT * FROM audit_logs WHERE record_id LIKE ? OR record_id = ? ORDER BY timestamp DESC").all(`${id}-%`, id);
    res.json({ advances, payments, revisions, logs, adjustments, settlements });
  });

  app.post("/api/employees", (req, res) => {
    const { name, doj, monthly_salary, employee_type, shift_type, weekly_off, group_id, esi_enabled, esi_salary } = req.body;
    const stmt = db.prepare(`
      INSERT INTO employees (name, doj, monthly_salary, employee_type, shift_type, weekly_off, group_id, esi_enabled, esi_salary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name, doj, monthly_salary, employee_type, shift_type, weekly_off, group_id, esi_enabled ? 1 : 0, esi_salary || 0);
    logActivity("Employee", info.lastInsertRowid.toString(), null, req.body, "admin");
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/salary-revision", (req, res) => {
    const { employee_id, old_salary, new_salary, effective_date, user } = req.body;
    // Rule: Must be 1st of next month usually, client handles check
    const stmt = db.prepare("INSERT INTO salary_revisions (employee_id, old_salary, new_salary, effective_date) VALUES (?, ?, ?, ?)");
    stmt.run(employee_id, old_salary, new_salary, effective_date);
    
    db.prepare("UPDATE employees SET monthly_salary = ? WHERE id = ?").run(new_salary, employee_id);
    
    logActivity("SalaryRevision", employee_id.toString(), { old_salary }, { new_salary, effective_date }, user);
    res.json({ success: true });
  });

  app.get("/api/employees/:id", (req, res) => {
    const emp = db.prepare(`
      SELECT e.*, 
             COALESCE(g.name, 'Default') as group_name, 
             COALESCE(g.calculation_type, 'Standard') as calculation_type, 
             COALESCE(g.sunday_rule, 'Earned') as sunday_rule, 
             COALESCE(g.holiday_rule, 'Pay') as holiday_rule 
      FROM employees e
      LEFT JOIN groups g ON e.group_id = g.id
      WHERE e.id = ?
    `).get(req.params.id);
    const attendance = db.prepare("SELECT * FROM attendance WHERE employee_id = ?").all(req.params.id);
    const advances = db.prepare("SELECT * FROM advances WHERE employee_id = ?").all(req.params.id);
    const payments = db.prepare("SELECT * FROM payments WHERE employee_id = ?").all(req.params.id);
    const revisions = db.prepare("SELECT * FROM salary_revisions WHERE employee_id = ?").all(req.params.id);
    res.json({ ...emp, attendance, advances, payments, revisions });
  });

  app.get("/api/attendance/:date", (req, res) => {
    const date = req.params.date;
    const rows = db.prepare("SELECT * FROM attendance WHERE date = ?").all(date);
    res.json(rows);
  });

  app.post("/api/attendance", (req, res) => {
    const { records, user } = req.body;
    
    if (records && Array.isArray(records)) {
      const insert = db.prepare(`
        INSERT OR REPLACE INTO attendance (employee_id, date, shift, status, overtime, is_late, modified_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const transaction = db.transaction((recs) => {
        for (const rec of recs) {
          insert.run(rec.employee_id, rec.date, rec.shift, rec.status, rec.overtime, rec.is_late ? 1 : 0, user);
        }
      });
      
      transaction(records);
      logActivity("Attendance", "Batch Update", null, { count: records.length }, user);
      return res.json({ success: true });
    }

    const { employee_id, date, shift, status, overtime, is_late } = req.body;
    
    // Check if day is locked
    const lock = db.prepare("SELECT is_finalized FROM attendance_locks WHERE date = ?").get(date);
    if (lock && lock.is_finalized === 1 && req.body.role !== 'Admin' && req.body.role !== 'Supervisor') {
      return res.status(403).json({ error: "Day is finalized and locked." });
    }

    const existing = db.prepare("SELECT * FROM attendance WHERE employee_id = ? AND date = ? AND shift = ?").get(employee_id, date, shift);
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO attendance (employee_id, date, shift, status, overtime, is_late, modified_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(employee_id, date, shift, status, overtime, is_late ? 1 : 0, user);
    
    logActivity("Attendance", `${employee_id}-${date}-${shift}`, existing || null, req.body, user);
    res.json({ success: true });
  });

  app.post("/api/attendance/lock", (req, res) => {
    const { date, is_finalized, user } = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO attendance_locks (date, is_finalized) VALUES (?, ?)");
    stmt.run(date, is_finalized ? 1 : 0);
    logActivity("AttendanceLock", date, null, { is_finalized }, user);
    res.json({ success: true });
  });

  app.get("/api/attendance/locks", (req, res) => {
    const locks = db.prepare("SELECT * FROM attendance_locks").all();
    res.json(locks);
  });

  app.get("/api/esi-records/:month/:year", (req, res) => {
    const { month, year } = req.params;
    const rows = db.prepare("SELECT * FROM esi_records WHERE month = ? AND year = ?").all(month, year);
    res.json(rows);
  });

  app.post("/api/esi-records", (req, res) => {
    const { records, user } = req.body; // Array of {employee_id, month, year, days}
    const insert = db.prepare(`
      INSERT OR REPLACE INTO esi_records (employee_id, month, year, days)
      VALUES (?, ?, ?, ?)
    `);
    const transaction = db.transaction((recs) => {
      for (const rec of recs) {
        insert.run(rec.employee_id, rec.month, rec.year, rec.days);
      }
    });
    transaction(records);
    logActivity("ESI", "Batch Days Update", null, records, user);
    res.json({ success: true });
  });

  app.post("/api/payments", (req, res) => {
    const { employee_id, date, month, year, amount, user } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO payments (employee_id, date, month, year, amount, entered_by) VALUES (?, ?, ?, ?, ?, ?)");
      const info = stmt.run(employee_id, date, month, year, amount, user);
      logActivity("Payment", info.lastInsertRowid.toString(), null, req.body, user);
      res.json({ id: info.lastInsertRowid });
    } catch (e: any) {
      if (e.message.includes('UNIQUE')) {
        return res.status(400).json({ error: "Payment already exists for this month." });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/advances", (req, res) => {
    const { employee_id, date, amount, type, remarks, schedule, user } = req.body;
    
    if (type === 'Permanent' && schedule && Array.isArray(schedule)) {
      const stmt = db.prepare("INSERT INTO advances (employee_id, date, amount, type, remarks, scheduled_month, scheduled_year) VALUES (?, ?, ?, ?, ?, ?, ?)");
      const transaction = db.transaction((sch) => {
        for (const item of sch) {
          stmt.run(employee_id, date, item.amount, type, remarks, item.month, item.year);
        }
      });
      transaction(schedule);
      logActivity("Advance", "Permanent Schedule", null, req.body, user);
      return res.json({ success: true });
    }

    const stmt = db.prepare("INSERT INTO advances (employee_id, date, amount, type, remarks) VALUES (?, ?, ?, ?, ?)");
    const info = stmt.run(employee_id, date, amount, type, remarks);
    logActivity("Advance", info.lastInsertRowid.toString(), null, req.body, user);
    res.json({ id: info.lastInsertRowid });
  });

  // Batch Payroll Registry
  app.get("/api/payroll-batch/:month/:year", async (req, res) => {
    const { month, year } = req.params;
    const employees = db.prepare(`
      SELECT e.*, 
             COALESCE(g.name, 'Default') as group_name, 
             COALESCE(g.calculation_type, 'Standard') as calculation_type, 
             COALESCE(g.sunday_rule, 'Earned') as sunday_rule, 
             COALESCE(g.holiday_rule, 'Pay') as holiday_rule 
      FROM employees e
      LEFT JOIN groups g ON e.group_id = g.id
    `).all();
    
    const start = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const end = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');
    const daysInMonthCnt = getDaysInMonth(start);

    const batch = await Promise.all(employees.map(async (emp: any) => {
      const attendance = db.prepare("SELECT * FROM attendance WHERE employee_id = ? AND date BETWEEN ? AND ?").all(emp.id, startDate, endDate);
      const holidays = db.prepare("SELECT * FROM holidays WHERE date BETWEEN ? AND ?").all(startDate, endDate);
      const esiRecord = db.prepare("SELECT days FROM esi_records WHERE employee_id = ? AND month = ? AND year = ?").get(emp.id, month, year);
      const esiDays = (esiRecord as any)?.days || 0;

      const advancesSum = db.prepare(`
        SELECT SUM(amount) as total FROM advances 
        WHERE employee_id = ? 
        AND (
          (type = 'Temporary' AND date BETWEEN ? AND ?)
          OR (type = 'Permanent' AND scheduled_month = ? AND scheduled_year = ?)
        )
      `).get(emp.id, startDate, endDate, month, year);
      const totalAdvances = (advancesSum as any).total || 0;

      const isPaid = db.prepare("SELECT amount FROM payments WHERE employee_id = ? AND month = ? AND year = ?").get(emp.id, month, year);
      const perDaySalary = emp.monthly_salary / daysInMonthCnt;

      // Adjustments for the specific month
      const adjustmentsSum = db.prepare(`
        SELECT SUM(amount) as total FROM adjustments 
        WHERE employee_id = ? AND month = ? AND year = ?
      `).get(emp.id, month, year);
      const monthAdjustments = (adjustmentsSum as any).total || 0;

      // Bonuses for the specific month
      const bonusBatchRec = db.prepare(`
        SELECT SUM(amount) as total FROM bonuses 
        WHERE employee_id = ? AND month = ? AND year = ? AND is_approved = 1
      `).get(emp.id, month, year);
      const monthBonuses = (bonusBatchRec as any).total || 0;

      let presentDays = 0;
      let otDays = 0;
      let holidayDays = 0;

      if (emp.holiday_rule === 'Pay') holidayDays = holidays.length;

      const dailyLines: {[key:string]: any[]} = {};
      attendance.forEach(a => { if(!dailyLines[a.date]) dailyLines[a.date] = []; dailyLines[a.date].push(a); });
      
      Object.keys(dailyLines).forEach(date => {
        const logs = dailyLines[date];
        const day = logs.find(l => l.shift === 'Day');
        const night = logs.find(l => l.shift === 'Night');
        
        if ((day?.status === 'Present' || day?.status === 'P') && (night?.status === 'Present' || night?.status === 'P')) {
          presentDays += 1;
          otDays += 1;
        } else {
          logs.forEach(l => {
            let val = 0;
            if (l.status === 'Present' || l.status === 'P') val = 1;
            else if (l.status === 'HalfDay' || l.status === 'HD') val = 0.5;
            if (l.is_late) val = 0.5;
            presentDays += val;
            if (l.overtime === 'Full' || l.status === 'OT') otDays += 1;
            else if (l.overtime === 'Half') otDays += 0.5;
          });
        }
      });

      // Complex Sunday Rule
      let paidSundays = 0;
      const monthInterval = eachDayOfInterval({ start, end });
      const sundays = monthInterval.filter(d => isSunday(d));

      if (emp.sunday_rule === 'Fixed') {
        paidSundays = sundays.length;
      } else if (emp.sunday_rule === 'Earned') {
        sundays.forEach(sun => {
          // Check previous 6 days (Mon-Sat) for current week eligibility
          let workedInWeek = 0;
          for (let i = 1; i <= 6; i++) {
            const checkDay = subDays(sun, i);
            if (isBefore(checkDay, start)) continue;
            const ds = format(checkDay, 'yyyy-MM-dd');
            const dayLogs = dailyLines[ds] || [];
            dayLogs.forEach(l => { if(l.status === 'Present') workedInWeek += 1; else if(l.status === 'HalfDay') workedInWeek += 0.5; });
          }
          if (workedInWeek >= 3) paidSundays++;
        });
      }

      let grossSalary: number;
      let totalPayableDays: number;
      
      if (emp.calculation_type === 'Fixed') {
        // Contractors - full monthly salary minus deductions
        grossSalary = emp.monthly_salary;
        totalPayableDays = daysInMonthCnt;
      } else {
        totalPayableDays = presentDays + otDays + paidSundays + holidayDays;
        grossSalary = totalPayableDays * perDaySalary;
      }
      
      let esiDeduction = 0;
      if (emp.esi_enabled && emp.esi_salary > 0 && esiDays > 0) {
          const esiBasis = (emp.esi_salary / daysInMonthCnt) * esiDays;
          esiDeduction = (esiBasis * 0.0175) + 5;
      }
      
      const payable = grossSalary - esiDeduction - totalAdvances + monthAdjustments + monthBonuses;

      return {
        employeeId: emp.id,
        name: emp.name,
        shift: emp.shift_type,
        group_name: emp.group_name,
        monthly_salary: emp.monthly_salary,
        presentDays,
        otDays,
        holidayDays,
        paidSundays,
        esiDays,
        totalAdvances,
        esiDeduction,
        totalPayableDays,
        grossSalary,
        payableSalary: payable,
        isPaid: !!isPaid,
        paidAmount: (isPaid as any)?.amount || 0
      };
    }));
    res.json(batch);
  });

  // Adjustments Endpoints
  app.get("/api/adjustments/:employeeId/:month/:year", (req, res) => {
    const { employeeId, month, year } = req.params;
    const adjustments = db.prepare("SELECT * FROM adjustments WHERE employee_id = ? AND month = ? AND year = ?").all(employeeId, month, year);
    res.json(adjustments);
  });

  app.post("/api/adjustments", (req, res) => {
    const { employee_id, month, year, amount, description, type } = req.body;
    const result = db.prepare(`
      INSERT INTO adjustments (employee_id, month, year, amount, description, type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(employee_id, month, year, amount, description, type);
    res.json({ id: result.lastInsertRowid });
  });

  // Settlements Endpoints
  app.get("/api/settlements/:employeeId", (req, res) => {
    const { employeeId } = req.params;
    const settlements = db.prepare("SELECT * FROM settlements WHERE employee_id = ? ORDER BY date DESC").all(employeeId);
    res.json(settlements);
  });

  app.post("/api/settlements", (req, res) => {
    const { employee_id, amount, reason } = req.body;
    const result = db.prepare(`
      INSERT INTO settlements (employee_id, amount, reason)
      VALUES (?, ?, ?)
    `).run(employee_id, amount, reason);
    res.json({ id: result.lastInsertRowid });
  });

  // Bonuses Endpoints
  app.get("/api/bonuses", (req, res) => {
    const bonuses = db.prepare(`
      SELECT b.*, e.name as employee_name 
      FROM bonuses b
      JOIN employees e ON b.employee_id = e.id
      ORDER BY b.year DESC, b.month DESC
    `).all();
    res.json(bonuses);
  });

  app.post("/api/bonuses", (req, res) => {
    const { employee_ids, year, month, amount, description } = req.body;
    const insert = db.prepare(`
      INSERT INTO bonuses (employee_id, year, month, amount, description)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    db.transaction(() => {
      employee_ids.forEach((id: number) => {
        insert.run(id, year, month, amount, description);
      });
    })();
    
    res.json({ success: true });
  });

  app.post("/api/bonuses/approve/:id", (req, res) => {
    db.prepare("UPDATE bonuses SET is_approved = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/employees/last-year-earnings/:year", (req, res) => {
    const { year } = req.params;
    const lastYear = parseInt(year) - 1;
    // Note: This is an estimation since we don't have monthly_summaries yet.
    // Better: sum up the payments for last year as a proxy for earnings if we assume all was paid.
    // Or just return blank as requested if not found.
    const result = db.prepare(`
        SELECT employee_id, SUM(amount) as total_earnings
        FROM payments
        WHERE year = ?
        GROUP BY employee_id
    `).all(lastYear);
    res.json(result);
  });

  // Payroll Calculation Endpoint
  app.get("/api/payroll/:employeeId/:month/:year", (req, res) => {
    const { employeeId, month, year } = req.params;
    const start = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const end = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');
    const daysInMonthCnt = getDaysInMonth(start);

    const employee = db.prepare(`
      SELECT e.*, 
             COALESCE(g.name, 'Default') as group_name, 
             COALESCE(g.calculation_type, 'Standard') as calculation_type, 
             COALESCE(g.sunday_rule, 'Earned') as sunday_rule, 
             COALESCE(g.holiday_rule, 'Pay') as holiday_rule 
      FROM employees e
      LEFT JOIN groups g ON e.group_id = g.id
      WHERE e.id = ?
    `).get(employeeId);
    
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    const attendance = db.prepare("SELECT * FROM attendance WHERE employee_id = ? AND date BETWEEN ? AND ?").all(employeeId, startDate, endDate);
    const holidays = db.prepare("SELECT * FROM holidays WHERE date BETWEEN ? AND ?").all(startDate, endDate);
    
    const esiRecord = db.prepare("SELECT days FROM esi_records WHERE employee_id = ? AND month = ? AND year = ?").get(employeeId, month, year);
    const esiDays = (esiRecord as any)?.days || 0;

    const isPaid = db.prepare("SELECT * FROM payments WHERE employee_id = ? AND month = ? AND year = ?").get(employeeId, month, year);

    const advancesSum = db.prepare(`
      SELECT SUM(amount) as total FROM advances 
      WHERE employee_id = ? 
      AND (
        (type = 'Temporary' AND date BETWEEN ? AND ?)
        OR (type = 'Permanent' AND scheduled_month = ? AND scheduled_year = ?)
      )
    `).get(employeeId, startDate, endDate, month, year);
    const totalAdvances = (advancesSum as any).total || 0;

    const pendingAdvances = db.prepare(`
      SELECT SUM(amount) as total FROM advances 
      WHERE employee_id = ? AND is_deducted = 0
    `).get(employeeId);
    const totalPendingAdvances = (pendingAdvances as any).total || 0;

    // Adjustments for the specific month
    const adjustments = db.prepare(`
      SELECT SUM(amount) as total FROM adjustments 
      WHERE employee_id = ? AND month = ? AND year = ?
    `).get(employeeId, month, year);
    const monthAdjustments = (adjustments as any).total || 0;

    // Bonuses for the specific month
    const bonusRec = db.prepare(`
      SELECT SUM(amount) as total FROM bonuses 
      WHERE employee_id = ? AND month = ? AND year = ? AND is_approved = 1
    `).get(employeeId, month, year);
    const monthBonuses = (bonusRec as any).total || 0;
    
    const perDaySalary = employee.monthly_salary / daysInMonthCnt;

    let presentDays = 0;
    let otDays = 0;
    let holidayDays = 0;

    if (employee.holiday_rule === 'Pay') holidayDays = holidays.length;

    const dailyLogs: { [key: string]: any[] } = {};
    attendance.forEach(a => {
      if (!dailyLogs[a.date]) dailyLogs[a.date] = [];
      dailyLogs[a.date].push(a);
    });

    Object.keys(dailyLogs).forEach(date => {
      const dayLogs = dailyLogs[date];
      const dayShift = dayLogs.find(l => l.shift === 'Day');
      const nightShift = dayLogs.find(l => l.shift === 'Night');

      if ((dayShift?.status === 'Present' || dayShift?.status === 'P') && (nightShift?.status === 'Present' || nightShift?.status === 'P')) {
        presentDays += 1;
        otDays += 1;
      } else {
        dayLogs.forEach(log => {
          let dayValue = 0;
          if (log.status === 'Present' || log.status === 'P') dayValue = 1;
          else if (log.status === 'HalfDay' || log.status === 'HD') dayValue = 0.5;
          if (log.is_late) dayValue = 0.5;
          presentDays += dayValue;
          if (log.overtime === 'Full' || log.status === 'OT') otDays += 1;
          else if (log.overtime === 'Half') otDays += 0.5;
        });
      }
    });

    let paidSundays = 0;
    const monthInterval = eachDayOfInterval({ start, end });
    const sundays = monthInterval.filter(d => isSunday(d));

    if (employee.sunday_rule === 'Fixed') {
      paidSundays = sundays.length;
    } else if (employee.sunday_rule === 'Earned') {
      sundays.forEach(sun => {
        let workedInWeek = 0;
        for (let i = 1; i <= 6; i++) {
          const checkDay = subDays(sun, i);
          if (isBefore(checkDay, start)) continue;
          const ds = format(checkDay, 'yyyy-MM-dd');
          const dayLogs = dailyLogs[ds] || [];
          dayLogs.forEach(l => { if(l.status === 'Present') workedInWeek += 1; else if(l.status === 'HalfDay') workedInWeek += 0.5; });
        }
        if (workedInWeek >= 3) paidSundays++;
      });
    }

    let grossSalary: number;
    let totalPayableDays: number;

    if (employee.calculation_type === 'Fixed') {
       grossSalary = employee.monthly_salary;
       totalPayableDays = daysInMonthCnt;
    } else {
       totalPayableDays = presentDays + otDays + paidSundays + holidayDays;
       grossSalary = totalPayableDays * perDaySalary;
    }

    let esiDeduction = 0;
    if (employee.esi_enabled && employee.esi_salary > 0 && esiDays > 0) {
      const esiBasis = (employee.esi_salary / daysInMonthCnt) * esiDays;
      esiDeduction = (esiBasis * 0.0175) + 5;
    }

    const netSalary = grossSalary - esiDeduction - totalAdvances + monthAdjustments + monthBonuses;

    const allPaymentsRec = db.prepare("SELECT SUM(amount) as total FROM payments WHERE employee_id = ?").get(employeeId);
    const totalPaidAllTime = (allPaymentsRec as any).total || 0;
    
    const allSettlementsRec = db.prepare("SELECT SUM(amount) as total FROM settlements WHERE employee_id = ?").get(employeeId);
    const totalSettledAllTime = (allSettlementsRec as any).total || 0;

    res.json({
      presentDays,
      otDays,
      paidSundays,
      holidayDays,
      esiDays,
      totalPayableDays,
      perDaySalary,
      grossSalary,
      esiDeduction,
      totalAdvances,
      monthAdjustments,
      monthBonuses,
      netSalary,
      isPaid: !!isPaid,
      paidAmount: (isPaid as any)?.amount || 0,
      totalPaidAllTime,
      totalSettledAllTime,
      totalPendingAdvances,
      monthlySalary: employee.monthly_salary,
      esiSalary: employee.esi_salary,
      group_name: employee.group_name,
      calculation_mode: employee.calculation_type
    });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
