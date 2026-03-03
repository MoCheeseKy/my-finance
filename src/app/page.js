'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, initDummyData } from '@/lib/storage';
import {
  ArrowDownRight,
  ArrowUpRight,
  Target,
  Wallet,
  ReceiptText,
  PiggyBank,
  ChevronRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

export default function Dashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState({
    balance: 0,
    income: 0,
    expense: 0,
    savings: { name: '', target: 1, current: 0 },
  });
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        await initDummyData();
        const balance = await db.getItem('balance');
        const transactionsList = (await db.getItem('transactions')) || [];

        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        let monthlyIncome = 0;
        let monthlyExpense = 0;

        transactionsList.forEach((txn) => {
          const txnDate = new Date(txn.date);
          if (isWithinInterval(txnDate, { start: monthStart, end: monthEnd })) {
            if (txn.type === 'income') monthlyIncome += txn.amount;
            if (txn.type === 'expense') monthlyExpense += txn.amount;
          }
        });

        setData({ balance, income: monthlyIncome, expense: monthlyExpense });
        setRecentTransactions(
          transactionsList
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5),
        );
      } catch (error) {
        console.error('Waduh, gagal nge-load data nih bestie:', error);
      } finally {
        setTimeout(() => setIsLoading(false), 800);
      }
    };
    loadData();
  }, []);

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(number || 0);
  };

  // Modern Loading State
  if (isLoading) {
    return (
      <div className='min-h-screen bg-bg flex flex-col items-center justify-center gap-4'>
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className='w-16 h-16 bg-primary/20 rounded-2xl border-2 border-primary flex items-center justify-center'
        >
          <Sparkles className='text-primary w-8 h-8' />
        </motion.div>
        <p className='text-text-secondary font-medium tracking-wide animate-pulse'>
          Menyiapkan dompetmu...
        </p>
      </div>
    );
  }

  return (
    // md:pl-32 memberikan ruang kosong di sebelah kiri untuk Side Nav di Desktop!
    <main className='min-h-screen bg-bg pb-28 md:pb-12 md:pl-32 lg:pl-36 font-sans selection:bg-primary/30 transition-all duration-500'>
      {/* Responsive Background Blob */}
      <div className='absolute top-[-5%] left-[-5%] w-72 h-72 md:w-96 md:h-96 lg:w-[30rem] lg:h-[30rem] bg-primary/20 rounded-full mix-blend-multiply filter blur-[80px] lg:blur-[120px] opacity-70 z-0 dark:opacity-40 transition-all duration-500'></div>

      <div className='relative z-10 p-6 max-w-md md:max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto'>
        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate='show'
        >
          {/* HEADER */}
          <motion.header
            variants={itemVariants}
            className='flex justify-between items-center mb-8 pt-2'
          >
            <div className='flex items-center gap-4'>
              <div className='relative w-14 h-14 md:w-16 md:h-16 bg-surface rounded-[1.2rem] shadow-sm border border-border flex items-center justify-center text-2xl md:text-3xl overflow-hidden group transition-all duration-300'>
                <div className='absolute inset-0 bg-primary/10 group-hover:bg-primary/20 transition-colors'></div>
                👩‍💻
              </div>
              <div>
                <h1 className='text-xs md:text-sm text-text-secondary font-semibold uppercase tracking-wider mb-0.5 md:mb-1'>
                  Welcome Back
                </h1>
                <h2 className='text-2xl md:text-3xl font-black tracking-tight text-text-primary leading-none'>
                  Bossque! <span className='text-primary'>✨</span>
                </h2>
              </div>
            </div>
          </motion.header>

          {/* GRID LAYOUT (Responsive Desktop) */}
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10'>
            {/* KOLOM KIRI (Hero, Fitur, dll) */}
            <div className='lg:col-span-7 xl:col-span-8 flex flex-col gap-6'>
              <motion.section
                variants={itemVariants}
                className='group cursor-pointer'
                onClick={() => router.push('/balance-accounts')}
              >
                <div className='relative overflow-hidden bg-gradient-to-br from-primary to-primary-hover p-7 md:p-10 rounded-[2.5rem] shadow-[0_15px_35px_rgb(220,198,255,0.4)] dark:shadow-[0_15px_35px_rgb(155,126,222,0.2)] transition-transform duration-300 group-hover:scale-[1.02]'>
                  <div className='absolute -right-8 -top-8 w-40 h-40 md:w-60 md:h-60 bg-white/20 rounded-full blur-2xl'></div>
                  <div className='absolute right-6 top-6 md:right-8 md:top-8 w-12 h-12 md:w-16 md:h-16 bg-white/30 backdrop-blur-md rounded-2xl md:rounded-3xl flex items-center justify-center shadow-inner'>
                    <Wallet className='w-6 h-6 md:w-8 md:h-8 text-stone-900' />
                  </div>

                  <p className='text-stone-800/80 font-semibold text-sm md:text-base mb-2 md:mb-4 relative z-10'>
                    Total Saldo
                  </p>
                  <h2 className='text-4xl md:text-6xl font-black text-stone-900 drop-shadow-sm truncate w-full relative z-10 mb-1'>
                    {formatRupiah(data.balance)}
                  </h2>
                </div>
              </motion.section>

              {/* INCOME & EXPENSE */}
              <motion.section
                variants={itemVariants}
                className='grid grid-cols-2 gap-4'
              >
                <div className='bg-surface/80 backdrop-blur-xl p-5 md:p-6 rounded-[2rem] border border-border shadow-sm flex flex-col gap-3 transition-transform hover:-translate-y-1'>
                  <div className='w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-income/10 flex items-center justify-center'>
                    <ArrowDownRight className='text-income w-5 h-5 md:w-6 md:h-6 stroke-[3]' />
                  </div>
                  <div>
                    <span className='text-xs md:text-sm text-text-secondary font-bold'>
                      Pemasukan
                    </span>
                    <p className='text-lg md:text-2xl font-black text-text-primary truncate mt-0.5 md:mt-1'>
                      {formatRupiah(data.income)}
                    </p>
                  </div>
                </div>

                <div className='bg-surface/80 backdrop-blur-xl p-5 md:p-6 rounded-[2rem] border border-border shadow-sm flex flex-col gap-3 transition-transform hover:-translate-y-1'>
                  <div className='w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-expense/10 flex items-center justify-center'>
                    <ArrowUpRight className='text-expense w-5 h-5 md:w-6 md:h-6 stroke-[3]' />
                  </div>
                  <div>
                    <span className='text-xs md:text-sm text-text-secondary font-bold'>
                      Pengeluaran
                    </span>
                    <p className='text-lg md:text-2xl font-black text-text-primary truncate mt-0.5 md:mt-1'>
                      {formatRupiah(data.expense)}
                    </p>
                  </div>
                </div>
              </motion.section>

              {/* QUICK FEATURES */}
              <motion.section variants={itemVariants} className='mb-2'>
                <div className='flex justify-between items-end mb-4'>
                  <h3 className='text-lg md:text-xl font-black text-text-primary'>
                    Eksplorasi
                  </h3>
                </div>
                <div className='grid grid-cols-4 gap-3 md:gap-5'>
                  {[
                    {
                      label: 'Nabung',
                      icon: PiggyBank,
                      color: 'text-primary',
                      bg: 'bg-primary/10',
                      path: '/savings',
                    },
                    {
                      label: 'Split',
                      icon: ReceiptText,
                      color: 'text-orange-500',
                      bg: 'bg-orange-500/10',
                      path: '/split-bill',
                    },
                    {
                      label: 'Invest',
                      icon: TrendingUp,
                      color: 'text-investment',
                      bg: 'bg-investment/10',
                      path: '/investment',
                    },
                    {
                      label: 'Budget',
                      icon: Target,
                      color: 'text-income',
                      bg: 'bg-income/10',
                      path: '/budget',
                    },
                  ].map((feature, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => router.push(feature.path)}
                      className='flex flex-col items-center gap-2 group'
                    >
                      <div
                        className={`w-14 h-14 md:w-20 md:h-20 ${feature.bg} rounded-[1.2rem] md:rounded-[1.5rem] flex items-center justify-center border border-transparent group-hover:border-border transition-all`}
                      >
                        <feature.icon
                          className={`w-6 h-6 md:w-8 md:h-8 ${feature.color}`}
                        />
                      </div>
                      <span className='text-[11px] md:text-xs font-semibold text-text-secondary group-hover:text-text-primary transition-colors mt-1'>
                        {feature.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.section>
            </div>

            {/* KOLOM KANAN (Riwayat Transaksi Khusus Desktop) */}
            <div className='lg:col-span-5 xl:col-span-4 mt-8 lg:mt-0'>
              <motion.section
                variants={itemVariants}
                className='bg-surface/50 backdrop-blur-md rounded-[2.5rem] p-6 md:p-8 border border-border h-full flex flex-col shadow-sm'
              >
                <div className='flex justify-between items-center mb-6'>
                  <h3 className='text-lg md:text-xl font-black text-text-primary'>
                    Riwayat Transaksi
                  </h3>
                  <button
                    onClick={() => router.push('/insight')}
                    className='text-xs font-bold text-primary hover:text-primary-hover flex items-center bg-primary/10 px-3 py-1.5 rounded-full transition-colors'
                  >
                    Semua <ChevronRight className='w-3 h-3 ml-1 stroke-[3]' />
                  </button>
                </div>

                <div className='space-y-3 md:space-y-4 flex-1'>
                  <AnimatePresence>
                    {recentTransactions.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className='text-center py-12 md:py-20 h-full flex flex-col justify-center border border-border border-dashed rounded-[2rem]'
                      >
                        <p className='text-text-secondary font-bold text-sm md:text-base'>
                          Masih sepi nih dompetnya 👻
                        </p>
                      </motion.div>
                    ) : (
                      recentTransactions.map((txn, index) => (
                        <motion.div
                          key={txn.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.02 }}
                          className='bg-surface/90 backdrop-blur-xl p-4 md:p-5 rounded-[1.5rem] border border-border shadow-sm flex items-center gap-4 cursor-pointer'
                        >
                          <div
                            className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${txn.type === 'expense' ? 'bg-expense/10 text-expense' : 'bg-income/10 text-income'}`}
                          >
                            {txn.type === 'expense' ? (
                              <ArrowUpRight className='w-6 h-6 md:w-7 md:h-7' />
                            ) : (
                              <ArrowDownRight className='w-6 h-6 md:w-7 md:h-7' />
                            )}
                          </div>

                          <div className='flex-1 min-w-0'>
                            <p className='font-bold text-text-primary text-[15px] md:text-base mb-0.5 truncate'>
                              {txn.title}
                            </p>
                            <span className='inline-block text-[10px] md:text-xs font-bold text-text-secondary uppercase tracking-wider bg-bg px-2 py-0.5 md:py-1 rounded-md mt-1'>
                              {txn.category}
                            </span>
                          </div>

                          <p
                            className={`font-black text-[15px] md:text-lg whitespace-nowrap ${txn.type === 'expense' ? 'text-expense' : 'text-income'}`}
                          >
                            {txn.type === 'expense' ? '-' : '+'}
                            {formatRupiah(txn.amount)}
                          </p>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </motion.section>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
