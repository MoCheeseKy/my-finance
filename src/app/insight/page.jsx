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

export default function Insights() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);

  const [period, setPeriod] = useState('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const [isGraphDrawerOpen, setIsGraphDrawerOpen] = useState(false);
  const [isSubsDrawerOpen, setIsSubsDrawerOpen] = useState(false);

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

  const COLORS = [
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#3b82f6',
    '#a855f7',
    '#ec4899',
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
    return matchSearch && matchDate;
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
    if (filteredList.length === 0) {
      return alert('Belum ada transaksi buat di-export, bestie! 😅');
    }

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
    const fileName = `Laporan_Keuangan_${format(currentDate, 'MMM_yyyy')}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className='min-h-screen bg-[#FAFAF9] pb-28 relative'>
      <div className='absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-stone-200/50 to-transparent z-0'></div>

      <div className='relative z-10 p-6 max-w-md mx-auto'>
        <header className='flex items-center gap-4 mb-6 pt-2'>
          <button
            onClick={() => router.back()}
            className='w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-stone-200 hover:bg-stone-50 transition-colors'
          >
            <ArrowLeft className='w-5 h-5 text-stone-800' />
          </button>
          <h1 className='text-xl font-black text-stone-800'>Analytics 📊</h1>
        </header>

        <div className='flex bg-white p-1.5 rounded-[1.25rem] shadow-sm border border-stone-200 mb-6'>
          {['daily', 'weekly', 'monthly'].map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p);
                setCurrentDate(new Date());
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl capitalize transition-all ${period === p ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-400 hover:bg-stone-50'}`}
            >
              {p === 'daily'
                ? 'Harian'
                : p === 'weekly'
                  ? 'Mingguan'
                  : 'Bulanan'}
            </button>
          ))}
        </div>

        <div className='flex items-center justify-between bg-white p-4 rounded-3xl border border-stone-200 shadow-sm mb-6'>
          <button
            onClick={handlePrev}
            className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-600'
          >
            <ChevronLeft className='w-5 h-5' />
          </button>
          <p className='font-black text-stone-800 text-sm'>
            {headerDateLabel()}
          </p>
          <button
            onClick={handleNext}
            className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-600'
          >
            <ChevronRight className='w-5 h-5' />
          </button>
        </div>

        <section className='bg-white p-5 rounded-3xl border border-stone-200 shadow-sm mb-6 space-y-4'>
          <div className='flex justify-between items-center border-b border-stone-100 pb-4'>
            <div>
              <p className='text-[10px] font-black text-stone-400 uppercase tracking-wider mb-1'>
                Pemasukan
              </p>
              <div
                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg inline-flex ${incomePercentage > 0 ? 'bg-green-100 text-green-600' : incomePercentage < 0 ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-600'}`}
              >
                {incomePercentage > 0 ? (
                  <TrendingUp className='w-3 h-3' />
                ) : incomePercentage < 0 ? (
                  <TrendingDown className='w-3 h-3' />
                ) : (
                  <Minus className='w-3 h-3' />
                )}
                {Math.abs(incomePercentage)}%
              </div>
            </div>
            <p className='text-2xl font-black text-green-500 truncate max-w-[55%] text-right'>
              {formatRupiah(currentTotals.income)}
            </p>
          </div>

          <div className='flex justify-between items-center'>
            <div>
              <p className='text-[10px] font-black text-stone-400 uppercase tracking-wider mb-1'>
                Pengeluaran
              </p>
              <div
                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg inline-flex ${expensePercentage > 0 ? 'bg-red-100 text-red-600' : expensePercentage < 0 ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-600'}`}
              >
                {expensePercentage > 0 ? (
                  <TrendingUp className='w-3 h-3' />
                ) : expensePercentage < 0 ? (
                  <TrendingDown className='w-3 h-3' />
                ) : (
                  <Minus className='w-3 h-3' />
                )}
                {Math.abs(expensePercentage)}%
              </div>
            </div>
            <p className='text-2xl font-black text-red-500 truncate max-w-[55%] text-right'>
              {formatRupiah(currentTotals.expense)}
            </p>
          </div>
        </section>

        <div className='grid grid-cols-2 gap-3 mb-8'>
          <button
            onClick={() => setIsGraphDrawerOpen(true)}
            className='bg-white p-4 rounded-3xl border border-stone-200 shadow-sm flex flex-col items-center justify-center gap-2 hover:border-stone-400 transition-colors'
          >
            <div className='w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center'>
              <PieChartIcon className='w-5 h-5 text-blue-500' />
            </div>
            <span className='text-xs font-bold text-stone-600'>
              Spill Grafik
            </span>
          </button>
          <button
            onClick={() => setIsSubsDrawerOpen(true)}
            className='bg-white p-4 rounded-3xl border border-stone-200 shadow-sm flex flex-col items-center justify-center gap-2 hover:border-stone-400 transition-colors'
          >
            <div className='w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center'>
              <Repeat className='w-5 h-5 text-purple-500' />
            </div>
            <span className='text-xs font-bold text-stone-600'>Langganan</span>
          </button>
        </div>

        <section>
          <div className='flex justify-between items-end mb-4 px-1'>
            <h3 className='text-sm font-black text-stone-800 uppercase tracking-wider'>
              Riwayat
            </h3>

            <div className='flex items-center gap-2'>
              <button
                onClick={handleExportCSV}
                className='flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-100'
              >
                <Download className='w-3 h-3' /> Export
              </button>
              <span className='text-xs font-bold text-stone-500 bg-stone-200 px-2 py-1.5 rounded-lg'>
                {filteredList.length} Trx
              </span>
            </div>
          </div>

          <div className='flex gap-2 mb-4'>
            <div className='flex-1 bg-white flex items-center px-4 py-3 rounded-2xl border border-stone-200 focus-within:border-stone-800 transition-colors'>
              <Search className='w-4 h-4 text-stone-400 mr-2' />
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Cari nama transaksi...'
                className='w-full bg-transparent outline-none text-sm font-bold placeholder:font-normal text-stone-800'
              />
            </div>

            <div className='relative bg-white border border-stone-200 rounded-2xl flex items-center justify-center px-4 hover:bg-stone-50 transition-colors'>
              <input
                type='date'
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className='absolute inset-0 opacity-0 cursor-pointer w-full h-full'
              />
              <CalendarIcon
                className={`w-5 h-5 ${selectedDate ? 'text-stone-800' : 'text-stone-400'}`}
              />
            </div>
          </div>

          <div className='space-y-3'>
            {filteredList.length === 0 ? (
              <div className='text-center py-10 bg-white rounded-3xl border border-stone-200 border-dashed'>
                <p className='text-stone-400 font-bold text-sm'>
                  Kosong nih bestie 🕵️‍♂️
                </p>
              </div>
            ) : (
              filteredList
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((txn) => (
                  <div
                    key={txn.id}
                    className='bg-white p-4 rounded-3xl border border-stone-200 shadow-sm flex justify-between items-center hover:border-stone-300 transition-all'
                  >
                    <div className='flex-1 min-w-0 mr-3'>
                      <p className='font-bold text-stone-800 text-sm mb-1 truncate'>
                        {txn.title}
                      </p>
                      <div className='flex gap-2 text-[10px] font-bold text-stone-400'>
                        <span className='capitalize'>{txn.category}</span> •{' '}
                        <span>{format(new Date(txn.date), 'dd MMM')}</span>
                      </div>
                    </div>
                    <p
                      className={`font-black text-sm whitespace-nowrap ${txn.type === 'expense' ? 'text-red-500' : txn.type === 'income' ? 'text-green-500' : 'text-stone-800'}`}
                    >
                      {txn.type === 'expense'
                        ? '-'
                        : txn.type === 'income'
                          ? '+'
                          : ''}
                      {formatRupiah(txn.amount)}
                    </p>
                  </div>
                ))
            )}
          </div>
        </section>
      </div>

      {/* =========================================
          DRAWER GRAFIK KATEGORI 
      ========================================= */}
      {isGraphDrawerOpen && (
        <div className='fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
          <div className='bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300'>
            <div className='flex justify-between items-center mb-6'>
              <h3 className='font-black text-xl text-stone-800'>
                Distribusi Kategori 📊
              </h3>
              <button
                onClick={() => setIsGraphDrawerOpen(false)}
                className='w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            {categoryData.length > 0 ? (
              <div className='flex flex-col items-center'>
                <div className='h-56 w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey='value'
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            stroke='transparent'
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatRupiah(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className='w-full mt-4 space-y-3 max-h-[30vh] overflow-y-auto scrollbar-hide'>
                  {categoryData.map((cat, idx) => (
                    <div
                      key={cat.name}
                      className='flex justify-between items-center bg-stone-50 p-3 rounded-2xl'
                    >
                      <div className='flex items-center gap-3'>
                        <div
                          className='w-4 h-4 rounded-full'
                          style={{
                            backgroundColor: COLORS[idx % COLORS.length],
                          }}
                        ></div>
                        <span className='font-bold text-stone-700 text-sm'>
                          {cat.name}
                        </span>
                      </div>
                      <span className='font-black text-stone-800'>
                        {formatRupiah(cat.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className='text-center text-sm font-bold text-stone-400 py-10'>
                Belum ada pengeluaran periode ini 💸
              </p>
            )}
          </div>
        </div>
      )}

      {/* =========================================
          DRAWER LANGGANAN
      ========================================= */}
      {isSubsDrawerOpen && (
        <div className='fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
          <div className='bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 flex flex-col max-h-[85vh]'>
            <div className='flex justify-between items-center mb-6 flex-shrink-0'>
              <h3 className='font-black text-xl text-stone-800'>
                Daftar Langganan 🔁
              </h3>
              <button
                onClick={() => setIsSubsDrawerOpen(false)}
                className='w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='bg-stone-800 p-5 rounded-3xl text-white mb-6 flex-shrink-0 relative overflow-hidden'>
              <div className='relative z-10'>
                <p className='text-[10px] font-bold text-stone-300 uppercase tracking-wider mb-1'>
                  Proyeksi Beban Bulanan
                </p>
                <h4 className='text-2xl font-black text-white'>
                  {formatRupiah(projectedMonthlySubs)}
                </h4>
              </div>
              <div className='absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl'></div>
            </div>

            <div className='overflow-y-auto scrollbar-hide space-y-3 pb-4 flex-1'>
              {activeSubscriptions.length === 0 ? (
                <p className='text-center text-sm font-bold text-stone-400 py-6'>
                  Aman, nggak ada tagihan rutin! 🎉
                </p>
              ) : (
                activeSubscriptions.map((sub, idx) => (
                  <div
                    key={idx}
                    className='bg-stone-50 border border-stone-200 p-4 rounded-2xl flex justify-between items-center'
                  >
                    <div>
                      <p className='font-bold text-stone-800'>{sub.title}</p>
                      <p className='text-[10px] font-black text-stone-400 uppercase tracking-wider'>
                        Bayar per {sub.frequency}
                      </p>
                    </div>
                    <p className='font-black text-stone-800'>
                      {formatRupiah(sub.amount)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
