'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/storage';
import DarkDrawer from '@/components/DarkDrawer';
import Toast from '@/components/Toast';
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Coins,
  Bitcoin,
  LineChart,
  Building,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  Info,
} from 'lucide-react';

export default function InvestmentPage() {
  const router = useRouter();

  // State Data
  const [investments, setInvestments] = useState([]);

  // State Modal/Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // State Form
  const [formData, setFormData] = useState({
    name: '',
    type: 'saham',
    invested: '', // Modal Awal
    current: '', // Nilai Saat Ini
  });

  // State Feedback
  const [message, setMessage] = useState({ type: '', text: '' });

  // Pilihan Tipe Investasi beserta Ikon & Warnanya
  const assetTypes = {
    saham: {
      label: 'Saham',
      icon: LineChart,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
    },
    kripto: {
      label: 'Kripto',
      icon: Bitcoin,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-500/10',
    },
    reksadana: {
      label: 'Reksa Dana',
      icon: PieChart,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    emas: {
      label: 'Emas',
      icon: Coins,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
    deposito: {
      label: 'Deposito',
      icon: Building,
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-500/10',
    },
  };

  useEffect(() => {
    const loadInvestments = async () => {
      const savedInvestments = (await db.getItem('investments')) || [];
      setInvestments(savedInvestments);
    };
    loadInvestments();
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // --- LOGIC PERHITUNGAN SUMMARY ---
  const totalInvested = investments.reduce(
    (sum, item) => sum + item.invested,
    0,
  );
  const totalCurrent = investments.reduce((sum, item) => sum + item.current, 0);
  const totalProfit = totalCurrent - totalInvested;
  const profitPercentage =
    totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
  const isProfit = totalProfit >= 0;

  // --- LOGIC FORM & SIMPAN ---
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ name: '', type: 'saham', invested: '', current: '' });
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      type: item.type,
      invested: item.invested.toString(),
      current: item.current.toString(),
    });
    setIsDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim())
      return showMessage('error', 'Nama aset wajib diisi!');
    if (!formData.invested || Number(formData.invested) <= 0)
      return showMessage('error', 'Modal awal tidak valid!');
    if (!formData.current || Number(formData.current) < 0)
      return showMessage('error', 'Nilai saat ini tidak valid!');

    const newItem = {
      id: editingId || Date.now(),
      name: formData.name.trim(),
      type: formData.type,
      invested: Number(formData.invested),
      current: Number(formData.current),
      lastUpdated: new Date().toISOString(),
    };

    let updatedInvestments;
    if (editingId) {
      updatedInvestments = investments.map((item) =>
        item.id === editingId ? newItem : item,
      );
      showMessage('success', 'Aset berhasil diperbarui! 📈');
    } else {
      updatedInvestments = [newItem, ...investments];
      showMessage('success', 'Aset baru berhasil ditambahkan! 🚀');
    }

    setInvestments(updatedInvestments);
    await db.setItem('investments', updatedInvestments);
    setIsDrawerOpen(false);
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      'Yakin mau hapus aset ini dari portofolio?',
    );
    if (!confirmDelete) return;

    const updatedInvestments = investments.filter((item) => item.id !== id);
    setInvestments(updatedInvestments);
    await db.setItem('investments', updatedInvestments);
    setIsDrawerOpen(false);
    showMessage('success', 'Aset berhasil dihapus 🗑️');
  };

  return (
    <main className='min-h-screen bg-[#F4F4F5] dark:bg-[#121212] p-6 max-w-md mx-auto pb-32 relative overflow-x-hidden transition-colors duration-300 font-sans'>
      {/* HEADER */}
      <header className='flex items-center justify-between mb-8 pt-2'>
        <div className='flex items-center gap-4'>
          <button
            onClick={() => router.back()}
            className='w-11 h-11 bg-white dark:bg-stone-800 rounded-full flex items-center justify-center shadow-[0_2px_8px_rgb(0,0,0,0.04)] dark:shadow-none border border-stone-100 dark:border-stone-700 hover:bg-stone-50 transition-colors'
          >
            <ArrowLeft className='w-5 h-5 text-stone-700 dark:text-stone-200' />
          </button>
          <h1 className='text-xl font-black text-stone-800 dark:text-stone-100 tracking-tight'>
            Portofolio
          </h1>
        </div>
        <button
          onClick={handleOpenAdd}
          className='w-11 h-11 bg-stone-800 dark:bg-stone-100 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgb(0,0,0,0.1)] transition-transform active:scale-95'
        >
          <Plus className='w-6 h-6 text-white dark:text-stone-900' />
        </button>
      </header>

      <Toast type={message.type} text={message.text} />

      {/* SECTION 1: SUMMARY CARD (PREMIUM UI) */}
      <section className='bg-gradient-to-br from-stone-800 to-stone-900 dark:from-stone-800 dark:to-stone-950 p-6 rounded-[2rem] shadow-[0_12px_40px_rgb(0,0,0,0.15)] mb-8 relative overflow-hidden text-white'>
        <div className='absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10'></div>
        <div className='absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -ml-10 -mb-10'></div>

        <div className='relative z-10'>
          <p className='text-stone-400 text-xs font-bold tracking-widest uppercase mb-1 flex items-center gap-1.5'>
            <Wallet className='w-4 h-4' /> Total Aset Saat Ini
          </p>
          <h2 className='text-4xl font-black mb-6 tracking-tight'>
            <span className='text-2xl text-stone-400 font-bold mr-1'>Rp</span>
            {totalCurrent.toLocaleString('id-ID')}
          </h2>

          <div className='flex items-center justify-between p-4 bg-white/10 rounded-3xl backdrop-blur-sm border border-white/10'>
            <div>
              <p className='text-[10px] text-stone-400 uppercase font-black tracking-widest mb-1'>
                Total Modal
              </p>
              <p className='font-bold text-sm'>
                Rp {totalInvested.toLocaleString('id-ID')}
              </p>
            </div>
            <div className='w-px h-8 bg-white/20 mx-2'></div>
            <div className='text-right'>
              <p className='text-[10px] text-stone-400 uppercase font-black tracking-widest mb-1'>
                Return (P/L)
              </p>
              <div
                className={`flex items-center justify-end gap-1 font-black text-sm ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {isProfit ? (
                  <TrendingUp className='w-4 h-4' />
                ) : (
                  <TrendingDown className='w-4 h-4' />
                )}
                {isProfit ? '+' : ''}Rp{' '}
                {Math.abs(totalProfit).toLocaleString('id-ID')} (
                {isProfit ? '+' : ''}
                {profitPercentage.toFixed(2)}%)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: DAFTAR ASET */}
      <div className='flex items-center justify-between mb-4 px-2'>
        <h3 className='text-sm font-black text-stone-800 dark:text-stone-100 uppercase tracking-widest'>
          Daftar Aset
        </h3>
        <span className='text-xs font-bold text-stone-400'>
          {investments.length} Aset
        </span>
      </div>

      {investments.length === 0 ? (
        <div className='bg-white dark:bg-stone-800 p-8 rounded-[2rem] shadow-sm border border-stone-100 dark:border-stone-700 text-center'>
          <div className='w-20 h-20 bg-stone-50 dark:bg-stone-700/50 rounded-full flex items-center justify-center mx-auto mb-4'>
            <TrendingUp className='w-10 h-10 text-stone-300 dark:text-stone-500' />
          </div>
          <h4 className='font-black text-lg text-stone-800 dark:text-white mb-2'>
            Belum Ada Investasi
          </h4>
          <p className='text-sm text-stone-500 dark:text-stone-400 mb-6 px-4'>
            Mulai catat reksa dana, saham, atau tabungan emasmu di sini.
          </p>
          <button
            onClick={handleOpenAdd}
            className='px-6 py-3 bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 font-bold rounded-2xl shadow-md transition-transform active:scale-95 text-sm'
          >
            Tambah Aset Pertama
          </button>
        </div>
      ) : (
        <div className='space-y-4'>
          {investments.map((item) => {
            const typeConfig = assetTypes[item.type] || assetTypes.saham;
            const Icon = typeConfig.icon;
            const itemProfit = item.current - item.invested;
            const itemProfitPercent = (itemProfit / item.invested) * 100;
            const isItemProfit = itemProfit >= 0;

            return (
              <div
                key={item.id}
                onClick={() => handleOpenEdit(item)}
                className='bg-white dark:bg-stone-800 p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none border border-stone-100 dark:border-stone-700 flex items-center gap-4 cursor-pointer hover:border-stone-300 dark:hover:border-stone-500 transition-colors group'
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center ${typeConfig.bg}`}
                >
                  <Icon className={`w-7 h-7 ${typeConfig.color}`} />
                </div>

                <div className='flex-1'>
                  <h4 className='font-black text-[15px] text-stone-800 dark:text-stone-100 mb-0.5'>
                    {item.name}
                  </h4>
                  <p className='text-xs font-bold text-stone-400 uppercase tracking-wider'>
                    {typeConfig.label}
                  </p>
                </div>

                <div className='text-right'>
                  <p className='font-black text-[15px] text-stone-800 dark:text-white mb-0.5'>
                    Rp {item.current.toLocaleString('id-ID')}
                  </p>
                  <p
                    className={`text-[11px] font-black flex items-center justify-end gap-0.5 ${isItemProfit ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
                  >
                    {isItemProfit ? (
                      <TrendingUp className='w-3 h-3' />
                    ) : (
                      <TrendingDown className='w-3 h-3' />
                    )}
                    {isItemProfit ? '+' : ''}
                    {itemProfitPercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DRAWER TAMBAH & EDIT ASET */}
      <DarkDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingId ? 'Edit Aset' : 'Tambah Aset'}
        headerRight={
          editingId && (
            <button
              onClick={() => handleDelete(editingId)}
              className='p-2.5 bg-red-50 dark:bg-red-500/10 rounded-full hover:bg-red-100 transition-colors'
            >
              <Trash2 className='w-5 h-5 text-red-500' />
            </button>
          )
        }
        footer={
          <button
            onClick={handleSave}
            className='w-full py-4 bg-stone-800 dark:bg-white text-white dark:text-stone-900 font-black text-[15px] rounded-2xl shadow-lg hover:opacity-90 transition-all active:scale-95'
          >
            {editingId ? 'Simpan Perubahan ✅' : 'Tambahkan ke Portofolio 🚀'}
          </button>
        }
      >
        {/* Nama Aset */}
        <div className='bg-stone-50 dark:bg-stone-900/50 rounded-2xl p-4 border border-stone-200 dark:border-stone-700 focus-within:border-indigo-500 transition-colors'>
          <label className='text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2'>
            Nama Aset
          </label>
          <input
            type='text'
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder='Misal: BBCA, Bitcoin, Sucorinvest...'
            className='w-full bg-transparent outline-none font-bold text-stone-800 dark:text-white text-[15px]'
          />
        </div>

        {/* Tipe Aset */}
        <div className='bg-stone-50 dark:bg-stone-900/50 rounded-2xl p-4 border border-stone-200 dark:border-stone-700 focus-within:border-indigo-500 transition-colors'>
          <label className='text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2'>
            Jenis Instrumen
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className='w-full bg-transparent outline-none font-bold text-stone-800 dark:text-white text-[15px] cursor-pointer'
          >
            {Object.entries(assetTypes).map(([key, config]) => (
              <option key={key} value={key} className='text-stone-800'>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        {/* Nominal */}
        <div className='flex gap-3'>
          <div className='flex-1 bg-stone-50 dark:bg-stone-900/50 rounded-2xl p-4 border border-stone-200 dark:border-stone-700 focus-within:border-indigo-500 transition-colors'>
            <label className='text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2'>
              Modal Awal (Rp)
            </label>
            <input
              type='number'
              value={formData.invested}
              onChange={(e) =>
                setFormData({ ...formData, invested: e.target.value })
              }
              placeholder='0'
              className='w-full bg-transparent outline-none font-bold text-stone-800 dark:text-white text-[15px]'
            />
          </div>
          <div className='flex-1 bg-blue-50 dark:bg-blue-500/10 rounded-2xl p-4 border border-blue-200 dark:border-blue-900/50 focus-within:border-blue-500 transition-colors'>
            <label className='text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest block mb-2'>
              Nilai Saat Ini (Rp)
            </label>
            <input
              type='number'
              value={formData.current}
              onChange={(e) =>
                setFormData({ ...formData, current: e.target.value })
              }
              placeholder='0'
              className='w-full bg-transparent outline-none font-black text-blue-700 dark:text-blue-300 text-[15px]'
            />
          </div>
        </div>

        <div className='bg-stone-100 dark:bg-stone-800/50 p-4 rounded-2xl flex items-start gap-3'>
          <Info className='w-5 h-5 text-stone-400 shrink-0 mt-0.5' />
          <p className='text-[11px] text-stone-500 dark:text-stone-400 font-medium leading-relaxed'>
            Perbarui {`"`}Nilai Saat Ini{`"`} secara berkala untuk memantau
            performa keuntungan (profit/loss) investasimu.
          </p>
        </div>
      </DarkDrawer>
    </main>
  );
}
