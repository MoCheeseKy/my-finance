'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';

export default function Dashboard() {
  // State management yang Gen-Z friendly (pake loading state biar ga kaget)
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState({
    balance: 0,
    income: 0,
    expense: 0,
    savings: { name: '', target: 1, current: 0 },
    upcomingBill: { name: '', amount: 0, daysLeft: 0 },
  });

  // Fetching data dari local storage pas app pertama kali load
  useEffect(() => {
    const loadData = async () => {
      try {
        await initDummyData(); // Masukin data awal kalo kosong

        // Tarik semua data dari IndexedDB
        const balance = await db.getItem('balance');
        const income = await db.getItem('income');
        const expense = await db.getItem('expense');
        const savings = await db.getItem('savings');
        const upcomingBill = await db.getItem('upcoming_bill');

        setData({ balance, income, expense, savings, upcomingBill });
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
    <main className='min-h-screen bg-[#FAFAF9] pb-28'>
      <div className='absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-pastel-purple/40 to-transparent z-0'></div>

      <div className='relative z-10 p-6 max-w-md mx-auto'>
        {/* Header */}
        <header className='flex justify-between items-center mb-6 pt-2'>
          <div>
            <p className='text-text-muted text-sm font-medium'>
              Morning, bestie! 💅
            </p>
            <h1 className='text-2xl font-black tracking-tight text-text-main'>
              Dashboard
            </h1>
          </div>
          <div className='flex flex-col items-center'>
            <div className='w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border-2 border-pastel-yellow cursor-pointer hover:rotate-12 transition-transform'>
              <Zap className='text-yellow-500 fill-yellow-500 w-5 h-5' />
            </div>
          </div>
        </header>

        {/* Main Card - Net Worth */}
        <section className='bg-white rounded-[2.5rem] p-1 shadow-sm border border-pastel-purple/30 mb-6'>
          <div className='bg-gradient-to-br from-[#F3E8FF] via-[#FCE7F3] to-[#E0F2FE] p-6 rounded-[2.2rem]'>
            <div className='flex justify-between items-start mb-2'>
              <p className='text-text-main/70 text-sm font-semibold'>
                Total Cuan (Net Worth)
              </p>
              <div
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${financialZone.color} bg-white/60 backdrop-blur-sm`}
              >
                {financialZone.status}
              </div>
            </div>

            <h2 className='text-4xl font-black text-text-main mb-6'>
              {formatRupiah(data.balance)}
            </h2>

            <div className='flex gap-3'>
              <div className='flex-1 bg-white/60 backdrop-blur-md px-4 py-3 rounded-2xl flex items-center gap-3'>
                <ArrowDownCircle className='text-green-500 w-8 h-8 opacity-80' />
                <div>
                  <span className='text-[10px] text-text-muted font-bold uppercase tracking-wider'>
                    Income
                  </span>
                  <p className='text-sm font-black text-text-main'>
                    {formatRupiah(data.income)}
                  </p>
                </div>
              </div>
              <div className='flex-1 bg-white/60 backdrop-blur-md px-4 py-3 rounded-2xl flex items-center gap-3'>
                <ArrowUpCircle className='text-pink-500 w-8 h-8 opacity-80' />
                <div>
                  <span className='text-[10px] text-text-muted font-bold uppercase tracking-wider'>
                    Expense
                  </span>
                  <p className='text-sm font-black text-text-main'>
                    {formatRupiah(data.expense)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid: Savings & Subscriptions */}
        <section className='grid grid-cols-2 gap-4 mb-6'>
          <div className='bg-white p-4 rounded-3xl shadow-sm border border-pastel-blue/30 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer'>
            <div className='flex justify-between items-start mb-4'>
              <div className='w-8 h-8 bg-pastel-blue rounded-full flex items-center justify-center'>
                <Target className='w-4 h-4 text-blue-600' />
              </div>
              <span className='text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg'>
                {savingProgress}%
              </span>
            </div>
            <div>
              <p className='text-xs text-text-muted font-medium mb-1'>
                Target Nabung
              </p>
              <p className='font-bold text-sm text-text-main truncate'>
                {data.savings.name}
              </p>
            </div>
          </div>

          <div className='bg-white p-4 rounded-3xl shadow-sm border border-pastel-pink/30 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer'>
            <div className='flex justify-between items-start mb-4'>
              <div className='w-8 h-8 bg-pastel-pink rounded-full flex items-center justify-center'>
                <RefreshCw className='w-4 h-4 text-pink-600' />
              </div>
              <span className='text-[10px] font-bold text-pink-600 bg-pink-50 px-2 py-1 rounded-lg'>
                H-{data.upcomingBill.daysLeft}
              </span>
            </div>
            <div>
              <p className='text-xs text-text-muted font-medium mb-1'>
                {data.upcomingBill.name}
              </p>
              <p className='font-bold text-sm text-text-main'>
                {formatRupiah(data.upcomingBill.amount)}
              </p>
            </div>
          </div>
        </section>

        {/* Quick Analytics Banner */}
        <section className="bg-text-main text-white p-5 rounded-3xl shadow-md mb-6 flex justify-between items-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-blend-overlay">
          <div>
            <h3 className='font-bold mb-1'>Top Spend This Week</h3>
            <p className='text-sm text-white/70'>F&B (Rp350K) 🍔</p>
          </div>
          <button className='bg-white/20 px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-sm hover:bg-white/30 transition-colors'>
            Spill Grafik
          </button>
        </section>
      </div>

      {/* Floating Bottom Navigation Bar */}
      <nav className='fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-pastel-purple/20 px-6 py-4 flex justify-between items-center z-50'>
        <button className='text-text-main flex flex-col items-center gap-1 transition-transform hover:-translate-y-1'>
          <Home className='w-6 h-6' />
        </button>
        <button className='text-text-muted hover:text-text-main flex flex-col items-center gap-1 transition-transform hover:-translate-y-1'>
          <PieChart className='w-6 h-6' />
        </button>

        {/* Center FAB */}
        <div className='relative -top-8'>
          <button className='w-14 h-14 bg-text-main text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-105 active:scale-95 transition-all ring-4 ring-[#FAFAF9]'>
            <Plus className='w-6 h-6' />
          </button>
        </div>

        <button className='text-text-muted hover:text-text-main flex flex-col items-center gap-1 transition-transform hover:-translate-y-1'>
          <CreditCard className='w-6 h-6' />
        </button>
        <button className='text-text-muted hover:text-text-main flex flex-col items-center gap-1 transition-transform hover:-translate-y-1 relative'>
          <MessageSquare className='w-6 h-6' />
          <span className='absolute -top-1 -right-1 w-3 h-3 bg-pastel-pink rounded-full border-2 border-white animate-bounce'></span>
        </button>
      </nav>
    </main>
  );
}
