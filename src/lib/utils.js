/**
 * Shared utilities for the FinanceKu app.
 * Import from here to avoid duplicate code across pages.
 */

// ─── CURRENCY FORMATTER ───────────────────────────────────────────────────────

/** Format a number to Indonesian Rupiah (IDR) currency string. */
export const formatRupiah = (num) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num || 0);

// ─── TRANSACTION CATEGORIES ──────────────────────────────────────────────────

/** Expense categories shared across the Add and Budget pages. */
export const EXPENSE_CATEGORIES = [
  { id: 'pokok', label: 'Pokok (Needs)', icon: '🍱', color: 'bg-blue-500' },
  {
    id: 'keinginan',
    label: 'Keinginan (Wants)',
    icon: '🛍️',
    color: 'bg-pink-500',
  },
  {
    id: 'tabungan',
    label: 'Tabungan (Savings)',
    icon: '🐷',
    color: 'bg-green-500',
  },
  { id: 'investasi', label: 'Investasi', icon: '📈', color: 'bg-purple-500' },
  {
    id: 'tetap',
    label: 'Tetap (Rutinitas)',
    icon: '🔁',
    color: 'bg-orange-500',
  },
];

/** Income categories shared across the Add page. */
export const INCOME_CATEGORIES = [
  { id: 'uang_jajan', label: 'Uang Jajan / Ortu' },
  { id: 'gaji', label: 'Gaji / Freelance' },
  { id: 'jualan', label: 'Hasil Jualan' },
  { id: 'bonus', label: 'Bonus / Hadiah' },
  { id: 'bunga', label: 'Bunga / Investasi' },
];

// ─── DATE HELPER ─────────────────────────────────────────────────────────────

/** Returns today's date in YYYY-MM-DD format (locale-safe). */
export const todayDateString = () => new Date().toLocaleDateString('en-CA');
