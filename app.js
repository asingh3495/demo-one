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

let currentViewDate = new Date();
let expenses = [];
let monthlyBudget = 0;

// DOM elements
const quoteText = document.getElementById('quoteText');
const quoteAuthor = document.getElementById('quoteAuthor');
const quoteRefresh = document.getElementById('quoteRefresh');
const totalSpentEl = document.getElementById('totalSpent');
const remainingEl = document.getElementById('remaining');
const monthlyBudgetInput = document.getElementById('monthlyBudget');
const expenseForm = document.getElementById('expenseForm');
const expenseList = document.getElementById('expenseList');
const emptyState = document.getElementById('emptyState');
const currentMonthEl = document.getElementById('currentMonth');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const categoryBreakdownEl = document.getElementById('categoryBreakdown');

// Helpers
function getYearMonth(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseYearMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    expenses = raw ? JSON.parse(raw) : [];
    const budgetRaw = localStorage.getItem(BUDGET_KEY);
    monthlyBudget = budgetRaw ? Number(budgetRaw) : 0;
  } catch (e) {
    expenses = [];
    monthlyBudget = 0;
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function saveBudget() {
  localStorage.setItem(BUDGET_KEY, String(monthlyBudget));
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
    btn.addEventListener('click', () => {
      const id = btn.closest('.expense-item').dataset.id;
      expenses = expenses.filter((e) => e.id !== id);
      saveData();
      render();
    });
  });
}

function render() {
  const ym = getYearMonth(currentViewDate);
  currentMonthEl.textContent = formatMonthLabel(currentViewDate);
  renderSummary(ym);
  renderCategoryBreakdown(ym);
  renderExpenseList(ym);
}

// Form
function initForm() {
  const today = new Date();
  document.getElementById('date').value = today.toISOString().slice(0, 10);

  monthlyBudgetInput.value = monthlyBudget > 0 ? monthlyBudget : '';
  monthlyBudgetInput.addEventListener('change', () => {
    monthlyBudget = Math.max(0, Number(monthlyBudgetInput.value) || 0);
    saveBudget();
    renderSummary(getYearMonth(currentViewDate));
  });

  expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const category = document.getElementById('category').value;
    const amount = Math.max(0, Number(document.getElementById('amount').value) || 0);
    const date = document.getElementById('date').value;
    const note = document.getElementById('note').value.trim();

    if (!category || amount <= 0 || !date) return;

    expenses.push({
      id: crypto.randomUUID(),
      category,
      amount,
      date,
      note: note || null,
    });
    saveData();
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
function init() {
  loadData();
  showQuote();
  quoteRefresh.addEventListener('click', showQuote);
  initForm();
  initMonthNav();
  render();
}

init();
