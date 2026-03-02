'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/storage';
import {
  ArrowLeft,
  Target,
  Calendar,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
  Flame,
  Info,
  CheckCircle2,
} from 'lucide-react';
import {
  format,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  isAfter,
  parseISO,
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function SavingsPage() {
  const router = useRouter();
  const [savings, setSavings] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    targetAmount: '',
    currentAmount: '0',
    deadline: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    const loadSavings = async () => {
      const data = (await db.getItem('savings_plans')) || [];
      setSavings(data);
    };
    loadSavings();
  }, []);

  const handleSave = async () => {
    if (!formData.title || !formData.targetAmount || !formData.deadline) return;

    const newPlan = {
      ...formData,
      id: Date.now().toString(),
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: parseFloat(formData.currentAmount),
    };

    const updated = [...savings, newPlan];
    setSavings(updated);
    await db.setItem('savings_plans', updated);
    setShowAddModal(false);
    setFormData({
      title: '',
      targetAmount: '',
      currentAmount: '0',
      deadline: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const deletePlan = async (id) => {
    const updated = savings.filter((s) => s.id !== id);
    setSavings(updated);
    await db.setItem('savings_plans', updated);
  };

  const formatRupiah = (num) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num || 0);

  return (
    <main className='min-h-screen bg-[#FAFAF9] pb-28 relative'>
      <div className='absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-100/50 to-transparent z-0'></div>

      <div className='relative z-10 p-6 max-w-md mx-auto'>
        <header className='flex justify-between items-center mb-8 pt-2'>
          <div className='flex items-center gap-4'>
            <button
              onClick={() => router.back()}
              className='w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-stone-200'
            >
              <ArrowLeft className='w-5 h-5 text-stone-800' />
            </button>
            <h1 className='text-xl font-black text-stone-800'>Saving Plan</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className='w-10 h-10 bg-stone-800 rounded-2xl flex items-center justify-center shadow-lg text-white'
          >
            <Plus className='w-5 h-5' />
          </button>
        </header>

        {/* --- LIST SAVING PLANS --- */}
        <div className='space-y-6'>
          {savings.length === 0 ? (
            <div className='text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-stone-200'>
              <Target className='w-12 h-12 text-stone-200 mx-auto mb-4' />
              <p className='text-stone-400 font-bold'>
                Belum ada target? <br />
                Mimpi aja dulu, catat kemudian!
              </p>
            </div>
          ) : (
            savings.map((plan) => (
              <SavingCard
                key={plan.id}
                plan={plan}
                onDelete={() => deletePlan(plan.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* --- MODAL TAMBAH TARGET --- */}
      {showAddModal && (
        <div className='fixed inset-0 z-50 flex items-end justify-center bg-stone-900/60 backdrop-blur-sm p-4'>
          <div className='bg-white w-full max-w-md rounded-[2.5rem] p-8 animate-in slide-in-from-bottom-20 duration-300'>
            <h3 className='text-xl font-black text-stone-800 mb-6'>
              Set New Target
            </h3>
            <div className='space-y-4'>
              <div>
                <label className='text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1'>
                  Nama Keinginan
                </label>
                <input
                  type='text'
                  placeholder='Misal: iPhone 17 Pro Max'
                  className='w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl font-bold outline-none focus:border-stone-800'
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1'>
                    Target Dana
                  </label>
                  <input
                    type='number'
                    placeholder='Rp'
                    className='w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl font-bold outline-none'
                    value={formData.targetAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, targetAmount: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className='text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1'>
                    Tabungan Awal
                  </label>
                  <input
                    type='number'
                    placeholder='Rp'
                    className='w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl font-bold outline-none'
                    value={formData.currentAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currentAmount: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <label className='text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1'>
                  Deadline Pencapaian
                </label>
                <input
                  type='date'
                  className='w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl font-bold outline-none'
                  value={formData.deadline}
                  onChange={(e) =>
                    setFormData({ ...formData, deadline: e.target.value })
                  }
                />
              </div>
              <div className='flex gap-3 pt-4'>
                <button
                  onClick={() => setShowAddModal(false)}
                  className='flex-1 py-4 font-black text-stone-400'
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  className='flex-[2] bg-stone-800 text-white py-4 rounded-2xl font-black shadow-xl'
                >
                  Gasskeun!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SavingCard({ plan, onDelete }) {
  const formatRupiah = (num) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num || 0);

  // Perhitungan Proyeksi
  const stats = useMemo(() => {
    const today = new Date();
    const start = parseISO(plan.startDate);
    const end = parseISO(plan.deadline);

    const totalDays = Math.max(differenceInDays(end, start), 1);
    const daysLeft = Math.max(differenceInDays(end, today), 0);
    const remainingAmount = Math.max(plan.targetAmount - plan.currentAmount, 0);

    const progress = Math.min(
      (plan.currentAmount / plan.targetAmount) * 100,
      100,
    );

    return {
      daysLeft,
      remainingAmount,
      progress,
      daily: remainingAmount / Math.max(daysLeft, 1),
      weekly: remainingAmount / (Math.max(daysLeft, 1) / 7),
      monthly: remainingAmount / (Math.max(daysLeft, 1) / 30),
      isCompleted: plan.currentAmount >= plan.targetAmount,
    };
  }, [plan]);

  return (
    <div className='bg-white rounded-[2.5rem] border border-stone-200 shadow-sm overflow-hidden relative'>
      {/* Background Decor */}
      <div className='absolute top-0 right-0 p-6 opacity-10'>
        <Target className='w-20 h-20 text-stone-800' />
      </div>

      <div className='p-6'>
        <div className='flex justify-between items-start mb-4'>
          <div>
            <h4 className='text-lg font-black text-stone-800'>{plan.title}</h4>
            <p className='text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1'>
              <Calendar className='w-3 h-3' /> {stats.daysLeft} Hari Lagi
            </p>
          </div>
          <button
            onClick={onDelete}
            className='p-2 text-stone-300 hover:text-red-500 transition-colors'
          >
            <Trash2 className='w-4 h-4' />
          </button>
        </div>

        {/* Progress Bar */}
        <div className='mb-6'>
          <div className='flex justify-between items-end mb-2'>
            <span className='text-2xl font-black text-stone-800'>
              {stats.progress.toFixed(0)}%
            </span>
            <span className='text-xs font-bold text-stone-500'>
              {formatRupiah(plan.currentAmount)} /{' '}
              {formatRupiah(plan.targetAmount)}
            </span>
          </div>
          <div className='w-full h-3 bg-stone-100 rounded-full overflow-hidden'>
            <div
              className='h-full bg-stone-800 rounded-full transition-all duration-1000'
              style={{ width: `${stats.progress}%` }}
            />
          </div>
        </div>

        {/* Projection Grid */}
        {!stats.isCompleted ? (
          <div className='grid grid-cols-3 gap-2 mb-6'>
            <div className='bg-stone-50 p-3 rounded-2xl border border-stone-100 text-center'>
              <p className='text-[8px] font-black text-stone-400 uppercase mb-1'>
                Harian
              </p>
              <p className='text-[10px] font-black text-stone-800'>
                {formatRupiah(stats.daily)}
              </p>
            </div>
            <div className='bg-stone-50 p-3 rounded-2xl border border-stone-100 text-center'>
              <p className='text-[8px] font-black text-stone-400 uppercase mb-1'>
                Mingguan
              </p>
              <p className='text-[10px] font-black text-stone-800'>
                {formatRupiah(stats.weekly)}
              </p>
            </div>
            <div className='bg-stone-800 p-3 rounded-2xl text-center shadow-lg'>
              <p className='text-[8px] font-black text-stone-300 uppercase mb-1'>
                Bulanan
              </p>
              <p className='text-[10px] font-black text-white'>
                {formatRupiah(stats.monthly)}
              </p>
            </div>
          </div>
        ) : (
          <div className='bg-green-50 p-4 rounded-3xl border border-green-100 flex items-center gap-3 mb-6'>
            <CheckCircle2 className='w-6 h-6 text-green-500' />
            <p className='text-xs font-bold text-green-700'>
              Target tercapai! Kamu keren banget!
            </p>
          </div>
        )}

        {/* Insight Feature: Daily Sacrifice */}
        {!stats.isCompleted && (
          <div className='bg-orange-50 p-4 rounded-3xl border border-orange-100 flex items-center gap-4'>
            <div className='w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm'>
              <Flame className='w-5 h-5 text-orange-500' />
            </div>
            <div>
              <p className='text-[10px] font-black text-orange-400 uppercase tracking-widest'>
                Daily Sacrifice
              </p>
              <p className='text-[11px] font-bold text-orange-700 leading-tight'>
                Sisihkan seharga 1 cup kopi ({formatRupiah(stats.daily)}) tiap
                hari biar cepet lunas!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
