'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/storage';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Minus,
  PieChart as PieChartIcon,
  Repeat,
  X,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Check,
} from 'lucide-react';
import {
  format,
  subMonths,
  addMonths,
  subWeeks,
  addWeeks,
  subDays,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  isWithinInterval,
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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

export default function Insights() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);

  const [period, setPeriod] = useState('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [isGraphDrawerOpen, setIsGraphDrawerOpen] = useState(false);
  const [isSubsDrawerOpen, setIsSubsDrawerOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const history = (await db.getItem('transactions')) || [];
      setTransactions(history);
    };
    loadData();
  }, []);

  const handlePrev = () => {
    if (period === 'monthly') setCurrentDate(subMonths(currentDate, 1));
    if (period === 'weekly') setCurrentDate(subWeeks(currentDate, 1));
    if (period === 'daily') setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (period === 'monthly') setCurrentDate(addMonths(currentDate, 1));
    if (period === 'weekly') setCurrentDate(addWeeks(currentDate, 1));
    if (period === 'daily') setCurrentDate(addDays(currentDate, 1));
  };

  const getDateRange = (date, periodType) => {
    if (periodType === 'monthly')
      return { start: startOfMonth(date), end: endOfMonth(date) };
    if (periodType === 'weekly')
      return {
        start: startOfWeek(date, { weekStartsOn: 1 }),
        end: endOfWeek(date, { weekStartsOn: 1 }),
      };
    return { start: startOfDay(date), end: endOfDay(date) };
  };

  const currentRange = getDateRange(currentDate, period);
  const prevDate =
    period === 'monthly'
      ? subMonths(currentDate, 1)
      : period === 'weekly'
        ? subWeeks(currentDate, 1)
        : subDays(currentDate, 1);
  const prevRange = getDateRange(prevDate, period);

  const currentPeriodTxns = useMemo(() => {
    return transactions.filter((txn) =>
      isWithinInterval(new Date(txn.date), currentRange),
    );
  }, [transactions, currentRange]);

  const prevPeriodTxns = useMemo(() => {
    return transactions.filter((txn) =>
      isWithinInterval(new Date(txn.date), prevRange),
    );
  }, [transactions, prevRange]);

  const calculateTotals = (txns) => {
    return txns.reduce(
      (acc, curr) => {
        if (curr.type === 'expense') acc.expense += curr.amount;
        if (curr.type === 'income') acc.income += curr.amount;
        return acc;
      },
      { expense: 0, income: 0 },
    );
  };

  const currentTotals = calculateTotals(currentPeriodTxns);
  const prevTotals = calculateTotals(prevPeriodTxns);

  const calcPercentage = (current, prev) => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 100);
  };

  const expensePercentage = calcPercentage(
    currentTotals.expense,
    prevTotals.expense,
  );
  const incomePercentage = calcPercentage(
    currentTotals.income,
    prevTotals.income,
  );

  const categoryData = useMemo(() => {
    const expenses = currentPeriodTxns.filter((t) => t.type === 'expense');
    const grouped = expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {});

    return Object.keys(grouped)
      .map((key) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: grouped[key],
      }))
      .sort((a, b) => b.value - a.value);
  }, [currentPeriodTxns]);

  const topTransactions = useMemo(() => {
    const expenses = currentPeriodTxns
      .filter((txn) => txn.type === 'expense')
      .sort((a, b) => b.amount - a.amount);
    const incomes = currentPeriodTxns
      .filter((txn) => txn.type === 'income')
      .sort((a, b) => b.amount - a.amount);
    return {
      topExpenses: expenses.slice(0, 3),
      topIncomes: incomes.slice(0, 3),
    };
  }, [currentPeriodTxns]);

  const COLORS = [
    '#dcc6ff',
    '#ffd6a5',
    '#f8c8dc',
    '#8ed081',
    '#ff8c8c',
    '#a5b4fc',
    '#ffd166',
  ];

  const activeSubscriptions = useMemo(() => {
    const subsTxns = transactions.filter(
      (t) => t.type === 'expense' && t.category === 'tetap',
    );
    const uniqueSubsMap = new Map();
    subsTxns.forEach((t) => {
      const existing = uniqueSubsMap.get(t.title);
      if (!existing || new Date(t.date) > new Date(existing.date)) {
        uniqueSubsMap.set(t.title, t);
      }
    });
    return Array.from(uniqueSubsMap.values());
  }, [transactions]);

  const projectedMonthlySubs = useMemo(() => {
    return activeSubscriptions.reduce((sum, sub) => {
      let multiplier = 1;
      if (sub.frequency === 'harian') multiplier = 30;
      if (sub.frequency === 'mingguan') multiplier = 4;
      if (sub.frequency === 'tahunan') multiplier = 1 / 12;
      return sum + sub.amount * multiplier;
    }, 0);
  }, [activeSubscriptions]);

  const filteredList = currentPeriodTxns.filter((txn) => {
    const matchSearch = txn.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchDate = selectedDate
      ? format(new Date(txn.date), 'yyyy-MM-dd') === selectedDate
      : true;
    const matchCategory =
      selectedCategory === 'all' || txn.category === selectedCategory;
    return matchSearch && matchDate && matchCategory;
  });

  const formatRupiah = (num) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num || 0);

  const headerDateLabel = () => {
    if (period === 'monthly')
      return format(currentDate, 'MMMM yyyy', { locale: localeId });
    if (period === 'weekly')
      return `${format(currentRange.start, 'dd MMM')} - ${format(currentRange.end, 'dd MMM yyyy', { locale: localeId })}`;
    return format(currentDate, 'dd MMMM yyyy', { locale: localeId });
  };

  const handleExportCSV = () => {
    if (filteredList.length === 0)
      return alert('Belum ada transaksi buat di-export, bestie!');

    const headers = [
      'Tanggal',
      'Nama Transaksi',
      'Kategori',
      'Tipe',
      'Nominal (Rp)',
    ];
    const rows = filteredList.map((txn) => {
      const dateStr = format(new Date(txn.date), 'yyyy-MM-dd');
      const titleClean = `"${txn.title.replace(/"/g, '""')}"`;
      const typeLabel = txn.type === 'expense' ? 'Pengeluaran' : 'Pemasukan';
      return [dateStr, titleClean, txn.category, typeLabel, txn.amount];
    });

    const totalIn = filteredList
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const totalOut = filteredList
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    const netCuan = totalIn - totalOut;

    const summaryRows = [
      ['', '', '', '', ''],
      ['TOTAL PEMASUKAN', '', '', '', totalIn],
      ['TOTAL PENGELUARAN', '', '', '', totalOut],
      ['SISA UANG (SALDO)', '', '', '', netCuan],
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
      ...summaryRows.map((r) => r.join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Laporan_Keuangan_${format(currentDate, 'MMM_yyyy')}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filterOptions = [
    { value: 'all', label: 'Semua Kategori' },
    { value: 'pokok', label: 'Pokok (Needs)' },
    { value: 'keinginan', label: 'Keinginan (Wants)' },
    { value: 'tetap', label: 'Tetap (Rutinitas)' },
    { value: 'tabungan', label: 'Tabungan' },
    { value: 'investasi', label: 'Investasi' },
    { value: 'gaji', label: 'Gaji / Freelance' },
    { value: 'bonus', label: 'Bonus / Hadiah' },
    { value: 'jualan', label: 'Hasil Jualan' },
  ];

  return (
    <main className='min-h-screen bg-bg relative overflow-x-hidden font-sans pb-28 md:pb-12 md:pl-32 lg:pl-36 transition-all duration-500'>
      <div className='absolute top-[-5%] right-[-10%] w-64 h-64 md:w-96 md:h-96 lg:w-[40rem] lg:h-[40rem] bg-primary/20 rounded-full mix-blend-multiply filter blur-[80px] lg:blur-[120px] z-0 pointer-events-none'></div>

      <div className='relative z-10 p-6 max-w-md md:max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto'>
        <motion.div variants={pageVariants} initial='hidden' animate='visible'>
          <header className='flex items-center gap-4 mb-8 pt-2'>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className='w-11 h-11 bg-surface/80 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-sm border border-border transition-colors group'
            >
              <ArrowLeft className='w-5 h-5 text-text-primary group-hover:text-primary transition-colors' />
            </motion.button>
            <h1 className='text-xl md:text-2xl font-black text-text-primary tracking-tight'>
              Analytics
            </h1>
          </header>

          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10'>
            {/* KOLOM KIRI */}
            <div className='lg:col-span-7 xl:col-span-8 flex flex-col gap-6'>
              <motion.div
                variants={itemVariants}
                className='relative flex bg-surface/80 backdrop-blur-sm p-1.5 rounded-[1.5rem] shadow-inner border border-border'
              >
                {['daily', 'weekly', 'monthly'].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPeriod(p);
                      setCurrentDate(new Date());
                    }}
                    className={`relative flex-1 py-3 text-xs md:text-sm font-bold rounded-[1.2rem] z-10 capitalize transition-colors ${period === p ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    {p === 'daily'
                      ? 'Harian'
                      : p === 'weekly'
                        ? 'Mingguan'
                        : 'Bulanan'}
                    {period === p && (
                      <motion.div
                        layoutId='active-period'
                        className='absolute inset-0 bg-surface rounded-[1.2rem] -z-10 shadow-sm border border-border'
                        transition={{
                          type: 'spring',
                          stiffness: 300,
                          damping: 25,
                        }}
                      />
                    )}
                  </button>
                ))}
              </motion.div>

              <motion.div
                variants={itemVariants}
                className='flex items-center justify-between bg-surface/80 backdrop-blur-md p-2 rounded-[1.5rem] border border-border shadow-sm'
              >
                <button
                  onClick={handlePrev}
                  className='w-10 h-10 flex items-center justify-center rounded-[1rem] hover:bg-bg transition-colors text-text-secondary hover:text-primary'
                >
                  <ChevronLeft className='w-5 h-5' />
                </button>
                <p className='font-black text-text-primary text-sm md:text-base tracking-wide'>
                  {headerDateLabel()}
                </p>
                <button
                  onClick={handleNext}
                  className='w-10 h-10 flex items-center justify-center rounded-[1rem] hover:bg-bg transition-colors text-text-secondary hover:text-primary'
                >
                  <ChevronRight className='w-5 h-5' />
                </button>
              </motion.div>

              <motion.section
                variants={itemVariants}
                className='grid grid-cols-2 gap-3 md:gap-5'
              >
                <div className='bg-surface/80 backdrop-blur-xl p-5 md:p-6 rounded-[2rem] border border-border shadow-sm flex flex-col gap-2 hover:-translate-y-1 transition-transform'>
                  <div className='flex justify-between items-start mb-2'>
                    <p className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-wider'>
                      Pemasukan
                    </p>
                    <div
                      className={`flex items-center gap-0.5 text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-md ${incomePercentage > 0 ? 'bg-income/10 text-income' : incomePercentage < 0 ? 'bg-expense/10 text-expense' : 'bg-bg text-text-secondary'}`}
                    >
                      {incomePercentage > 0 ? (
                        <TrendingUp className='w-3 h-3' />
                      ) : incomePercentage < 0 ? (
                        <TrendingDown className='w-3 h-3' />
                      ) : (
                        <Minus className='w-3 h-3' />
                      )}{' '}
                      {Math.abs(incomePercentage)}%
                    </div>
                  </div>
                  <p className='text-xl md:text-3xl font-black text-income truncate'>
                    {formatRupiah(currentTotals.income)}
                  </p>
                </div>

                <div className='bg-surface/80 backdrop-blur-xl p-5 md:p-6 rounded-[2rem] border border-border shadow-sm flex flex-col gap-2 hover:-translate-y-1 transition-transform'>
                  <div className='flex justify-between items-start mb-2'>
                    <p className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-wider'>
                      Pengeluaran
                    </p>
                    <div
                      className={`flex items-center gap-0.5 text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-md ${expensePercentage > 0 ? 'bg-expense/10 text-expense' : expensePercentage < 0 ? 'bg-income/10 text-income' : 'bg-bg text-text-secondary'}`}
                    >
                      {expensePercentage > 0 ? (
                        <TrendingUp className='w-3 h-3' />
                      ) : expensePercentage < 0 ? (
                        <TrendingDown className='w-3 h-3' />
                      ) : (
                        <Minus className='w-3 h-3' />
                      )}{' '}
                      {Math.abs(expensePercentage)}%
                    </div>
                  </div>
                  <p className='text-xl md:text-3xl font-black text-expense truncate'>
                    {formatRupiah(currentTotals.expense)}
                  </p>
                </div>
              </motion.section>

              {/* ACTION BUTTONS (Khusus Mobile/Tablet) */}
              <motion.div
                variants={itemVariants}
                className='grid grid-cols-2 gap-3 lg:hidden'
              >
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setIsGraphDrawerOpen(true)}
                  className='bg-gradient-to-br from-surface to-surface/50 p-4 rounded-[1.5rem] border border-border shadow-sm flex items-center gap-3 hover:border-primary/50 transition-colors group'
                >
                  <div className='w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors'>
                    <PieChartIcon className='w-5 h-5 text-primary' />
                  </div>
                  <span className='text-xs font-bold text-text-primary text-left leading-tight'>
                    Spill
                    <br />
                    Grafik
                  </span>
                </motion.button>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setIsSubsDrawerOpen(true)}
                  className='bg-gradient-to-br from-surface to-surface/50 p-4 rounded-[1.5rem] border border-border shadow-sm flex items-center gap-3 hover:border-investment/50 transition-colors group'
                >
                  <div className='w-10 h-10 bg-investment/10 rounded-full flex items-center justify-center group-hover:bg-investment/20 transition-colors'>
                    <Repeat className='w-5 h-5 text-investment' />
                  </div>
                  <span className='text-xs font-bold text-text-primary text-left leading-tight'>
                    Cek
                    <br />
                    Langganan
                  </span>
                </motion.button>
              </motion.div>

              {/* TOP TRANSACTIONS (Khusus Mobile/Tablet) */}
              <motion.section variants={itemVariants} className='lg:hidden'>
                <h3 className='text-xs font-black text-text-secondary uppercase tracking-widest mb-4 px-1'>
                  High Rollers
                </h3>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='bg-surface/80 p-4 rounded-[1.5rem] border border-border shadow-sm flex flex-col justify-between'>
                    <div className='flex items-center gap-2 mb-3'>
                      <div className='w-6 h-6 bg-income/10 rounded-full flex items-center justify-center'>
                        <ArrowDownRight className='w-3.5 h-3.5 text-income' />
                      </div>
                      <h4 className='text-[10px] font-bold text-text-secondary uppercase tracking-wider'>
                        Top Masuk
                      </h4>
                    </div>
                    {topTransactions.topIncomes[0] ? (
                      <div>
                        <p className='font-bold text-text-primary text-xs truncate mb-1'>
                          {topTransactions.topIncomes[0].title}
                        </p>
                        <p className='text-base font-black text-income truncate'>
                          +{formatRupiah(topTransactions.topIncomes[0].amount)}
                        </p>
                      </div>
                    ) : (
                      <p className='text-xs font-bold text-text-secondary/60 pb-1'>
                        Belum ada data
                      </p>
                    )}
                  </div>
                  <div className='bg-surface/80 p-4 rounded-[1.5rem] border border-border shadow-sm flex flex-col justify-between'>
                    <div className='flex items-center gap-2 mb-3'>
                      <div className='w-6 h-6 bg-expense/10 rounded-full flex items-center justify-center'>
                        <ArrowUpRight className='w-3.5 h-3.5 text-expense' />
                      </div>
                      <h4 className='text-[10px] font-bold text-text-secondary uppercase tracking-wider'>
                        Top Keluar
                      </h4>
                    </div>
                    {topTransactions.topExpenses[0] ? (
                      <div>
                        <p className='font-bold text-text-primary text-xs truncate mb-1'>
                          {topTransactions.topExpenses[0].title}
                        </p>
                        <p className='text-base font-black text-expense truncate'>
                          -{formatRupiah(topTransactions.topExpenses[0].amount)}
                        </p>
                      </div>
                    ) : (
                      <p className='text-xs font-bold text-text-secondary/60 pb-1'>
                        Belum ada data
                      </p>
                    )}
                  </div>
                </div>
              </motion.section>

              {/* HISTORY SECTION */}
              <motion.section variants={itemVariants} className='mt-2 md:mt-4'>
                <div className='flex justify-between items-center mb-4 px-1'>
                  <h3 className='text-xs md:text-sm font-black text-text-primary uppercase tracking-widest'>
                    Riwayat
                  </h3>
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={handleExportCSV}
                      className='flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors border border-primary/20'
                    >
                      <Download className='w-3 h-3 md:w-4 md:h-4' /> CSV
                    </button>
                    <span className='text-[10px] md:text-xs font-bold text-text-secondary bg-surface px-2.5 py-1.5 rounded-lg border border-border'>
                      {filteredList.length} Trx
                    </span>
                  </div>
                </div>

                <div className='flex gap-2 mb-4'>
                  <div className='flex-1 bg-surface/80 flex items-center px-4 py-3 rounded-[1.2rem] md:rounded-[1.5rem] border border-border focus-within:border-primary shadow-sm'>
                    <Search className='w-4 h-4 text-text-secondary mr-2' />
                    <input
                      type='text'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder='Cari transaksi...'
                      className='w-full bg-transparent outline-none text-sm md:text-base font-semibold placeholder:font-normal text-text-primary'
                    />
                  </div>
                  <button
                    onClick={() => setIsFilterDrawerOpen(true)}
                    className='relative bg-surface/80 border border-border rounded-[1.2rem] md:rounded-[1.5rem] flex items-center justify-between px-4 py-3 shadow-sm hover:border-primary/50 gap-2 min-w-[100px] md:min-w-[120px]'
                  >
                    <div className='flex items-center gap-2 overflow-hidden'>
                      <Filter className='w-4 h-4 text-text-secondary shrink-0' />
                      <span className='text-xs md:text-sm font-bold text-text-primary capitalize truncate'>
                        {filterOptions.find(
                          (opt) => opt.value === selectedCategory,
                        )?.label || 'Semua'}
                      </span>
                    </div>
                  </button>
                  <div className='relative bg-surface/80 border border-border rounded-[1.2rem] md:rounded-[1.5rem] flex items-center justify-center px-3 md:px-4 w-12 md:w-16 shadow-sm hover:border-primary/50 group'>
                    <input
                      type='date'
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className='absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10'
                    />
                    <CalendarIcon
                      className={`w-4 h-4 md:w-5 md:h-5 transition-colors ${selectedDate ? 'text-primary' : 'text-text-secondary group-hover:text-primary'}`}
                    />
                  </div>
                </div>

                <div className='space-y-3 md:space-y-4'>
                  <AnimatePresence>
                    {filteredList.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className='text-center py-10 md:py-20 bg-surface/50 rounded-[2rem] border border-border border-dashed'
                      >
                        <p className='text-text-secondary font-bold text-sm md:text-base'>
                          Tidak ada transaksi ditemukan.
                        </p>
                      </motion.div>
                    ) : (
                      filteredList
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((txn, idx) => (
                          <motion.div
                            key={txn.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className='bg-surface/80 p-4 md:p-5 rounded-[1.5rem] border border-border shadow-sm flex justify-between items-center hover:border-primary/50 hover:shadow-md transition-all'
                          >
                            <div className='flex-1 min-w-0 mr-3'>
                              <p className='font-bold text-text-primary text-[15px] md:text-base mb-0.5 md:mb-1 truncate'>
                                {txn.title}
                              </p>
                              <div className='flex items-center gap-2 text-[10px] md:text-xs font-bold text-text-secondary'>
                                <span className='capitalize bg-bg px-2 py-0.5 md:py-1 rounded-md border border-border'>
                                  {txn.category}
                                </span>
                                <span>
                                  {format(new Date(txn.date), 'dd MMM')}
                                </span>
                              </div>
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

            {/* KOLOM KANAN (Khusus Desktop) */}
            <div className='hidden lg:flex lg:col-span-5 xl:col-span-4 flex-col gap-6'>
              {/* NATIVE CHART */}
              <motion.div
                variants={itemVariants}
                className='bg-surface/90 backdrop-blur-xl p-6 rounded-[2.5rem] border border-border shadow-sm'
              >
                <h3 className='font-black text-lg text-text-primary mb-6 flex items-center gap-2'>
                  <PieChartIcon className='w-5 h-5 text-primary' /> Distribusi
                  Kategori
                </h3>
                {categoryData.length > 0 ? (
                  <div className='flex flex-col items-center'>
                    <div className='h-[220px] w-full'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <PieChart>
                          <Pie
                            data={categoryData}
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey='value'
                            stroke='none'
                          >
                            {categoryData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatRupiah(value)}
                            contentStyle={{
                              backgroundColor: 'var(--surface)',
                              borderRadius: '1rem',
                              border: '1px solid var(--border)',
                              fontWeight: 'bold',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className='w-full mt-6 space-y-3 max-h-[300px] overflow-y-auto scrollbar-hide'>
                      {categoryData.map((cat, idx) => (
                        <div
                          key={cat.name}
                          className='flex justify-between items-center bg-bg p-3.5 rounded-2xl border border-border'
                        >
                          <div className='flex items-center gap-3'>
                            <div
                              className='w-3.5 h-3.5 rounded-full'
                              style={{
                                backgroundColor: COLORS[idx % COLORS.length],
                              }}
                            ></div>
                            <span className='font-bold text-text-primary text-sm'>
                              {cat.name}
                            </span>
                          </div>
                          <span className='font-black text-text-primary text-sm'>
                            {formatRupiah(cat.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className='h-[250px] flex flex-col items-center justify-center'>
                    <PieChartIcon className='w-12 h-12 text-border mb-3' />
                    <p className='text-sm font-bold text-text-secondary'>
                      Belum ada pengeluaran.
                    </p>
                  </div>
                )}
              </motion.div>

              {/* NATIVE HIGH ROLLERS */}
              <motion.div
                variants={itemVariants}
                className='bg-surface/90 backdrop-blur-xl p-6 rounded-[2.5rem] border border-border shadow-sm'
              >
                <h3 className='font-black text-lg text-text-primary mb-5 flex items-center gap-2'>
                  Top Transaksi 🔥
                </h3>
                <div className='space-y-6'>
                  <div>
                    <h4 className='text-xs font-bold text-text-secondary uppercase tracking-widest mb-3 flex items-center gap-2'>
                      <ArrowDownRight className='w-4 h-4 text-income' />{' '}
                      Pemasukan Tertinggi
                    </h4>
                    {topTransactions.topIncomes.length > 0 ? (
                      <div className='space-y-3'>
                        {topTransactions.topIncomes.map((txn, idx) => (
                          <div
                            key={idx}
                            className='flex justify-between items-center border-b border-border/50 pb-2 last:border-0 last:pb-0'
                          >
                            <p className='font-bold text-sm text-text-primary truncate mr-2'>
                              {txn.title}
                            </p>
                            <p className='font-black text-income whitespace-nowrap'>
                              +{formatRupiah(txn.amount)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className='text-xs font-bold text-text-secondary/60'>
                        Belum ada pemasukan.
                      </p>
                    )}
                  </div>
                  <div>
                    <h4 className='text-xs font-bold text-text-secondary uppercase tracking-widest mb-3 flex items-center gap-2'>
                      <ArrowUpRight className='w-4 h-4 text-expense' />{' '}
                      Pengeluaran Terbesar
                    </h4>
                    {topTransactions.topExpenses.length > 0 ? (
                      <div className='space-y-3'>
                        {topTransactions.topExpenses.map((txn, idx) => (
                          <div
                            key={idx}
                            className='flex justify-between items-center border-b border-border/50 pb-2 last:border-0 last:pb-0'
                          >
                            <p className='font-bold text-sm text-text-primary truncate mr-2'>
                              {txn.title}
                            </p>
                            <p className='font-black text-expense whitespace-nowrap'>
                              -{formatRupiah(txn.amount)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className='text-xs font-bold text-text-secondary/60'>
                        Belum ada pengeluaran.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* NATIVE SUBSCRIPTIONS */}
              <motion.div
                variants={itemVariants}
                className='bg-surface/90 backdrop-blur-xl p-6 rounded-[2.5rem] border border-border shadow-sm flex flex-col max-h-[400px]'
              >
                <h3 className='font-black text-lg text-text-primary mb-5 flex items-center gap-2'>
                  <Repeat className='w-5 h-5 text-investment' /> Daftar
                  Langganan
                </h3>
                <div className='bg-primary/10 p-5 rounded-[1.5rem] mb-4 border border-primary/20'>
                  <p className='text-[10px] font-black text-text-secondary uppercase tracking-wider mb-1'>
                    Proyeksi Beban Bulanan
                  </p>
                  <h4 className='text-2xl font-black text-text-primary'>
                    {formatRupiah(projectedMonthlySubs)}
                  </h4>
                </div>
                <div className='overflow-y-auto scrollbar-hide space-y-3 flex-1'>
                  {activeSubscriptions.length === 0 ? (
                    <p className='text-sm font-bold text-text-secondary text-center py-4'>
                      Aman, tidak ada tagihan rutin.
                    </p>
                  ) : (
                    activeSubscriptions.map((sub, idx) => (
                      <div
                        key={idx}
                        className='bg-bg border border-border p-4 rounded-2xl flex justify-between items-center'
                      >
                        <div>
                          <p className='font-bold text-text-primary text-sm mb-0.5'>
                            {sub.title}
                          </p>
                          <p className='text-[10px] font-black text-text-secondary uppercase tracking-wider'>
                            Bayar per {sub.frequency}
                          </p>
                        </div>
                        <p className='font-black text-expense text-sm'>
                          -{formatRupiah(sub.amount)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* --- MODALS BAWAH (HANYA MUNCUL DI MOBILE / JIKA DIAKTIFKAN) --- */}

      {/* FILTER KATEGORI (Semua Device) */}
      <AnimatePresence>
        {isFilterDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterDrawerOpen(false)}
              className='fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm'
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[70] bg-surface rounded-t-[2.5rem] p-6 shadow-2xl border-t border-border max-w-md md:max-w-xl mx-auto flex flex-col max-h-[90vh]'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6 flex-shrink-0'></div>
              <div className='flex justify-between items-center mb-6 flex-shrink-0'>
                <h3 className='font-black text-xl text-text-primary flex items-center gap-2'>
                  <Filter className='w-6 h-6 text-primary' /> Filter Kategori
                </h3>
                <button
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className='w-8 h-8 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
              <div className='space-y-2 overflow-y-auto scrollbar-hide pb-4'>
                {filterOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSelectedCategory(opt.value);
                      setIsFilterDrawerOpen(false);
                    }}
                    className={`w-full flex justify-between items-center p-4 rounded-[1.2rem] transition-colors border ${selectedCategory === opt.value ? 'bg-primary/10 border-primary/30 text-primary shadow-sm' : 'bg-bg text-text-primary border-transparent hover:border-border'}`}
                  >
                    <span className='font-bold text-[15px]'>{opt.label}</span>
                    {selectedCategory === opt.value && (
                      <Check className='w-5 h-5 text-primary' />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* GRAFIK KATEGORI (Hanya Mobile/Tablet) */}
      <AnimatePresence>
        {isGraphDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGraphDrawerOpen(false)}
              className='fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm lg:hidden'
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[70] bg-surface rounded-t-[2.5rem] p-6 shadow-2xl border-t border-border max-w-md md:max-w-xl mx-auto flex flex-col max-h-[90vh] lg:hidden'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6 flex-shrink-0'></div>
              <div className='flex justify-between items-center mb-6 flex-shrink-0'>
                <h3 className='font-black text-xl text-text-primary flex items-center gap-2'>
                  <PieChartIcon className='w-6 h-6 text-primary' /> Distribusi
                  Kategori
                </h3>
                <button
                  onClick={() => setIsGraphDrawerOpen(false)}
                  className='w-8 h-8 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
              {categoryData.length > 0 ? (
                <div className='flex flex-col items-center flex-1 overflow-hidden'>
                  <div className='h-56 w-full flex-shrink-0'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey='value'
                          stroke='none'
                        >
                          {categoryData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatRupiah(value)}
                          contentStyle={{
                            backgroundColor: 'var(--surface)',
                            borderRadius: '1rem',
                            border: '1px solid var(--border)',
                            fontWeight: 'bold',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className='w-full mt-6 space-y-3 overflow-y-auto scrollbar-hide pb-4'>
                    {categoryData.map((cat, idx) => (
                      <div
                        key={cat.name}
                        className='flex justify-between items-center bg-bg p-3.5 rounded-[1.2rem] border border-border'
                      >
                        <div className='flex items-center gap-3'>
                          <div
                            className='w-3.5 h-3.5 rounded-full'
                            style={{
                              backgroundColor: COLORS[idx % COLORS.length],
                            }}
                          ></div>
                          <span className='font-bold text-text-primary text-sm'>
                            {cat.name}
                          </span>
                        </div>
                        <span className='font-black text-text-primary text-sm'>
                          {formatRupiah(cat.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className='flex-1 flex flex-col items-center justify-center py-10'>
                  <PieChartIcon className='w-12 h-12 text-border mb-3' />
                  <p className='text-center text-sm font-bold text-text-secondary'>
                    Belum ada pengeluaran periode ini.
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* LANGGANAN (Hanya Mobile/Tablet) */}
      <AnimatePresence>
        {isSubsDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSubsDrawerOpen(false)}
              className='fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm lg:hidden'
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[70] bg-surface rounded-t-[2.5rem] p-6 shadow-2xl border-t border-border max-w-md md:max-w-xl mx-auto flex flex-col max-h-[90vh] lg:hidden'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6 flex-shrink-0'></div>
              <div className='flex justify-between items-center mb-6 flex-shrink-0'>
                <h3 className='font-black text-xl text-text-primary flex items-center gap-2'>
                  <Repeat className='w-6 h-6 text-investment' /> Daftar
                  Langganan
                </h3>
                <button
                  onClick={() => setIsSubsDrawerOpen(false)}
                  className='w-8 h-8 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
              <div className='bg-gradient-to-br from-primary/10 to-transparent p-5 rounded-[2rem] text-text-primary mb-6 flex-shrink-0 border border-primary/20 shadow-sm relative overflow-hidden'>
                <div className='relative z-10'>
                  <p className='text-[10px] font-black text-text-secondary uppercase tracking-wider mb-1'>
                    Proyeksi Beban Bulanan
                  </p>
                  <h4 className='text-2xl font-black text-text-primary'>
                    {formatRupiah(projectedMonthlySubs)}
                  </h4>
                </div>
                <div className='absolute -bottom-6 -right-6 w-24 h-24 bg-primary/20 rounded-full blur-xl'></div>
              </div>
              <div className='overflow-y-auto scrollbar-hide space-y-3 pb-4 flex-1'>
                {activeSubscriptions.length === 0 ? (
                  <div className='text-center py-10'>
                    <p className='text-sm font-bold text-text-secondary'>
                      Aman, tidak ada tagihan rutin terdeteksi.
                    </p>
                  </div>
                ) : (
                  activeSubscriptions.map((sub, idx) => (
                    <div
                      key={idx}
                      className='bg-bg border border-border p-4 rounded-[1.5rem] flex justify-between items-center'
                    >
                      <div>
                        <p className='font-bold text-text-primary text-sm mb-0.5'>
                          {sub.title}
                        </p>
                        <p className='text-[10px] font-black text-text-secondary uppercase tracking-wider'>
                          Bayar per {sub.frequency}
                        </p>
                      </div>
                      <p className='font-black text-expense text-sm'>
                        -{formatRupiah(sub.amount)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
