'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, initDummyData } from '@/lib/storage';
import TransactionCard from '@/components/TransactionCard';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Target,
  Wallet,
  PiggyBank,
  ReceiptText,
  TrendingUp,
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
      <div className='min-h-screen flex items-center justify-center text-text-muted font-bold'>
        Loading bentar ya bestie... 💅
      </div>
    );

  return (
    <main className='min-h-screen bg-pastel-bg pb-28'>
      <div className='absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-pastel-pink/40 to-transparent z-0'></div>

      <div className='relative z-10 p-6 max-w-md mx-auto'>
        <header className='flex justify-between items-center mb-6 pt-2 px-1 relative z-10'>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl shadow-sm border-2 border-pastel-pink/50'>
              👩‍💻
            </div>
            <div>
              <h1 className='text-sm text-text-muted font-medium mb-0.5'>
                Selamat Datang
              </h1>
              <h2 className='text-2xl font-black tracking-tight text-text-main'>
                Bossque!
              </h2>
            </div>
          </div>
        </header>

        {/* Main Card - Net Worth (Header dipisahkan) */}
        <section className='bg-white/80 backdrop-blur-md rounded-[2.5rem] p-1.5 shadow-sm border-2 border-pastel-pink/50 mb-4'>
          <div className='bg-gradient-to-br from-pastel-pink via-white to-pastel-blue p-6 rounded-[2rem] shadow-inner flex flex-col items-center justify-center text-center'>
            <h2 className='text-4xl font-black text-text-main mb-6 drop-shadow-sm truncate w-full'>
              {formatRupiah(data.balance)}
            </h2>

            <button
              onClick={() => router.push('/balance-accounts')}
              className='w-full bg-white/80 hover:bg-white text-text-main py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-sm border border-white/50 transition-all hover:-translate-y-0.5'
            >
              <Wallet className='w-4 h-4 text-purple-400' />
              Lihat Detail Dompet
            </button>
          </div>
        </section>

        {/* Separated Monthly Income & Expense Cards */}
        <section className='grid grid-cols-2 gap-3 mb-6'>
          <div className='bg-white/70 backdrop-blur-md px-4 py-4 rounded-[1.5rem] flex flex-col items-start gap-2 border-2 border-pastel-green/30 shadow-sm'>
            <div className='flex items-center gap-2 mb-1 w-full'>
              <ArrowDownCircle className='text-pastel-green w-6 h-6 fill-green-100 opacity-90 flex-shrink-0' />
              <span className='text-[10px] text-text-muted font-bold uppercase tracking-wider truncate'>
                Income
              </span>
            </div>
            <p className='text-lg font-black text-text-main truncate w-full'>
              {formatRupiah(data.income)}
            </p>
          </div>
          <div className='bg-white/70 backdrop-blur-md px-4 py-4 rounded-[1.5rem] flex flex-col items-start gap-2 border-2 border-pastel-pink/30 shadow-sm'>
            <div className='flex items-center gap-2 mb-1 w-full'>
              <ArrowUpCircle className='text-pastel-pink w-6 h-6 fill-pink-100 opacity-90 drop-shadow-sm flex-shrink-0' />
              <span className='text-[10px] text-text-muted font-bold uppercase tracking-wider truncate'>
                Expense
              </span>
            </div>
            <p className='text-lg font-black text-text-main truncate w-full'>
              {formatRupiah(data.expense)}
            </p>
          </div>
        </section>

        {/* Quick Features Row -> 2x2 Grid */}
        <section className='mb-6'>
          <h3 className='text-sm font-black text-text-main mb-3 px-1'>
            Fitur Pendukung
          </h3>
          <div className='grid grid-cols-2 gap-3 pb-2'>
            {/* Nabung */}
            <div
              onClick={() => router.push('/savings')}
              className='bg-white/90 backdrop-blur-sm rounded-[1.5rem] shadow-sm border-2 border-pastel-blue/40 flex flex-col items-center justify-center p-4 hover:-translate-y-1 hover:border-blue-300 transition-all cursor-pointer group'
            >
              <div className='w-12 h-12 mb-2 bg-pastel-blue/30 rounded-full flex items-center justify-center'>
                <PiggyBank className='w-6 h-6 text-blue-500' />
              </div>
              <span className='text-xs font-bold text-text-main group-hover:text-blue-500 transition-colors'>
                Nabung
              </span>
            </div>

            {/* Split Bill */}
            <div
              onClick={() => router.push('/split-bill')}
              className='bg-white/90 backdrop-blur-sm rounded-[1.5rem] shadow-sm border-2 border-pastel-peach/40 flex flex-col items-center justify-center p-4 hover:-translate-y-1 hover:border-orange-300 transition-all cursor-pointer group'
            >
              <div className='w-12 h-12 mb-2 bg-pastel-peach/40 rounded-full flex items-center justify-center'>
                <ReceiptText className='w-6 h-6 text-orange-500' />
              </div>
              <span className='text-xs font-bold text-text-main group-hover:text-orange-500 transition-colors'>
                Split Bill
              </span>
            </div>

            {/* Investasi */}
            <div
              onClick={() => router.push('/investment')}
              className='bg-white/90 backdrop-blur-sm rounded-[1.5rem] shadow-sm border-2 border-purple-200/60 flex flex-col items-center justify-center p-4 hover:-translate-y-1 hover:border-purple-400 transition-all cursor-pointer group'
            >
              <div className='w-12 h-12 mb-2 bg-purple-50 rounded-full flex items-center justify-center'>
                <TrendingUp className='w-6 h-6 text-purple-500' />
              </div>
              <span className='text-xs font-bold text-text-main group-hover:text-purple-500 transition-colors'>
                Investasi
              </span>
            </div>

            {/* Budgeting */}
            <div
              onClick={() => router.push('/budget')}
              className='bg-white/90 backdrop-blur-sm rounded-[1.5rem] shadow-sm border-2 border-pastel-green/60 flex flex-col items-center justify-center p-4 hover:-translate-y-1 hover:border-green-400 transition-all cursor-pointer group'
            >
              <div className='w-12 h-12 mb-2 bg-pastel-green/40 rounded-full flex items-center justify-center'>
                <Target className='w-6 h-6 text-green-600' />
              </div>
              <span className='text-xs font-bold text-text-main group-hover:text-green-600 transition-colors'>
                Budgeting
              </span>
            </div>
          </div>
        </section>

        {/* Recent Transactions List */}
        <section className='mb-6'>
          <div className='flex justify-between items-center mb-3 px-1'>
            <h3 className='text-sm font-black text-text-main'>
              Transaksi Terakhir
            </h3>
            <button
              onClick={() => router.push('/insight')}
              className='text-xs font-bold text-pink-500 hover:text-pink-600 flex items-center'
            >
              Lihat Semua <ChevronRight className='w-3 h-3 ml-0.5' />
            </button>
          </div>

          <div className='space-y-3'>
            {recentTransactions.length === 0 ? (
              <div className='text-center py-8 bg-white/60 backdrop-blur-sm rounded-[2rem] border-2 border-white/50 border-dashed'>
                <p className='text-text-muted font-bold text-sm'>
                  Belum ada transaksi bestie
                </p>
              </div>
            ) : (
              recentTransactions.map((txn) => (
                <TransactionCard key={txn.id} txn={txn} />
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
