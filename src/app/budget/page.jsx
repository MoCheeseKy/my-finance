'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/storage';
import {
  ArrowLeft,
  X,
  AlertOctagon,
  TrendingDown,
  Target,
  ShoppingCart,
  Coffee,
  PiggyBank,
  TrendingUp,
  Repeat,
} from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

// --- FRAMER MOTION VARIANTS ---
const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
      type: 'spring',
      damping: 20,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

const bottomSheetVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', damping: 25, stiffness: 200 },
  },
  exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } },
};

export default function BudgetPage() {
  const router = useRouter();

  // -- STATES --
  const [budgets, setBudgets] = useState({}); // Format: { pokok: 1500000, keinginan: 500000 }
  const [expenses, setExpenses] = useState({}); // Format: { pokok: 1200000, keinginan: 600000 }
  const [totalExpenseMonth, setTotalExpenseMonth] = useState(0);

  // -- MODAL STATES --
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('pokok');
  const [budgetLimit, setBudgetLimit] = useState('');

  const defaultCategories = [
    {
      id: 'pokok',
      label: 'Pokok (Needs)',
      icon: ShoppingCart,
      color: 'bg-blue-500',
      text: 'text-blue-500',
      bgSoft: 'bg-blue-500/10',
    },
    {
      id: 'keinginan',
      label: 'Keinginan (Wants)',
      icon: Coffee,
      color: 'bg-pink-500',
      text: 'text-pink-500',
      bgSoft: 'bg-pink-500/10',
    },
    {
      id: 'tabungan',
      label: 'Tabungan (Savings)',
      icon: PiggyBank,
      color: 'bg-primary',
      text: 'text-primary',
      bgSoft: 'bg-primary/10',
    },
    {
      id: 'investasi',
      label: 'Investasi',
      icon: TrendingUp,
      color: 'bg-investment',
      text: 'text-investment',
      bgSoft: 'bg-investment/10',
    },
    {
      id: 'tetap',
      label: 'Tetap (Rutinitas)',
      icon: Repeat,
      color: 'bg-orange-500',
      text: 'text-orange-500',
      bgSoft: 'bg-orange-500/10',
    },
  ];

  // -- LOAD DATA & HITUNG PENGELUARAN BULAN INI --
  useEffect(() => {
    const loadBudgetData = async () => {
      // 1. Load limit budget general yang sudah diset user (berlaku terus sampai diubah)
      const savedBudgets = (await db.getItem('budgets')) || {};
      setBudgets(savedBudgets);

      // 2. Load transaksi, filter HANYA bulan ini & tipe expense
      const allTxns = (await db.getItem('transactions')) || [];
      const now = new Date();
      const monthRange = { start: startOfMonth(now), end: endOfMonth(now) };

      // Filter ini yang membuat otomatis "Reset" saat ganti bulan
      const currentMonthExpenses = allTxns.filter(
        (txn) =>
          txn.type === 'expense' &&
          isWithinInterval(new Date(txn.date), monthRange),
      );

      // 3. Kelompokkin total pengeluaran per kategori
      const expenseMap = {};
      let total = 0;
      currentMonthExpenses.forEach((txn) => {
        expenseMap[txn.category] = (expenseMap[txn.category] || 0) + txn.amount;
        total += txn.amount;
      });

      setExpenses(expenseMap);
      setTotalExpenseMonth(total);
    };

    loadBudgetData();
  }, []);

  const formatRupiah = (num) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num || 0);

  // -- ACTIONS --
  const handleSaveBudget = async () => {
    if (!budgetLimit || Number(budgetLimit) <= 0)
      return alert('Masukin nominal limit yang valid! 💸');

    // Update state dan simpan ke local storage dengan format general
    const updatedBudgets = {
      ...budgets,
      [selectedCategory]: Number(budgetLimit),
    };

    await db.setItem('budgets', updatedBudgets);
    setBudgets(updatedBudgets);

    setBudgetLimit('');
    setIsModalOpen(false);
  };

  const totalBudgeted = Object.values(budgets).reduce(
    (sum, val) => sum + val,
    0,
  );
  const currentMonthName = format(new Date(), 'MMMM yyyy', {
    locale: localeId,
  });

  return (
    <main className='min-h-screen bg-bg relative overflow-x-hidden font-sans pb-32'>
      {/* Background Soft Glow */}
      <div className='absolute top-[-5%] right-[-10%] w-64 h-64 bg-expense/10 rounded-full mix-blend-multiply filter blur-[80px] z-0 pointer-events-none'></div>

      <motion.div
        variants={pageVariants}
        initial='hidden'
        animate='visible'
        className='relative z-10 p-6 max-w-md mx-auto'
      >
        <header className='flex justify-between items-center mb-8 pt-2'>
          <div className='flex items-center gap-4'>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className='w-11 h-11 bg-surface/80 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-sm border border-border transition-colors group'
            >
              <ArrowLeft className='w-5 h-5 text-text-primary group-hover:text-primary transition-colors' />
            </motion.button>
            <h1 className='text-xl font-black text-text-primary tracking-tight'>
              Budget Planner
            </h1>
          </div>
        </header>

        {/* --- SUMMARY CARD --- */}
        <motion.section
          variants={itemVariants}
          className='bg-surface/80 backdrop-blur-xl border border-border p-6 rounded-[2.5rem] shadow-sm mb-8 relative overflow-hidden transition-colors'
        >
          <div className='relative z-10 flex justify-between items-end'>
            <div>
              <p className='text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 flex items-center gap-1.5'>
                <Target className='w-3.5 h-3.5' /> Pengeluaran{' '}
                {currentMonthName}
              </p>
              <h2 className='text-3xl font-black text-text-primary'>
                {formatRupiah(totalExpenseMonth)}
              </h2>
              <div className='flex items-center gap-2 mt-2'>
                <p className='text-xs text-text-secondary font-bold'>
                  Dari Total Limit:{' '}
                  <span className='text-text-primary'>
                    {formatRupiah(totalBudgeted)}
                  </span>
                </p>
              </div>
            </div>
            <div className='w-12 h-12 bg-expense/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-expense/20 flex-shrink-0'>
              <TrendingDown className='w-6 h-6 text-expense' />
            </div>
          </div>

          {/* Global Progress Bar */}
          <div className='relative z-10 mt-5'>
            <div className='w-full h-2 bg-bg rounded-full overflow-hidden border border-border'>
              <div
                className={`h-full rounded-full transition-all duration-1000 ${totalExpenseMonth > totalBudgeted ? 'bg-expense' : 'bg-primary'}`}
                style={{
                  width: `${Math.min(totalBudgeted > 0 ? (totalExpenseMonth / totalBudgeted) * 100 : 0, 100)}%`,
                }}
              />
            </div>
          </div>

          <div className='absolute -bottom-10 -right-10 w-32 h-32 bg-expense/10 rounded-full blur-3xl opacity-50'></div>
        </motion.section>

        {/* --- DAFTAR BUDGET PER KATEGORI --- */}
        <motion.section variants={itemVariants} className='space-y-4'>
          <div className='flex justify-between items-end mb-2 px-1'>
            <h3 className='text-[10px] font-black text-text-secondary uppercase tracking-widest'>
              Limit Per Kategori
            </h3>
            <span className='text-[10px] font-bold text-text-secondary bg-surface px-2 py-1 rounded-lg border border-border'>
              Klik untuk edit
            </span>
          </div>

          {defaultCategories.map((cat) => {
            const limit = budgets[cat.id] || 0;
            const spent = expenses[cat.id] || 0;
            const progress = limit > 0 ? (spent / limit) * 100 : 0;
            const isOverBudget = spent > limit && limit > 0;

            // Logic Warna Progress Bar
            let barColor = cat.color;
            let bgColor = cat.bgSoft;
            if (progress >= 80 && progress <= 100) {
              barColor = 'bg-warning';
              bgColor = 'bg-warning/10';
            }
            if (isOverBudget) {
              barColor = 'bg-expense';
              bgColor = 'bg-expense/10';
            }

            const Icon = cat.icon;

            return (
              <div
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setBudgetLimit(limit > 0 ? limit.toString() : '');
                  setIsModalOpen(true);
                }}
                className='bg-surface/80 backdrop-blur-md p-5 rounded-[1.5rem] border border-border shadow-sm relative overflow-hidden group transition-all cursor-pointer hover:border-primary/40 hover:shadow-md'
              >
                <div className='flex justify-between items-start mb-4'>
                  <div className='flex items-center gap-3'>
                    <div
                      className={`w-12 h-12 rounded-[1rem] flex items-center justify-center border border-border/50 ${cat.bgSoft}`}
                    >
                      <Icon className={`w-6 h-6 ${cat.text}`} />
                    </div>
                    <div>
                      <h4 className='font-bold text-text-primary text-sm mb-0.5'>
                        {cat.label}
                      </h4>
                      {limit === 0 ? (
                        <p className='text-[10px] text-text-secondary font-bold uppercase tracking-wider bg-bg px-2 py-0.5 rounded-md inline-block'>
                          Belum di-set
                        </p>
                      ) : (
                        <p
                          className={`text-[10px] font-bold uppercase tracking-wider ${isOverBudget ? 'text-expense' : 'text-text-secondary'}`}
                        >
                          {isOverBudget
                            ? 'HABIS! 🚨'
                            : `Sisa: ${formatRupiah(limit - spent)}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className='text-right'>
                    <p
                      className={`font-black text-[15px] ${isOverBudget ? 'text-expense' : 'text-text-primary'}`}
                    >
                      {formatRupiah(spent)}
                    </p>
                    <p className='text-[10px] font-bold text-text-secondary'>
                      / {formatRupiah(limit)}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div
                  className={`w-full h-2.5 rounded-full overflow-hidden flex ${bgColor}`}
                >
                  {limit > 0 ? (
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  ) : (
                    <div className='h-full w-full bg-border/50' />
                  )}
                </div>

                {/* Warning Indicator */}
                {isOverBudget && (
                  <div className='mt-4 flex items-center gap-2 text-[10px] font-black text-expense bg-expense/10 p-2.5 rounded-xl border border-expense/20'>
                    <AlertOctagon className='w-4 h-4' /> Overbudget{' '}
                    {formatRupiah(spent - limit)}! Rem blong!
                  </div>
                )}
                {limit > 0 && !isOverBudget && progress >= 80 && (
                  <div className='mt-4 flex items-center gap-2 text-[10px] font-black text-warning bg-warning/10 p-2.5 rounded-xl border border-warning/20'>
                    <AlertOctagon className='w-4 h-4' /> Warning: Udah mau mepet
                    limit bro!
                  </div>
                )}
              </div>
            );
          })}
        </motion.section>
      </motion.div>

      {/* --- MODAL SET BUDGET (BOTTOM SHEET) --- */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className='fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm'
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[70] bg-surface rounded-t-[2.5rem] p-6 shadow-2xl border-t border-border max-w-md mx-auto flex flex-col'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6 flex-shrink-0'></div>
              <div className='flex justify-between items-center mb-6'>
                <h3 className='font-black text-xl text-text-primary flex items-center gap-2'>
                  <Target className='w-6 h-6 text-primary' /> Atur Limit Bulanan
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className='w-8 h-8 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <div className='space-y-4 mb-6'>
                <div className='bg-bg/50 rounded-[1.5rem] p-4 border border-border focus-within:border-primary transition-colors'>
                  <label className='text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-2'>
                    Pilih Kategori
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className='w-full bg-transparent font-bold outline-none text-text-primary appearance-none cursor-pointer text-sm'
                  >
                    {defaultCategories.map((cat) => (
                      <option
                        key={cat.id}
                        value={cat.id}
                        className='bg-surface'
                      >
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className='bg-bg/50 rounded-[1.5rem] p-4 border border-border focus-within:border-primary transition-colors flex items-center'>
                  <span className='text-2xl font-black text-text-secondary mr-3'>
                    Rp
                  </span>
                  <div className='w-full'>
                    <label className='text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-1'>
                      Maksimal Pengeluaran
                    </label>
                    <input
                      type='number'
                      placeholder='0'
                      className='w-full bg-transparent font-black text-xl outline-none text-text-primary'
                      value={budgetLimit}
                      onChange={(e) => setBudgetLimit(e.target.value)}
                      onKeyDown={(e) => {
                        if (['-', 'e', '+', '.'].includes(e.key))
                          e.preventDefault();
                      }}
                    />
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveBudget}
                className='w-full py-4 bg-gradient-to-r from-primary to-primary-hover text-surface font-black rounded-[1.5rem] shadow-[0_10px_20px_rgb(220,198,255,0.4)] dark:shadow-[0_10px_20px_rgb(155,126,222,0.2)] mt-2'
              >
                Simpan Limit
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
