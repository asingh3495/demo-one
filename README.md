# Monthly Expense Tracker

Track monthly spending, set budget and income, and see a 12‑month trend. **Expenses for the last 12 months are stored in a local SQL database** (SQLite by default).

## Run the app

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the server** (serves the UI and API, uses local SQLite DB)
   ```bash
   npm start
   ```

3. Open **http://localhost:3000** in your browser.

The server creates `expenses.db` in the project folder and uses it for:
- **expenses** – id, category, amount, date, note
- **settings** – budget and income (key/value)

The frontend loads the last 12 months from the API and syncs new/add/delete to the database. If the server is not running, the app falls back to browser storage.

## Using another SQL database

The app uses **SQLite** out of the box. To use MySQL or PostgreSQL on your local machine, you’d replace the `better-sqlite3` usage in `server.js` with a driver for that database and keep the same API (e.g. same routes and response shapes). The schema is a single `expenses` table and a `settings` table.
