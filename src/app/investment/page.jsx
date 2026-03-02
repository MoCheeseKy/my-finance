'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/storage';
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
  X,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
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
      bg: 'bg-blue-500/10',
    },
    kripto: {
      label: 'Kripto',
      icon: Bitcoin,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    reksadana: {
      label: 'Reksa Dana',
      icon: PieChart,
      color: 'text-income',
      bg: 'bg-income/10',
    },
    emas: {
      label: 'Emas',
      icon: Coins,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    deposito: {
      label: 'Deposito',
      icon: Building,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
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
    <main className='min-h-screen bg-bg p-6 max-w-md mx-auto pb-32 relative overflow-x-hidden transition-colors duration-300 font-sans'>
      {/* HEADER */}
      <header className='flex items-center justify-between mb-8 pt-2'>
        <div className='flex items-center gap-4'>
          <button
            onClick={() => router.back()}
            className='w-11 h-11 bg-surface rounded-full flex items-center justify-center shadow-sm border border-border hover:bg-surface-hover transition-colors'
          >
            <ArrowLeft className='w-5 h-5 text-text-primary' />
          </button>
          <h1 className='text-xl font-black text-text-primary tracking-tight'>
            Portofolio
          </h1>
        </div>
        <button
          onClick={handleOpenAdd}
          className='w-11 h-11 bg-primary rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95'
        >
          <Plus className='w-6 h-6 text-text-primary' />
        </button>
      </header>

      {/* FEEDBACK TOAST */}
      {message.text && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 rounded-full shadow-lg flex items-center gap-2.5 animate-in slide-in-from-top-10 font-bold text-sm backdrop-blur-md ${message.type === 'success' ? 'bg-primary/95 text-text-primary' : 'bg-expense/95 text-bg'}`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className='w-5 h-5 text-income' />
          ) : (
            <AlertTriangle className='w-5 h-5 text-bg' />
          )}
          {message.text}
        </div>
      )}

      {/* SECTION 1: SUMMARY CARD (PREMIUM UI) */}
      <section className='bg-surface border border-border p-6 rounded-[2rem] shadow-sm mb-8 relative overflow-hidden transition-colors'>
        <div className='absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10'></div>
        <div className='absolute bottom-0 left-0 w-32 h-32 bg-investment/20 rounded-full blur-3xl -ml-10 -mb-10'></div>

        <div className='relative z-10'>
          <p className='text-text-secondary text-xs font-bold tracking-widest uppercase mb-1 flex items-center gap-1.5'>
            <Wallet className='w-4 h-4' /> Total Aset Saat Ini
          </p>
          <h2 className='text-4xl font-black text-text-primary mb-6 tracking-tight'>
            <span className='text-2xl text-text-secondary font-bold mr-1'>
              Rp
            </span>
            {totalCurrent.toLocaleString('id-ID')}
          </h2>

          <div className='flex items-center justify-between p-4 bg-bg-hover rounded-3xl backdrop-blur-sm border border-border'>
            <div>
              <p className='text-[10px] text-text-secondary uppercase font-black tracking-widest mb-1'>
                Total Modal
              </p>
              <p className='font-bold text-sm text-text-primary'>
                Rp {totalInvested.toLocaleString('id-ID')}
              </p>
            </div>
            <div className='w-px h-8 bg-border mx-2'></div>
            <div className='text-right'>
              <p className='text-[10px] text-text-secondary uppercase font-black tracking-widest mb-1'>
                Return (P/L)
              </p>
              <div
                className={`flex items-center justify-end gap-1 font-black text-sm ${isProfit ? 'text-income' : 'text-expense'}`}
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
        <h3 className='text-sm font-black text-text-primary uppercase tracking-widest'>
          Daftar Aset
        </h3>
        <span className='text-xs font-bold text-text-secondary'>
          {investments.length} Aset
        </span>
      </div>

      {investments.length === 0 ? (
        <div className='bg-surface p-8 rounded-[2rem] shadow-sm border border-border text-center transition-colors'>
          <div className='w-20 h-20 bg-bg-hover rounded-full flex items-center justify-center mx-auto mb-4 border border-border'>
            <TrendingUp className='w-10 h-10 text-text-secondary/50' />
          </div>
          <h4 className='font-black text-lg text-text-primary mb-2'>
            Belum Ada Investasi
          </h4>
          <p className='text-sm text-text-secondary mb-6 px-4'>
            Mulai catat reksa dana, saham, atau tabungan emasmu di sini.
          </p>
          <button
            onClick={handleOpenAdd}
            className='px-6 py-3 bg-primary text-text-primary font-bold rounded-2xl shadow-md transition-transform active:scale-95 text-sm hover:opacity-90'
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
                className='bg-surface p-5 rounded-3xl shadow-sm border border-border flex items-center gap-4 cursor-pointer hover:border-text-secondary/50 transition-colors group'
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center border border-border/50 ${typeConfig.bg}`}
                >
                  <Icon className={`w-7 h-7 ${typeConfig.color}`} />
                </div>

                <div className='flex-1'>
                  <h4 className='font-black text-[15px] text-text-primary mb-0.5'>
                    {item.name}
                  </h4>
                  <p className='text-xs font-bold text-text-secondary uppercase tracking-wider'>
                    {typeConfig.label}
                  </p>
                </div>

                <div className='text-right'>
                  <p className='font-black text-[15px] text-text-primary mb-0.5'>
                    Rp {item.current.toLocaleString('id-ID')}
                  </p>
                  <p
                    className={`text-[11px] font-black flex items-center justify-end gap-0.5 ${isItemProfit ? 'text-income' : 'text-expense'}`}
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

      {/* --- DRAWER / POPUP: TAMBAH & EDIT ASET --- */}
      {isDrawerOpen && (
        <div
          className='fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in'
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className='bg-surface w-full max-w-md max-h-[90vh] flex flex-col rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 overflow-hidden border border-border transition-colors'
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className='p-6 pb-4 border-b border-border flex justify-between items-center bg-surface/50 backdrop-blur-md'>
              <h3 className='font-black text-xl text-text-primary tracking-tight'>
                {editingId ? 'Edit Aset' : 'Tambah Aset'}
              </h3>
              <div className='flex items-center gap-2'>
                {editingId && (
                  <button
                    onClick={() => handleDelete(editingId)}
                    className='p-2.5 bg-expense/10 rounded-full hover:bg-expense/20 transition-colors'
                  >
                    <Trash2 className='w-5 h-5 text-expense' />
                  </button>
                )}
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className='p-2.5 bg-bg-hover rounded-full hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5 text-text-secondary' />
                </button>
              </div>
            </div>

            {/* Body Modal */}
            <div className='p-6 overflow-y-auto space-y-5'>
              {/* Nama Aset */}
              <div className='bg-bg-hover rounded-2xl p-4 border border-border focus-within:border-primary transition-colors'>
                <label className='text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-2'>
                  Nama Aset
                </label>
                <input
                  type='text'
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder='Misal: BBCA, Bitcoin, Sucorinvest...'
                  className='w-full bg-transparent outline-none font-bold text-text-primary text-[15px] placeholder:text-text-secondary/50'
                />
              </div>

              {/* Tipe Aset */}
              <div className='bg-bg-hover rounded-2xl p-4 border border-border focus-within:border-primary transition-colors'>
                <label className='text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-2'>
                  Jenis Instrumen
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className='w-full bg-transparent outline-none font-bold text-text-primary text-[15px] cursor-pointer'
                >
                  {Object.entries(assetTypes).map(([key, config]) => (
                    <option
                      key={key}
                      value={key}
                      className='text-text-primary bg-surface'
                    >
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nominal Group */}
              <div className='flex gap-3'>
                <div className='flex-1 bg-bg-hover rounded-2xl p-4 border border-border focus-within:border-primary transition-colors'>
                  <label className='text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-2'>
                    Modal Awal (Rp)
                  </label>
                  <input
                    type='number'
                    value={formData.invested}
                    onChange={(e) =>
                      setFormData({ ...formData, invested: e.target.value })
                    }
                    placeholder='0'
                    className='w-full bg-transparent outline-none font-bold text-text-primary text-[15px] placeholder:text-text-secondary/50'
                  />
                </div>

                <div className='flex-1 bg-primary/5 rounded-2xl p-4 border border-primary/20 focus-within:border-primary transition-colors'>
                  <label className='text-[10px] font-black text-primary uppercase tracking-widest block mb-2'>
                    Nilai Saat Ini (Rp)
                  </label>
                  <input
                    type='number'
                    value={formData.current}
                    onChange={(e) =>
                      setFormData({ ...formData, current: e.target.value })
                    }
                    placeholder='0'
                    className='w-full bg-transparent outline-none font-black text-primary text-[15px] placeholder:text-primary/50'
                  />
                </div>
              </div>

              <div className='bg-bg-hover p-4 rounded-2xl flex items-start gap-3 mt-2 border border-border'>
                <Info className='w-5 h-5 text-text-secondary shrink-0 mt-0.5' />
                <p className='text-[11px] text-text-secondary font-medium leading-relaxed'>
                  Perbarui {'"'}Nilai Saat Ini{'"'} secara berkala untuk
                  memantau performa keuntungan (profit/loss) investasimu.
                </p>
              </div>
            </div>

            {/* Footer Modal */}
            <div className='p-6 pt-2 bg-surface'>
              <button
                onClick={handleSave}
                className='w-full py-4.5 bg-primary text-text-primary font-black text-[15px] rounded-2xl shadow-lg hover:opacity-90 transition-all active:scale-95 border-2 border-border'
              >
                {editingId
                  ? 'Simpan Perubahan ✅'
                  : 'Tambahkan ke Portofolio 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
