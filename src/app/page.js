'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, initDummyData } from '@/lib/storage';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Target,
  Zap,
  Home,
  PieChart,
  MessageSquare,
  CreditCard,
  RefreshCw,
  Wallet,
  ReceiptText,
  PiggyBank,
  ChevronRight,
} from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export default function Dashboard() {
  const router = useRouter();

  // State management yang Gen-Z friendly (pake loading state biar ga kaget)
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState({
    balance: 0,
    income: 0,
    expense: 0,
    savings: { name: '', target: 1, current: 0 },
    upcomingBill: { name: '', amount: 0, daysLeft: 0 },
  });
  const [recentTransactions, setRecentTransactions] = useState([]);

  // Fetching data dari local storage pas app pertama kali load
  useEffect(() => {
    const loadData = async () => {
      try {
        await initDummyData(); // Masukin data awal kalo kosong

        // Tarik semua data dari IndexedDB
        const balance = await db.getItem('balance');
        const income = await db.getItem('income');
        const savings = await db.getItem('savings');
        const upcomingBill = await db.getItem('upcoming_bill');
        const transactionsList = (await db.getItem('transactions')) || [];

        // Kalkulasi Income & Expense khusus BULAN INI
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

        setData({
          balance,
          income: monthlyIncome,
          expense: monthlyExpense,
          savings,
          upcomingBill,
        });
        // Ambil 5 transaksi paling baru
        setRecentTransactions(
          transactionsList
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5),
        );
      } catch (error) {
        console.error('Waduh, gagal nge-load data nih bestie:', error);
      } finally {
        setIsLoading(false);
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

  // Ngitung persentase tabungan pake math logic simple
  const savingProgress =
    Math.round((data.savings.current / data.savings.target) * 100) || 0;

  // Logic simple buat nentuin zona dompet
  const isBoncos = data.expense > data.income * 0.7;
  const financialZone = isBoncos
    ? { status: 'Red Flag 🚩', color: 'bg-red-100 text-red-700' }
    : { status: 'Slay & Safe ✨', color: 'bg-pastel-green text-green-800' };

  if (isLoading)
    return (
      <div className='min-h-screen flex items-center justify-center text-text-secondary font-bold'>
        Loading bentar ya bestie... 💅
      </div>
    );

  return (
    <main className='min-h-screen bg-bg pb-28'>
      <div className='absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-expense/40 to-transparent z-0'></div>

      <div className='relative z-10 p-6 max-w-md mx-auto'>
        <header className='flex justify-between items-center mb-6 pt-2 px-1 relative z-10'>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 bg-surface rounded-full flex items-center justify-center text-xl shadow-sm border-2 border-expense/50'>
              👩‍💻
            </div>
            <div>
              <h1 className='text-sm text-text-secondary font-medium mb-0.5'>
                Selamat Datang
              </h1>
              <h2 className='text-2xl font-black tracking-tight text-text-primary'>
                Bossque!
              </h2>
            </div>
          </div>
        </header>

        {/* Main Card - Net Worth (Header dipisahkan) */}
        <section className='bg-surface/80 backdrop-blur-md rounded-[2.5rem] p-1.5 shadow-sm border-2 border-expense/50 mb-4'>
          <div className='bg-gradient-to-br from-expense via-surface to-investment p-6 rounded-[2rem] shadow-inner flex flex-col items-center justify-center text-center'>
            <h2 className='text-4xl font-black text-text-primary mb-6 drop-shadow-sm truncate w-full'>
              {formatRupiah(data.balance)}
            </h2>

            <button
              onClick={() => router.push('/balance-accounts')}
              className='w-full bg-surface/80 hover:bg-surface text-text-primary py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-sm border border-surface/50 transition-all hover:-translate-y-0.5'
            >
              <Wallet className='w-4 h-4 text-primary' />
              Lihat Detail Dompet
            </button>
          </div>
        </section>

        {/* Separated Monthly Income & Expense Cards */}
        <section className='grid grid-cols-2 gap-3 mb-6'>
          <div className='bg-surface/70 backdrop-blur-md px-4 py-4 rounded-[1.5rem] flex flex-col items-start gap-2 border-2 border-income/30 shadow-sm'>
            <div className='flex items-center gap-2 mb-1 w-full'>
              <ArrowDownCircle className='text-income w-6 h-6 fill-income/20 opacity-90 flex-shrink-0' />
              <span className='text-[10px] text-text-secondary font-bold uppercase tracking-wider truncate'>
                Income
              </span>
            </div>
            <p className='text-lg font-black text-text-primary truncate w-full'>
              {formatRupiah(data.income)}
            </p>
          </div>
          <div className='bg-surface/70 backdrop-blur-md px-4 py-4 rounded-[1.5rem] flex flex-col items-start gap-2 border-2 border-expense/30 shadow-sm'>
            <div className='flex items-center gap-2 mb-1 w-full'>
              <ArrowUpCircle className='text-expense w-6 h-6 fill-expense/20 opacity-90 drop-shadow-sm flex-shrink-0' />
              <span className='text-[10px] text-text-secondary font-bold uppercase tracking-wider truncate'>
                Expense
              </span>
            </div>
            <p className='text-lg font-black text-text-primary truncate w-full'>
              {formatRupiah(data.expense)}
            </p>
          </div>
        </section>

        {/* Quick Features Row -> 2x2 Grid */}
        <section className='mb-6'>
          <h3 className='text-sm font-black text-text-primary mb-3 px-1'>
            Fitur Pendukung
          </h3>
          <div className='grid grid-cols-2 gap-3 pb-2'>
            {/* Nabung */}
            <div className='bg-surface/90 backdrop-blur-sm rounded-[1.5rem] shadow-sm border-2 border-investment/40 flex flex-col items-center justify-center p-4 hover:-translate-y-1 hover:border-investment transition-all cursor-pointer group'>
              <div className='w-12 h-12 mb-2 bg-investment/30 rounded-full flex items-center justify-center'>
                <PiggyBank className='w-6 h-6 text-investment' />
              </div>
              <span className='text-xs font-bold text-text-primary group-hover:text-investment transition-colors'>
                Nabung
              </span>
            </div>

            {/* Split Bill */}
            <div className='bg-surface/90 backdrop-blur-sm rounded-[1.5rem] shadow-sm border-2 border-warning/40 flex flex-col items-center justify-center p-4 hover:-translate-y-1 hover:border-warning transition-all cursor-pointer group'>
              <div className='w-12 h-12 mb-2 bg-warning/40 rounded-full flex items-center justify-center'>
                <ReceiptText className='w-6 h-6 text-warning' />
              </div>
              <span className='text-xs font-bold text-text-primary group-hover:text-warning transition-colors'>
                Split Bill
              </span>
            </div>

            {/* Investment */}
            <div className='bg-surface/90 backdrop-blur-sm rounded-[1.5rem] shadow-sm border-2 border-warning/40 flex flex-col items-center justify-center p-4 hover:-translate-y-1 hover:border-warning transition-all cursor-pointer group'>
              <div className='w-12 h-12 mb-2 bg-warning/40 rounded-full flex items-center justify-center'>
                <ReceiptText className='w-6 h-6 text-warning' />
              </div>
              <span className='text-xs font-bold text-text-primary group-hover:text-warning transition-colors'>
                Investasi
              </span>
            </div>

            {/* Budgeting */}
            <div className='bg-surface/90 backdrop-blur-sm rounded-[1.5rem] shadow-sm border-2 border-income/60 flex flex-col items-center justify-center p-4 hover:-translate-y-1 hover:border-income transition-all cursor-pointer group'>
              <div className='w-12 h-12 mb-2 bg-income/40 rounded-full flex items-center justify-center'>
                <Target className='w-6 h-6 text-income' />
              </div>
              <span className='text-xs font-bold text-text-primary group-hover:text-income transition-colors'>
                Budgeting
              </span>
            </div>
          </div>
        </section>

        {/* Recent Transactions List */}
        <section className='mb-6'>
          <div className='flex justify-between items-center mb-3 px-1'>
            <h3 className='text-sm font-black text-text-primary'>
              Transaksi Terakhir
            </h3>
            <button
              onClick={() => router.push('/insight')}
              className='text-xs font-bold text-expense hover:text-expense flex items-center'
            >
              Lihat Semua <ChevronRight className='w-3 h-3 ml-0.5' />
            </button>
          </div>

          <div className='space-y-3'>
            {recentTransactions.length === 0 ? (
              <div className='text-center py-8 bg-surface/60 backdrop-blur-sm rounded-[2rem] border-2 border-surface/50 border-dashed'>
                <p className='text-text-secondary font-bold text-sm'>
                  Belum ada transaksi bestie
                </p>
              </div>
            ) : (
              recentTransactions.map((txn) => (
                <div
                  key={txn.id}
                  className='bg-surface/90 backdrop-blur-sm p-3 rounded-[1.5rem] border-2 border-expense/30 shadow-sm flex justify-between items-center hover:border-expense hover:-translate-y-0.5 transition-all'
                >
                  <div className='flex-1 min-w-0 mr-3'>
                    <p className='font-bold text-text-primary text-sm mb-0.5 truncate'>
                      {txn.title}
                    </p>
                    <div className='flex gap-2 text-[10px] font-bold text-text-secondary'>
                      <span className='capitalize'>{txn.category}</span>
                    </div>
                  </div>
                  <p
                    className={`font-black text-sm whitespace-nowrap ${txn.type === 'expense' ? 'text-expense' : txn.type === 'income' ? 'text-income' : 'text-text-primary'}`}
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
    </main>
  );
}
