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
  ChevronDown,
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
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false); // State untuk custom select kategori
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
      const savedBudgets = (await db.getItem('budgets')) || {};
      setBudgets(savedBudgets);

      const allTxns = (await db.getItem('transactions')) || [];
      const now = new Date();
      const monthRange = { start: startOfMonth(now), end: endOfMonth(now) };

      const currentMonthExpenses = allTxns.filter(
        (txn) =>
          txn.type === 'expense' &&
          isWithinInterval(new Date(txn.date), monthRange),
      );

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
    <main className='min-h-screen bg-bg relative overflow-x-hidden font-sans pb-32 md:pb-12 md:pl-32 lg:pl-36 transition-all duration-500'>
      {/* Background Soft Glow */}
      <div className='absolute top-[-5%] left-[-10%] w-64 h-64 md:w-96 md:h-96 lg:w-[40rem] lg:h-[40rem] bg-expense/10 rounded-full mix-blend-multiply filter blur-[80px] lg:blur-[120px] z-0 pointer-events-none'></div>

      <motion.div
        variants={pageVariants}
        initial='hidden'
        animate='visible'
        className='relative z-10 p-6 max-w-md md:max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto'
      >
        {/* HEADER */}
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
            <h1 className='text-xl md:text-2xl font-black text-text-primary tracking-tight'>
              Budget Planner
            </h1>
          </div>
        </header>

        {/* GRID LAYOUT UNTUK DESKTOP */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10'>
          {/* KOLOM KIRI (Summary Card) */}
          <div className='lg:col-span-4 flex flex-col gap-6'>
            <motion.section
              variants={itemVariants}
              className='bg-surface/80 backdrop-blur-xl border border-border p-6 md:p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden transition-colors flex flex-col h-full'
            >
              <div className='relative z-10 flex justify-between items-start mb-6 md:mb-10'>
                <div>
                  <p className='text-[10px] md:text-xs font-bold text-text-secondary uppercase tracking-widest mb-1.5 flex items-center gap-1.5'>
                    <Target className='w-3.5 h-3.5 md:w-4 md:h-4' /> Pengeluaran{' '}
                    {currentMonthName}
                  </p>
                  <h2 className='text-3xl md:text-4xl font-black text-text-primary'>
                    {formatRupiah(totalExpenseMonth)}
                  </h2>
                  <div className='flex items-center gap-2 mt-2 md:mt-3'>
                    <p className='text-xs md:text-sm text-text-secondary font-bold'>
                      Dari Total Limit:{' '}
                      <span className='text-text-primary'>
                        {formatRupiah(totalBudgeted)}
                      </span>
                    </p>
                  </div>
                </div>
                <div className='w-12 h-12 md:w-14 md:h-14 bg-expense/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-expense/20 flex-shrink-0'>
                  <TrendingDown className='w-6 h-6 md:w-7 md:h-7 text-expense' />
                </div>
              </div>

              {/* Global Progress Bar */}
              <div className='relative z-10 mt-auto'>
                <div className='w-full h-3 md:h-4 bg-bg rounded-full overflow-hidden border border-border shadow-inner'>
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${totalExpenseMonth > totalBudgeted ? 'bg-expense' : 'bg-primary'}`}
                    style={{
                      width: `${Math.min(totalBudgeted > 0 ? (totalExpenseMonth / totalBudgeted) * 100 : 0, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className='absolute -bottom-10 -right-10 w-40 h-40 bg-expense/10 rounded-full blur-3xl opacity-50'></div>
            </motion.section>
          </div>

          {/* KOLOM KANAN (Daftar Kategori) */}
          <div className='lg:col-span-8 flex flex-col gap-4'>
            <motion.div
              variants={itemVariants}
              className='flex justify-between items-end mb-2 px-1'
            >
              <h3 className='text-xs md:text-sm font-black text-text-secondary uppercase tracking-widest'>
                Limit Per Kategori
              </h3>
              <span className='text-[10px] md:text-xs font-bold text-text-secondary bg-surface px-2.5 py-1 md:py-1.5 rounded-lg border border-border'>
                Klik untuk edit
              </span>
            </motion.div>

            {/* List Kategori (Grid 2 Kolom di Desktop) */}
            <motion.section
              variants={itemVariants}
              className='grid grid-cols-1 md:grid-cols-2 gap-4'
            >
              {defaultCategories.map((cat) => {
                const limit = budgets[cat.id] || 0;
                const spent = expenses[cat.id] || 0;
                const progress = limit > 0 ? (spent / limit) * 100 : 0;
                const isOverBudget = spent > limit && limit > 0;

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
                  <motion.div
                    key={cat.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setBudgetLimit(limit > 0 ? limit.toString() : '');
                      setIsModalOpen(true);
                    }}
                    className='bg-surface/80 backdrop-blur-md p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-border shadow-sm relative overflow-hidden group transition-all cursor-pointer hover:border-primary/40 hover:shadow-md'
                  >
                    <div className='flex justify-between items-start mb-4 md:mb-5'>
                      <div className='flex items-center gap-3'>
                        <div
                          className={`w-12 h-12 md:w-14 md:h-14 rounded-[1rem] flex items-center justify-center border border-border/50 ${cat.bgSoft}`}
                        >
                          <Icon
                            className={`w-6 h-6 md:w-7 md:h-7 ${cat.text}`}
                          />
                        </div>
                        <div>
                          <h4 className='font-bold text-text-primary text-sm md:text-base mb-0.5'>
                            {cat.label}
                          </h4>
                          {limit === 0 ? (
                            <p className='text-[10px] md:text-xs text-text-secondary font-bold uppercase tracking-wider bg-bg px-2 py-0.5 md:py-1 rounded-md inline-block'>
                              Belum di-set
                            </p>
                          ) : (
                            <p
                              className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${isOverBudget ? 'text-expense' : 'text-text-secondary'}`}
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
                          className={`font-black text-[15px] md:text-lg ${isOverBudget ? 'text-expense' : 'text-text-primary'}`}
                        >
                          {formatRupiah(spent)}
                        </p>
                        <p className='text-[10px] md:text-xs font-bold text-text-secondary'>
                          / {formatRupiah(limit)}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-full h-2.5 md:h-3 rounded-full overflow-hidden flex ${bgColor} shadow-inner`}
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

                    {isOverBudget && (
                      <div className='mt-4 md:mt-5 flex items-center gap-2 text-[10px] md:text-xs font-black text-expense bg-expense/10 p-2.5 md:p-3 rounded-xl border border-expense/20'>
                        <AlertOctagon className='w-4 h-4 shrink-0' /> Overbudget{' '}
                        {formatRupiah(spent - limit)}! Rem blong!
                      </div>
                    )}
                    {limit > 0 && !isOverBudget && progress >= 80 && (
                      <div className='mt-4 md:mt-5 flex items-center gap-2 text-[10px] md:text-xs font-black text-warning bg-warning/10 p-2.5 md:p-3 rounded-xl border border-warning/20'>
                        <AlertOctagon className='w-4 h-4 shrink-0' /> Warning:
                        Udah mau mepet limit bro!
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.section>
          </div>
        </div>
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
              className='fixed inset-x-0 bottom-0 z-[70] bg-surface rounded-t-[2.5rem] md:rounded-t-[3rem] p-6 md:p-8 shadow-2xl border-t border-border max-w-md mx-auto flex flex-col'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6 flex-shrink-0'></div>
              <div className='flex justify-between items-center mb-6'>
                <h3 className='font-black text-xl md:text-2xl text-text-primary flex items-center gap-2'>
                  <Target className='w-6 h-6 md:w-8 md:h-8 text-primary' /> Atur
                  Limit Bulanan
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className='w-8 h-8 md:w-10 md:h-10 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <div className='space-y-4 md:space-y-6 mb-6'>
                {/* CUSTOM UI SELECT CATEGORY */}
                <div
                  onClick={() => setIsCategoryModalOpen(true)}
                  className='bg-bg/50 rounded-[1.5rem] p-4 md:p-5 border border-border cursor-pointer hover:border-primary/50 transition-all flex justify-between items-center group'
                >
                  <div>
                    <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1 group-hover:text-primary transition-colors'>
                      Pilih Kategori
                    </label>
                    <div className='font-bold text-text-primary text-sm md:text-base'>
                      {defaultCategories.find((c) => c.id === selectedCategory)
                        ?.label || 'Pilih Kategori'}
                    </div>
                  </div>
                  <div className='w-8 h-8 md:w-10 md:h-10 bg-surface group-hover:bg-primary/10 rounded-full flex items-center justify-center transition-colors'>
                    <ChevronDown className='w-4 h-4 md:w-5 md:h-5 text-text-secondary group-hover:text-primary transition-colors' />
                  </div>
                </div>

                <div className='bg-bg/50 rounded-[1.5rem] p-4 md:p-5 border border-border focus-within:border-primary transition-colors flex items-center'>
                  <span className='text-2xl md:text-3xl font-black text-text-secondary mr-3'>
                    Rp
                  </span>
                  <div className='w-full'>
                    <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1'>
                      Maksimal Pengeluaran
                    </label>
                    <input
                      type='number'
                      placeholder='0'
                      value={budgetLimit}
                      onChange={(e) => setBudgetLimit(e.target.value)}
                      onKeyDown={(e) => {
                        if (['-', 'e', '+', '.'].includes(e.key))
                          e.preventDefault();
                      }}
                      className='w-full bg-transparent font-black text-xl md:text-2xl outline-none text-text-primary'
                    />
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveBudget}
                className='w-full py-4 md:py-5 bg-gradient-to-r from-primary to-primary-hover text-surface font-black text-base md:text-lg rounded-[1.5rem] md:rounded-[2rem] shadow-[0_10px_20px_rgb(220,198,255,0.4)] dark:shadow-[0_10px_20px_rgb(155,126,222,0.2)] mt-2'
              >
                Simpan Limit
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- MODAL PILIH KATEGORI (REUSABLE) --- */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategoryModalOpen(false)}
              className='fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm'
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[90] bg-surface rounded-t-[2.5rem] md:rounded-t-[3rem] p-6 md:p-8 shadow-2xl border-t border-border max-w-md mx-auto'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6 flex-shrink-0'></div>
              <div className='flex justify-between items-center mb-6'>
                <h3 className='font-black text-xl text-text-primary flex items-center gap-2'>
                  <ShoppingCart className='w-6 h-6 text-primary' /> Pilih
                  Kategori
                </h3>
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className='w-8 h-8 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
              <div className='space-y-3 max-h-[50vh] overflow-y-auto scrollbar-hide pb-4'>
                {defaultCategories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setIsCategoryModalOpen(false);
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-[1.2rem] transition-colors border ${selectedCategory === cat.id ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-bg text-text-primary border-transparent hover:border-border'}`}
                    >
                      <div
                        className={`w-10 h-10 rounded-[1rem] flex items-center justify-center ${cat.bgSoft}`}
                      >
                        <Icon className={`w-5 h-5 ${cat.text}`} />
                      </div>
                      <span className='font-bold text-base'>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
