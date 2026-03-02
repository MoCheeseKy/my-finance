'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/storage';
import {
  ArrowLeft,
  Plus,
  X,
  AlertOctagon,
  CheckCircle2,
  Wallet,
  TrendingDown,
} from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export default function BudgetPage() {
  const router = useRouter();

  // -- STATES --
  const [budgets, setBudgets] = useState({}); // format: { pokok: 1500000, keinginan: 500000 }
  const [expenses, setExpenses] = useState({}); // format: { pokok: 1200000, keinginan: 600000 }
  const [totalExpenseMonth, setTotalExpenseMonth] = useState(0);

  // -- MODAL STATES --
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('pokok');
  const [budgetLimit, setBudgetLimit] = useState('');

  const defaultCategories = [
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

  // -- LOAD DATA & HITUNG PENGELUARAN BULAN INI --
  useEffect(() => {
    const loadBudgetData = async () => {
      // 1. Load limit budget yang udah diset user
      const savedBudgets = (await db.getItem('budgets')) || {};
      setBudgets(savedBudgets);

      // 2. Load transaksi, filter cuma bulan ini & tipe expense
      const allTxns = (await db.getItem('transactions')) || [];
      const now = new Date();
      const monthRange = { start: startOfMonth(now), end: endOfMonth(now) };

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
      return alert('Masukin nominal limit yang bener dong! 💸');

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

  return (
    <main className='min-h-screen bg-[#FAFAF9] pb-32 relative'>
      <div className='absolute top-0 left-0 w-full h-56 bg-gradient-to-b from-stone-200/50 to-transparent z-0'></div>

      <div className='relative z-10 p-6 max-w-md mx-auto'>
        <header className='flex items-center gap-4 mb-8 pt-2'>
          <button
            onClick={() => router.back()}
            className='w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-stone-200 hover:bg-stone-50 transition-colors'
          >
            <ArrowLeft className='w-5 h-5 text-stone-800' />
          </button>
          <h1 className='text-xl font-black text-stone-800'>Budget Bulanan</h1>
        </header>

        {/* --- SUMMARY CARD --- */}
        <section className='bg-stone-800 p-6 rounded-[2.5rem] shadow-xl text-white mb-8 relative overflow-hidden'>
          <div className='relative z-10 flex justify-between items-end'>
            <div>
              <p className='text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1'>
                Total Pengeluaran (Bulan Ini)
              </p>
              <h2 className='text-3xl font-black text-white'>
                {formatRupiah(totalExpenseMonth)}
              </h2>
              <p className='text-xs text-stone-400 mt-2 font-bold'>
                Dari Total Budget:{' '}
                <span className='text-stone-200'>
                  {formatRupiah(totalBudgeted)}
                </span>
              </p>
            </div>
            <div className='w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm'>
              <TrendingDown className='w-6 h-6 text-red-400' />
            </div>
          </div>
          <div className='absolute -bottom-10 -right-10 w-32 h-32 bg-stone-700 rounded-full blur-3xl opacity-50'></div>
        </section>

        {/* --- DAFTAR BUDGET PER KATEGORI --- */}
        <section className='space-y-4'>
          <div className='flex justify-between items-end mb-2 px-1'>
            <h3 className='text-[10px] font-black text-stone-400 uppercase tracking-widest'>
              Limit Per Kategori
            </h3>
          </div>

          {defaultCategories.map((cat) => {
            const limit = budgets[cat.id] || 0;
            const spent = expenses[cat.id] || 0;
            const progress = limit > 0 ? (spent / limit) * 100 : 0;
            const isOverBudget = spent > limit && limit > 0;

            // Logic Warna Progress Bar
            let barColor = cat.color;
            if (progress >= 80 && progress <= 100) barColor = 'bg-yellow-500';
            if (isOverBudget) barColor = 'bg-red-500';

            return (
              <div
                key={cat.id}
                className='bg-white p-5 rounded-3xl border border-stone-200 shadow-sm relative overflow-hidden group'
              >
                <div className='flex justify-between items-start mb-4'>
                  <div className='flex items-center gap-3'>
                    <span className='text-2xl'>{cat.icon}</span>
                    <div>
                      <h4 className='font-bold text-stone-800 text-sm'>
                        {cat.label}
                      </h4>
                      {limit === 0 ? (
                        <p className='text-[10px] text-stone-400 font-bold uppercase mt-0.5'>
                          Belum di-set
                        </p>
                      ) : (
                        <p
                          className={`text-[10px] font-bold uppercase mt-0.5 ${isOverBudget ? 'text-red-500' : 'text-stone-400'}`}
                        >
                          {isOverBudget
                            ? 'Sisa: HABIS! '
                            : `Sisa: ${formatRupiah(limit - spent)}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className='text-right'>
                    <p
                      className={`font-black text-sm ${isOverBudget ? 'text-red-500' : 'text-stone-800'}`}
                    >
                      {formatRupiah(spent)}
                    </p>
                    <p className='text-[10px] font-bold text-stone-400'>
                      / {formatRupiah(limit)}
                    </p>
                  </div>
                </div>

                {/* Progress Bar Container */}
                <div className='w-full h-2.5 bg-stone-100 rounded-full overflow-hidden flex'>
                  {limit > 0 ? (
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  ) : (
                    <div className='h-full w-full bg-stone-200/50' />
                  )}
                </div>

                {/* Warning Indicator */}
                {isOverBudget && (
                  <div className='mt-3 flex items-center gap-1.5 text-[10px] font-black text-red-500 bg-red-50 p-2 rounded-xl'>
                    <AlertOctagon className='w-3.5 h-3.5' /> Overbudget{' '}
                    {formatRupiah(spent - limit)}! Rem blong!
                  </div>
                )}
                {limit > 0 && !isOverBudget && progress >= 80 && (
                  <div className='mt-3 flex items-center gap-1.5 text-[10px] font-black text-yellow-600 bg-yellow-50 p-2 rounded-xl'>
                    <AlertOctagon className='w-3.5 h-3.5' /> Warning: Udah mau
                    mepet limit bro!
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>

      {/* --- FLOATING ACTION BUTTON --- */}
      <button
        onClick={() => setIsModalOpen(true)}
        className='fixed bottom-10 right-8 w-16 h-16 bg-stone-800 text-white rounded-full flex items-center justify-center shadow-2xl border-4 border-[#FAFAF9] z-40 hover:scale-110 active:scale-95 transition-all'
      >
        <Plus className='w-8 h-8' strokeWidth={3} />
      </button>

      {/* --- MODAL SET BUDGET --- */}
      {isModalOpen && (
        <div className='fixed inset-0 z-50 flex items-end justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
          <div className='bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10'>
            <div className='flex justify-between items-center mb-6'>
              <h3 className='font-black text-xl text-stone-800'>
                Atur Limit Bulanan
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className='w-8 h-8 bg-stone-50 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='space-y-4 mb-6'>
              <div>
                <label className='text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2 px-1'>
                  Pilih Kategori
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className='w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl font-bold outline-none text-stone-800 appearance-none'
                >
                  {defaultCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className='text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2 px-1'>
                  Maksimal Pengeluaran
                </label>
                <div className='relative'>
                  <span className='absolute left-4 top-1/2 -translate-y-1/2 font-black text-stone-400'>
                    Rp
                  </span>
                  <input
                    type='number'
                    placeholder='0'
                    className='w-full bg-stone-50 border border-stone-200 p-4 pl-10 rounded-2xl font-bold outline-none text-stone-800'
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === '-' ||
                        e.key === 'e' ||
                        e.key === '+' ||
                        e.key === '.'
                      )
                        e.preventDefault();
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveBudget}
              className='w-full bg-stone-800 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-stone-700 active:scale-95 transition-all'
            >
              Simpan Limit
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
