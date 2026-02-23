const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// Local SQLite database file (in project directory)
const dbPath = path.join(__dirname, 'expenses.db');
const db = new Database(dbPath);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Lightweight migration: add done_by column if missing
try {
  const cols = db.prepare("PRAGMA table_info(expenses)").all();
  const hasDoneBy = cols.some((c) => c.name === 'done_by');
  if (!hasDoneBy) {
    db.exec('ALTER TABLE expenses ADD COLUMN done_by TEXT');
  }
} catch (e) {
  // Ignore migration errors; app will still work without done_by
}

app.use(cors());
app.use(express.json());

// Serve static files (index.html, styles.css, app.js) from project root
app.use(express.static(__dirname));

// --- API: Expenses (last 12 months stored in SQL) ---

// Get expenses: optional yearMonth (YYYY-MM), or from/to (YYYY-MM) for last 12 months
app.get('/api/expenses', (req, res) => {
  try {
    const { yearMonth, from, to } = req.query;
    let rows;
    if (yearMonth) {
      rows = db.prepare(
        "SELECT id, category, amount, date, note, done_by AS doneBy FROM expenses WHERE strftime('%Y-%m', date) = ? ORDER BY date DESC"
      ).all(yearMonth);
    } else if (from && to) {
      // end of month for to: e.g. 2025-02 -> 2025-02-28
      rows = db.prepare(
        `SELECT id, category, amount, date, note, done_by AS doneBy FROM expenses
         WHERE date >= ? AND date <= date(?, '+1 month', '-1 day')
         ORDER BY date DESC`
      ).all(from + '-01', to + '-01');
    } else {
      rows = db.prepare('SELECT id, category, amount, date, note, done_by AS doneBy FROM expenses ORDER BY date DESC').all();
    }
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add expense
app.post('/api/expenses', (req, res) => {
  try {
    const { id, category, amount, date, note, doneBy } = req.body;
    if (!id || !category || amount == null || !date) {
      return res.status(400).json({ error: 'Missing id, category, amount, or date' });
    }
    const done_by = doneBy || null;
    db.prepare(
      'INSERT INTO expenses (id, category, amount, date, note, done_by) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, category, Number(amount), date, note || null, done_by);
    res.status(201).json({ id, category, amount, date, note: note || null, doneBy: done_by });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update expense (correct past months)
app.put('/api/expenses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { category, amount, date, note, doneBy } = req.body;
    if (!category || amount == null || !date) {
      return res.status(400).json({ error: 'Missing category, amount, or date' });
    }
    const done_by = doneBy || null;
    const stmt = db.prepare(
      'UPDATE expenses SET category = ?, amount = ?, date = ?, note = ?, done_by = ? WHERE id = ?'
    );
    const result = stmt.run(category, Number(amount), date, note || null, done_by, id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ id, category, amount, date, note: note || null, doneBy: done_by });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete expense
app.delete('/api/expenses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM expenses WHERE id = ?');
    const result = stmt.run(id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 12-month expense trend (totals per month from SQL)
app.get('/api/expenses/trend', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT strftime('%Y-%m', date) AS year_month,
             SUM(amount) AS total
      FROM expenses
      WHERE date >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', date)
      ORDER BY year_month ASC
    `);
    const rows = stmt.all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- API: Settings (budget, income) ---

app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = { budget: 0, income: 0 };
    rows.forEach(({ key, value }) => {
      if (key === 'budget') settings.budget = Number(value) || 0;
      if (key === 'income') settings.income = Number(value) || 0;
    });
    res.json(settings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const { budget, income } = req.body;
    const setStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    if (typeof budget !== 'undefined') setStmt.run('budget', String(Math.max(0, Number(budget) || 0)));
    if (typeof income !== 'undefined') setStmt.run('income', String(Math.max(0, Number(income) || 0)));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Expense tracker server running at http://localhost:${PORT}`);
  console.log(`SQLite database: ${dbPath}`);
});
