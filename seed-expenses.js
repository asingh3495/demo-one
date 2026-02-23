const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'expenses.db');
const db = new Database(dbPath);

function getLast12MonthsDates() {
  const now = new Date();
  const dates = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 10);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0'); // should be '10'
    const dateStr = `${year}-${month}-${day}`;
    dates.push({ year, month, dateStr });
  }
  return dates;
}

function main() {
  const dates = getLast12MonthsDates();
  const insert = db.prepare(
    'INSERT OR IGNORE INTO expenses (id, category, amount, date, note, done_by) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const info = [];
  dates.forEach((d, index) => {
    const amount = index % 2 === 0 ? 5000 : 6000;
    const id = `seed-${d.year}-${d.month}`; // stable id so script is idempotent
    const doneBy = index % 2 === 0 ? 'UV' : 'Anamika';
    insert.run(
      id,
      'Seed data',
      amount,
      d.dateStr,
      'Seeded fixed monthly expense',
      doneBy
    );
    info.push({ id, date: d.dateStr, amount, doneBy });
  });

  console.log('Inserted seed expenses (idempotent per month):');
  console.table(info);
}

main();

