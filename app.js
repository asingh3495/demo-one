// Money management quotes
const QUOTES = [
  { text: 'Do not save what is left after spending; spend what is left after saving.', author: 'Warren Buffett' },
  { text: 'A budget is telling your money where to go instead of wondering where it went.', author: 'Dave Ramsey' },
  { text: 'The goal isn’t more money. The goal is living life on your terms.', author: 'Chris Brogan' },
  { text: 'Save a little money each month and at the end of the year you’ll be surprised at how little you have.', author: 'Ernest Haskins' },
  { text: 'Wealth is not about having a lot of money; it’s about having a lot of options.', author: 'Chris Rock' },
  { text: 'Don’t work for money; make it work for you.', author: 'Robert Kiyosaki' },
  { text: 'Small daily improvements over time lead to stunning results.', author: 'Robin Sharma' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { text: 'Beware of little expenses. A small leak will sink a great ship.', author: 'Benjamin Franklin' },
  { text: 'It’s not your salary that makes you rich; it’s your spending habits.', author: 'Charles A. Jaffe' },
  { text: 'Budget: a mathematical confirmation of your suspicions.', author: 'A.A. Latimer' },
  { text: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
  { text: 'The stock market is a device for transferring money from the impatient to the patient.', author: 'Warren Buffett' },
  { text: 'Do not save what is left after spending, but spend what is left after saving.', author: 'Warren Buffett' },
  { text: 'Money is a terrible master but an excellent servant.', author: 'P.T. Barnum' },
];

const STORAGE_KEY = 'expense-tracker-data';
const BUDGET_KEY = 'expense-tracker-budget';
const INCOME_KEY = 'expense-tracker-income';

// Use same origin when served by Express (e.g. http://localhost:3000)
const API_BASE = '';

let currentViewDate = new Date();
let expenses = [];
let monthlyBudget = 0;
let monthlyIncome = 0;
let useApi = false;

// DOM elements
const quoteText = document.getElementById('quoteText');
const quoteAuthor = document.getElementById('quoteAuthor');
const quoteRefresh = document.getElementById('quoteRefresh');
const totalSpentEl = document.getElementById('totalSpent');
const remainingEl = document.getElementById('remaining');
const monthlyIncomeInput = document.getElementById('monthlyIncome');
const monthlyBudgetInput = document.getElementById('monthlyBudget');
const expenseForm = document.getElementById('expenseForm');
const expenseList = document.getElementById('expenseList');
const emptyState = document.getElementById('emptyState');
const currentMonthEl = document.getElementById('currentMonth');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const categoryBreakdownEl = document.getElementById('categoryBreakdown');
const budgetTipsEl = document.getElementById('budgetTips');
const yearTrendListEl = document.getElementById('yearTrendList');

// Helpers
function getYearMonth(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseYearMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

function getLast12MonthsRange() {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  return {
    from: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`,
    to: `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}`,
  };
}

async function loadData() {
  try {
    const { from, to } = getLast12MonthsRange();
    const [expRes, setRes] = await Promise.all([
      fetch(`${API_BASE}/api/expenses?from=${from}&to=${to}`),
      fetch(`${API_BASE}/api/settings`),
    ]);
    if (expRes.ok && setRes.ok) {
      expenses = await expRes.json();
      const settings = await setRes.json();
      monthlyBudget = settings.budget || 0;
      monthlyIncome = settings.income || 0;
      useApi = true;
      return;
    }
  } catch (e) {
    console.warn('API unavailable, using local storage:', e.message);
  }
  useApi = false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    expenses = raw ? JSON.parse(raw) : [];
    const budgetRaw = localStorage.getItem(BUDGET_KEY);
    monthlyBudget = budgetRaw ? Number(budgetRaw) : 0;
    const incomeRaw = localStorage.getItem(INCOME_KEY);
    monthlyIncome = incomeRaw ? Number(incomeRaw) : 0;
  } catch (e) {
    expenses = [];
    monthlyBudget = 0;
    monthlyIncome = 0;
  }
}

function saveDataLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

async function saveBudget() {
  localStorage.setItem(BUDGET_KEY, String(monthlyBudget));
  if (useApi) {
    try {
      await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget: monthlyBudget, income: monthlyIncome }),
      });
    } catch (e) {
      console.warn('Could not sync budget to server:', e.message);
    }
  }
}

async function saveIncome() {
  localStorage.setItem(INCOME_KEY, String(monthlyIncome));
  if (useApi) {
    try {
      await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget: monthlyBudget, income: monthlyIncome }),
      });
    } catch (e) {
      console.warn('Could not sync income to server:', e.message);
    }
  }
}

function showQuote() {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  quoteText.textContent = q.text;
  quoteAuthor.textContent = q.author;
}

function getExpensesForMonth(ym) {
  return expenses.filter((e) => e.date.startsWith(ym));
}

function formatCurrency(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMonthLabel(d) {
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

// Render
function renderSummary(ym) {
  const monthExpenses = getExpensesForMonth(ym);
  const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  totalSpentEl.textContent = formatCurrency(total);
  const remaining = monthlyBudget > 0 ? monthlyBudget - total : 0;
  remainingEl.textContent = formatCurrency(remaining);
  remainingEl.closest('.summary-card.remaining').classList.toggle('over', remaining < 0);
}

function renderCategoryBreakdown(ym) {
  const monthExpenses = getExpensesForMonth(ym);
  const byCategory = {};
  monthExpenses.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });
  const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    categoryBreakdownEl.innerHTML = '';
    return;
  }
  categoryBreakdownEl.innerHTML = entries
    .map(
      ([cat, amt]) =>
        `<span class="category-chip">${cat} <span>${formatCurrency(amt)}</span></span>`
    )
    .join('');
}

function renderExpenseList(ym) {
  const monthExpenses = getExpensesForMonth(ym).sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  if (monthExpenses.length === 0) {
    expenseList.innerHTML = '';
    expenseList.classList.remove('has-items');
    emptyState.classList.add('visible');
    return;
  }
  expenseList.classList.add('has-items');
  emptyState.classList.remove('visible');
  expenseList.innerHTML = monthExpenses
    .map(
      (e) => `
    <li class="expense-item" data-id="${e.id}">
      <div class="expense-info">
        <span class="expense-category">${e.category}</span>
        <div class="expense-meta">
          ${formatDate(e.date)}${e.note ? ` <span class="expense-note">— ${e.note}</span>` : ''}
        </div>
      </div>
      <span class="expense-amount">${formatCurrency(e.amount)}</span>
      <button type="button" class="btn btn-danger expense-actions delete-expense" aria-label="Delete">Delete</button>
    </li>
  `
    )
    .join('');

  expenseList.querySelectorAll('.delete-expense').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('.expense-item').dataset.id;
      if (useApi) {
        try {
          const res = await fetch(`${API_BASE}/api/expenses/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Delete failed');
        } catch (e) {
          console.warn('Could not delete on server:', e.message);
        }
      }
      expenses = expenses.filter((e) => e.id !== id);
      saveDataLocal();
      render();
    });
  });
}

function renderBudgetTips(ym) {
  if (!budgetTipsEl) return;
  const tips = [];
  const monthExpenses = getExpensesForMonth(ym);
  const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const nowYm = getYearMonth(new Date());

  // Generic tips when there is no budget set
  if (!monthlyBudget) {
    tips.push('Set a monthly budget so you can see how today\'s choices affect your savings.');
    if (monthlyIncome) {
      tips.push('Aim to keep expenses at or below 50–60% of your income so you always pay yourself first.');
    } else {
      tips.push('Try saving a fixed amount at the start of the month, then spend what\'s left with intention.');
    }
  } else {
    const remaining = monthlyBudget - total;
    const spentPct = monthlyBudget ? total / monthlyBudget : 0;

    if (ym === nowYm) {
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const daysPassed = today.getDate();
      const daysInMonth = monthEnd.getDate();
      const progressPct = daysPassed / daysInMonth;

      if (spentPct < 0.5 && progressPct > 0.5) {
        tips.push('You\'re spending less than half your budget and the month is halfway through — consider moving a bit more to savings.');
      } else if (spentPct < progressPct) {
        tips.push('You\'re currently spending slower than the month is passing — keep this pace to comfortably stay under budget.');
      } else if (spentPct < 0.8) {
        tips.push('You\'re slightly ahead of an ideal pace. Avoid big impulse buys for the next few days to rebalance.');
      } else if (spentPct <= 1) {
        tips.push('You\'re close to your budget. Press pause on non‑essential spending until bigger fixed bills are paid.');
      } else {
        tips.push('You\'ve crossed your budget. Pick one or two categories to trim for the rest of the month and set a strict daily cap.');
      }
    } else {
      tips.push('Review this month\'s pattern and adjust next month\'s budget or income target to match reality.');
    }

    // Category‑based suggestion
    if (monthExpenses.length > 0) {
      const byCategory = {};
      monthExpenses.forEach((e) => {
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
      });
      const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
      const [topCat, topVal] = entries[0];
      if (topVal / total > 0.4) {
        tips.push(`Most of your spending is in "${topCat}". Planning those purchases in advance can free up room in your budget.`);
      }
    }

    if (remaining > 0) {
      tips.push(`You still have ${formatCurrency(remaining)} left in this month\'s budget — decide in advance what matters most for that amount.`);
    } else if (remaining < 0) {
      tips.push(`You\'re over budget by ${formatCurrency(Math.abs(remaining))}. Consider a no‑spend weekend or delaying a non‑essential purchase.`);
    }
  }

  if (tips.length === 0) {
    tips.push('Start by adding a few expenses and a budget — your personal tips will appear here.');
  }

  budgetTipsEl.innerHTML = tips
    .slice(0, 4)
    .map((t) => `<li>${t}</li>`)
    .join('');
}

function renderYearTrend() {
  if (!yearTrendListEl) return;

  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d);
  }

  const monthData = months.map((d) => {
    const ym = getYearMonth(d);
    const monthExpenses = getExpensesForMonth(ym);
    const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const label = d.toLocaleDateString('en-IN', { month: 'short' });
    let status = '';
    let statusClass = '';
    if (monthlyIncome) {
      const diff = monthlyIncome - total;
      if (diff > 0) {
        status = `Saved ${formatCurrency(diff)}`;
        statusClass = 'under';
      } else if (diff < 0) {
        status = `Over income by ${formatCurrency(Math.abs(diff))}`;
        statusClass = 'over';
      } else {
        status = 'Matched income';
      }
    }
    return { ym, label, total, status, statusClass };
  });

  yearTrendListEl.innerHTML = monthData
    .map(
      (m) => `
      <li class="trend-item">
        <span class="trend-month">${m.label}</span>
        <span class="trend-amount">${formatCurrency(m.total)}</span>
        <span class="trend-status ${m.statusClass}">${m.status}</span>
      </li>
    `
    )
    .join('');
}

function render() {
  const ym = getYearMonth(currentViewDate);
  currentMonthEl.textContent = formatMonthLabel(currentViewDate);
  renderSummary(ym);
  renderCategoryBreakdown(ym);
  renderExpenseList(ym);
   renderBudgetTips(ym);
   renderYearTrend();
}

// Form
function initForm() {
  const today = new Date();
  document.getElementById('date').value = today.toISOString().slice(0, 10);

  monthlyIncomeInput.value = monthlyIncome > 0 ? monthlyIncome : '';
  monthlyIncomeInput.addEventListener('change', () => {
    monthlyIncome = Math.max(0, Number(monthlyIncomeInput.value) || 0);
    saveIncome();
    render();
  });

  monthlyBudgetInput.value = monthlyBudget > 0 ? monthlyBudget : '';
  monthlyBudgetInput.addEventListener('change', () => {
    monthlyBudget = Math.max(0, Number(monthlyBudgetInput.value) || 0);
    saveBudget();
    renderSummary(getYearMonth(currentViewDate));
  });

  expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const category = document.getElementById('category').value;
    const amount = Math.max(0, Number(document.getElementById('amount').value) || 0);
    const date = document.getElementById('date').value;
    const note = document.getElementById('note').value.trim();

    if (!category || amount <= 0 || !date) return;

    const id = crypto.randomUUID();
    const payload = { id, category, amount, date, note: note || null };

    if (useApi) {
      try {
        const res = await fetch(`${API_BASE}/api/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Save failed');
      } catch (err) {
        console.warn('Could not save to server, storing locally:', err.message);
        useApi = false;
      }
    }

    expenses.push(payload);
    saveDataLocal();
    expenseForm.reset();
    document.getElementById('date').value = new Date().toISOString().slice(0, 10);
    render();
  });
}

// Month navigation
function initMonthNav() {
  prevMonthBtn.addEventListener('click', () => {
    currentViewDate.setMonth(currentViewDate.getMonth() - 1);
    render();
  });
  nextMonthBtn.addEventListener('click', () => {
    currentViewDate.setMonth(currentViewDate.getMonth() + 1);
    render();
  });
}

// Init
async function init() {
  await loadData();
  showQuote();
  quoteRefresh.addEventListener('click', showQuote);
  initForm();
  initMonthNav();
  render();
}

init();
