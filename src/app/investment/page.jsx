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
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  Info,
  CreditCard,
  ChevronDown,
} from 'lucide-react';
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

export default function InvestmentPage() {
  const router = useRouter();

  // State Data
  const [investments, setInvestments] = useState([]);
  const [accounts, setAccounts] = useState([]);

  // State Modal/Drawer Utama
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // State Sub-Modals (Custom Dropdowns)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

  // State Form
  const [isNewInvestment, setIsNewInvestment] = useState(false); // false = Sudah Berjalan, true = Beli Baru
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'saham',
    invested: '',
    current: '',
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
    const loadData = async () => {
      const savedInvestments = (await db.getItem('investments')) || [];
      setInvestments(savedInvestments);

      let accs = (await db.getItem('accounts')) || [];
      if (accs.length === 0) {
        accs = [{ id: 'cash', name: 'Cash', balance: 0 }];
        await db.setItem('accounts', accs);
      }
      setAccounts(accs);
      if (accs.length > 0) setSelectedAccountId(accs[0].id);
    };
    loadData();
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
    setIsNewInvestment(false); // Default ke "Sudah Berjalan"
    setFormData({ name: '', type: 'saham', invested: '', current: '' });
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setIsNewInvestment(false); // Edit tidak bisa ubah status dompet
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

    const investedNum = Number(formData.invested);
    // Jika Beli Baru dan nilai saat ini kosong, samakan dengan modal awal
    const currentNum = formData.current
      ? Number(formData.current)
      : investedNum;

    // LOGIC JIKA BELI BARU (Potong Saldo Dompet)
    if (!editingId && isNewInvestment) {
      if (!selectedAccountId)
        return showMessage('error', 'Pilih sumber dompet dulu!');

      const currentAccs = [...accounts];
      const accIndex = currentAccs.findIndex((a) => a.id === selectedAccountId);

      if (currentAccs[accIndex].balance < investedNum) {
        return showMessage('error', 'Saldo di dompet tidak cukup!');
      }

      // 1. Potong Saldo
      currentAccs[accIndex].balance -= investedNum;
      setAccounts(currentAccs);
      await db.setItem('accounts', currentAccs);

      // 2. Update Global Balance & Expense
      const currentGlobalBalance = (await db.getItem('balance')) || 0;
      await db.setItem('balance', currentGlobalBalance - investedNum);
      const exp = (await db.getItem('expense')) || 0;
      await db.setItem('expense', exp + investedNum);

      // 3. Catat di Transaksi
      const newTxn = {
        id: Date.now(),
        type: 'expense',
        title: `Beli Aset: ${formData.name}`,
        amount: investedNum,
        source: formData.name,
        accountId: selectedAccountId,
        category: 'investasi',
        date: new Date().toISOString(),
      };
      const history = (await db.getItem('transactions')) || [];
      await db.setItem('transactions', [newTxn, ...history]);
    }

    const newItem = {
      id: editingId || Date.now(),
      name: formData.name.trim(),
      type: formData.type,
      invested: investedNum,
      current: currentNum,
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
      'Yakin mau hapus aset ini? (Uang tidak akan otomatis kembali ke dompet)',
    );
    if (!confirmDelete) return;

    const updatedInvestments = investments.filter((item) => item.id !== id);
    setInvestments(updatedInvestments);
    await db.setItem('investments', updatedInvestments);
    setIsDrawerOpen(false);
    showMessage('success', 'Aset berhasil dihapus 🗑️');
  };

  return (
    <main className='min-h-screen bg-bg relative overflow-x-hidden font-sans pb-28 md:pb-12 md:pl-32 lg:pl-36 transition-all duration-500'>
      {/* Background Soft Glow */}
      <div className='absolute top-[-5%] right-[-10%] w-64 h-64 md:w-96 md:h-96 lg:w-[40rem] lg:h-[40rem] bg-primary/20 rounded-full mix-blend-multiply filter blur-[80px] lg:blur-[120px] z-0 pointer-events-none'></div>

      <motion.div
        variants={pageVariants}
        initial='hidden'
        animate='visible'
        className='relative z-10 p-6 max-w-md md:max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto'
      >
        {/* HEADER */}
        <header className='flex justify-between items-center mb-8 pt-2'>
          <div className='flex items-center gap-4'>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className='w-11 h-11 bg-surface/80 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-sm border border-border transition-colors group'
            >
              <ArrowLeft className='w-5 h-5 text-text-primary group-hover:text-primary transition-colors' />
            </motion.button>
            <h1 className='text-xl md:text-2xl font-black text-text-primary tracking-tight'>
              Portofolio
            </h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenAdd}
            className='w-11 h-11 md:w-12 md:h-12 bg-gradient-to-tr from-primary to-primary-hover rounded-2xl flex items-center justify-center shadow-[0_8px_20px_rgb(220,198,255,0.4)] dark:shadow-[0_8px_20px_rgb(155,126,222,0.3)] text-surface border border-white/20 lg:hidden'
          >
            <Plus className='w-6 h-6 md:w-7 md:h-7 stroke-[3]' />
          </motion.button>
        </header>

        {/* FEEDBACK TOAST */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3.5 rounded-full shadow-lg flex items-center gap-2.5 font-bold text-sm backdrop-blur-md whitespace-nowrap ${message.type === 'success' ? 'bg-surface border border-border text-text-primary' : 'bg-expense/90 text-surface'}`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className='w-5 h-5 text-income' />
              ) : (
                <AlertTriangle className='w-5 h-5 text-surface' />
              )}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* GRID LAYOUT UNTUK DESKTOP */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10'>
          {/* KOLOM KIRI (Summary & Button Tambah) */}
          <div className='lg:col-span-5 flex flex-col gap-6'>
            {/* SECTION 1: SUMMARY CARD */}
            <motion.section
              variants={itemVariants}
              className='bg-surface/80 backdrop-blur-xl border border-border p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] shadow-sm relative overflow-hidden transition-colors'
            >
              <div className='absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none'></div>
              <div className='absolute bottom-0 left-0 w-32 h-32 bg-investment/20 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none'></div>

              <div className='relative z-10'>
                <p className='text-text-secondary text-xs md:text-sm font-bold tracking-widest uppercase mb-1 md:mb-2 flex items-center gap-1.5'>
                  <Wallet className='w-4 h-4' /> Total Aset Saat Ini
                </p>
                <h2 className='text-4xl md:text-5xl font-black text-text-primary mb-6 md:mb-8 tracking-tight'>
                  <span className='text-2xl md:text-3xl text-text-secondary font-bold mr-1'>
                    Rp
                  </span>
                  {totalCurrent.toLocaleString('id-ID')}
                </h2>

                <div className='flex items-center justify-between p-4 md:p-5 bg-bg/50 rounded-3xl backdrop-blur-sm border border-border'>
                  <div>
                    <p className='text-[10px] md:text-[11px] text-text-secondary uppercase font-black tracking-widest mb-1'>
                      Total Modal
                    </p>
                    <p className='font-bold text-sm md:text-base text-text-primary'>
                      Rp {totalInvested.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className='w-px h-8 md:h-10 bg-border mx-2'></div>
                  <div className='text-right'>
                    <p className='text-[10px] md:text-[11px] text-text-secondary uppercase font-black tracking-widest mb-1'>
                      Return (P/L)
                    </p>
                    <div
                      className={`flex items-center justify-end gap-1 font-black text-sm md:text-base ${isProfit ? 'text-income' : 'text-expense'}`}
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
            </motion.section>

            {/* TOMBOL TAMBAH KHUSUS DESKTOP (Muncul di bawah summary) */}
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenAdd}
              className='hidden lg:flex w-full py-5 bg-gradient-to-tr from-primary to-primary-hover rounded-[2rem] shadow-[0_15px_30px_rgb(220,198,255,0.4)] dark:shadow-[0_15px_30px_rgb(155,126,222,0.2)] text-surface border border-white/20 items-center justify-center gap-3 font-black text-lg transition-all'
            >
              <Plus className='w-6 h-6 stroke-[3]' /> Tambah Aset Baru
            </motion.button>
          </div>

          {/* KOLOM KANAN (Daftar Aset) */}
          <div className='lg:col-span-7'>
            {/* SECTION 2: DAFTAR ASET */}
            <motion.div
              variants={itemVariants}
              className='flex items-center justify-between mb-4 px-2'
            >
              <h3 className='text-xs md:text-sm font-black text-text-secondary uppercase tracking-widest'>
                Daftar Aset
              </h3>
              <span className='text-[10px] md:text-xs font-bold text-text-secondary bg-surface px-2.5 py-1 md:py-1.5 rounded-lg border border-border'>
                {investments.length} Aset
              </span>
            </motion.div>

            <div className='space-y-4 max-h-[70vh] lg:max-h-[80vh] overflow-y-auto scrollbar-hide pb-4'>
              <AnimatePresence mode='popLayout'>
                {investments.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className='bg-surface/50 backdrop-blur-md p-8 md:p-12 rounded-[2rem] border border-dashed border-border text-center'
                  >
                    <div className='w-16 h-16 bg-bg rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border border-border shadow-sm'>
                      <TrendingUp className='w-8 h-8 text-text-secondary/50' />
                    </div>
                    <h4 className='font-black text-lg md:text-xl text-text-primary mb-1'>
                      Belum Ada Investasi
                    </h4>
                    <p className='text-xs md:text-sm text-text-secondary font-semibold mb-6 px-4'>
                      Mulai catat reksa dana, saham, atau tabungan emasmu di
                      sini.
                    </p>
                    <button
                      onClick={handleOpenAdd}
                      className='px-6 py-3 bg-primary text-surface font-bold rounded-[1.2rem] shadow-sm transition-transform active:scale-95 text-sm md:text-base hover:opacity-90 lg:hidden'
                    >
                      Tambah Aset Pertama
                    </button>
                  </motion.div>
                ) : (
                  investments.map((item, index) => {
                    const typeConfig =
                      assetTypes[item.type] || assetTypes.saham;
                    const Icon = typeConfig.icon;
                    const itemProfit = item.current - item.invested;
                    const itemProfitPercent =
                      (itemProfit / item.invested) * 100;
                    const isItemProfit = itemProfit >= 0;

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.05 }}
                        key={item.id}
                        onClick={() => handleOpenEdit(item)}
                        className='bg-surface/80 backdrop-blur-md p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-border flex items-center gap-4 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group'
                      >
                        <div
                          className={`w-12 h-12 md:w-14 md:h-14 rounded-[1rem] md:rounded-[1.2rem] flex items-center justify-center border border-border/50 ${typeConfig.bg}`}
                        >
                          <Icon
                            className={`w-6 h-6 md:w-7 md:h-7 ${typeConfig.color}`}
                          />
                        </div>

                        <div className='flex-1 min-w-0'>
                          <h4 className='font-black text-[15px] md:text-lg text-text-primary mb-0.5 truncate'>
                            {item.name}
                          </h4>
                          <p className='text-[10px] md:text-xs font-bold text-text-secondary uppercase tracking-widest bg-bg px-2 py-0.5 md:py-1 rounded-md md:rounded-lg inline-block'>
                            {typeConfig.label}
                          </p>
                        </div>

                        <div className='text-right'>
                          <p className='font-black text-[15px] md:text-lg text-text-primary mb-1'>
                            Rp {item.current.toLocaleString('id-ID')}
                          </p>
                          <p
                            className={`text-[11px] md:text-xs font-black flex items-center justify-end gap-0.5 ${isItemProfit ? 'text-income' : 'text-expense'}`}
                          >
                            {isItemProfit ? (
                              <TrendingUp className='w-3 h-3 md:w-4 md:h-4' />
                            ) : (
                              <TrendingDown className='w-3 h-3 md:w-4 md:h-4' />
                            )}
                            {isItemProfit ? '+' : ''}
                            {itemProfitPercent.toFixed(2)}%
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* --- BOTTOM SHEET: TAMBAH & EDIT ASET --- */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className='fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm'
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[70] bg-surface rounded-t-[2.5rem] md:rounded-t-[3rem] p-6 md:p-8 shadow-2xl border-t border-border max-w-md md:max-w-2xl mx-auto flex flex-col max-h-[90vh]'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6 flex-shrink-0'></div>
              <div className='flex justify-between items-center mb-6 md:mb-8 flex-shrink-0'>
                <h3 className='font-black text-xl md:text-2xl text-text-primary flex items-center gap-2'>
                  {editingId ? (
                    <>
                      <LineChart className='w-6 h-6 md:w-8 md:h-8 text-primary' />{' '}
                      Edit Aset
                    </>
                  ) : (
                    <>
                      <Plus className='w-6 h-6 md:w-8 md:h-8 text-primary' />{' '}
                      Tambah Aset
                    </>
                  )}
                </h3>
                <div className='flex items-center gap-2'>
                  {editingId && (
                    <button
                      onClick={() => handleDelete(editingId)}
                      className='p-2 md:p-2.5 bg-expense/10 rounded-full hover:bg-expense/20 transition-colors'
                    >
                      <Trash2 className='w-5 h-5 md:w-6 md:h-6 text-expense' />
                    </button>
                  )}
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className='p-2 md:p-2.5 bg-bg-hover rounded-full hover:bg-border transition-colors'
                  >
                    <X className='w-5 h-5 md:w-6 md:h-6 text-text-secondary' />
                  </button>
                </div>
              </div>

              <div className='space-y-4 md:space-y-6 overflow-y-auto scrollbar-hide pb-4 px-1'>
                {/* Toggle: Sudah Berjalan vs Beli Baru */}
                {!editingId && (
                  <div className='relative flex bg-bg p-1.5 rounded-[1.2rem] md:rounded-[1.5rem] shadow-inner border border-border mb-2'>
                    {[
                      { id: false, label: 'Sudah Berjalan' },
                      { id: true, label: 'Beli Baru' },
                    ].map((option) => (
                      <button
                        key={option.id.toString()}
                        onClick={() => setIsNewInvestment(option.id)}
                        className={`relative flex-1 py-3 md:py-4 text-xs md:text-sm font-bold rounded-xl md:rounded-2xl z-10 transition-colors ${isNewInvestment === option.id ? 'text-text-primary' : 'text-text-secondary'}`}
                      >
                        {option.label}
                        {isNewInvestment === option.id && (
                          <motion.div
                            layoutId='active-invest-type'
                            className='absolute inset-0 bg-surface rounded-xl md:rounded-2xl -z-10 shadow-sm border border-border'
                            transition={{
                              type: 'spring',
                              stiffness: 300,
                              damping: 25,
                            }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6'>
                  {/* Nama Aset */}
                  <div className='bg-bg/50 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-5 border border-border focus-within:border-primary transition-colors'>
                    <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1'>
                      Nama Aset
                    </label>
                    <input
                      type='text'
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder='Misal: BBCA, Bitcoin, Sucorinvest...'
                      className='w-full bg-transparent outline-none font-bold text-text-primary text-sm md:text-base placeholder:font-normal placeholder:text-text-secondary/50'
                    />
                  </div>

                  {/* Tipe Aset (Buka Modal) */}
                  <div
                    onClick={() => setIsTypeModalOpen(true)}
                    className='bg-bg/50 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-5 border border-border cursor-pointer hover:border-primary/50 transition-all flex justify-between items-center group'
                  >
                    <div>
                      <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1'>
                        Jenis Instrumen
                      </label>
                      <div className='font-bold text-text-primary text-sm md:text-base flex items-center gap-2'>
                        {(() => {
                          const Icon =
                            assetTypes[formData.type]?.icon || LineChart;
                          return (
                            <Icon
                              className={`w-4 h-4 md:w-5 md:h-5 ${assetTypes[formData.type]?.color}`}
                            />
                          );
                        })()}
                        {assetTypes[formData.type]?.label || 'Pilih Jenis'}
                      </div>
                    </div>
                    <div className='w-8 h-8 md:w-10 md:h-10 bg-surface group-hover:bg-primary/10 rounded-full flex items-center justify-center transition-colors'>
                      <ChevronDown className='w-4 h-4 md:w-5 md:h-5 text-text-secondary group-hover:text-primary transition-colors' />
                    </div>
                  </div>
                </div>

                {/* Pilih Dompet (Beli Baru) */}
                <AnimatePresence>
                  {!editingId && isNewInvestment && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className='overflow-hidden'
                    >
                      <div
                        onClick={() => setIsAccountModalOpen(true)}
                        className='bg-primary/5 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-5 border border-primary/20 mb-2 mt-1 cursor-pointer hover:border-primary/50 transition-all flex justify-between items-center group'
                      >
                        <div>
                          <label className='text-[10px] md:text-xs font-black text-primary uppercase tracking-widest block mb-1 group-hover:text-primary/80 transition-colors flex items-center gap-1'>
                            <CreditCard className='w-3 h-3 md:w-4 md:h-4' />{' '}
                            Potong Saldo Dari
                          </label>
                          <div className='font-bold text-text-primary text-sm md:text-base'>
                            {accounts.find((a) => a.id === selectedAccountId)
                              ?.name || 'Pilih Sumber'}
                            {selectedAccountId && (
                              <span className='text-xs font-medium text-text-secondary ml-2 whitespace-nowrap hidden sm:inline-block'>
                                (Rp{' '}
                                {accounts
                                  .find((a) => a.id === selectedAccountId)
                                  ?.balance.toLocaleString('id-ID')}
                                )
                              </span>
                            )}
                          </div>
                        </div>
                        <div className='w-8 h-8 md:w-10 md:h-10 bg-surface group-hover:bg-primary/10 rounded-full flex items-center justify-center transition-colors'>
                          <ChevronDown className='w-4 h-4 md:w-5 md:h-5 text-text-secondary group-hover:text-primary transition-colors' />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Nominal Group */}
                <div className='grid grid-cols-2 gap-3 md:gap-6'>
                  <div className='bg-bg/50 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-5 border border-border focus-within:border-primary transition-colors'>
                    <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1'>
                      {isNewInvestment && !editingId
                        ? 'Nominal Beli (Rp)'
                        : 'Modal Awal (Rp)'}
                    </label>
                    <input
                      type='number'
                      value={formData.invested}
                      onChange={(e) =>
                        setFormData({ ...formData, invested: e.target.value })
                      }
                      placeholder='0'
                      className='w-full bg-transparent outline-none font-bold text-text-primary text-sm md:text-base'
                    />
                  </div>
                  <div className='bg-bg/50 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-5 border border-border focus-within:border-primary transition-colors'>
                    <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1'>
                      Nilai Saat Ini (Rp)
                    </label>
                    <input
                      type='number'
                      value={formData.current}
                      onChange={(e) =>
                        setFormData({ ...formData, current: e.target.value })
                      }
                      placeholder={isNewInvestment ? 'Opsional' : '0'}
                      className='w-full bg-transparent outline-none font-bold text-text-primary text-sm md:text-base placeholder:font-normal'
                    />
                  </div>
                </div>

                <div className='bg-surface border border-border p-4 md:p-5 rounded-2xl md:rounded-3xl flex items-start gap-3 mt-2 shadow-sm'>
                  <Info className='w-5 h-5 md:w-6 md:h-6 text-text-secondary shrink-0 mt-0.5' />
                  <p className='text-[10px] md:text-xs text-text-secondary font-bold leading-relaxed'>
                    {isNewInvestment && !editingId
                      ? 'Jika "Nilai Saat Ini" dikosongkan, sistem akan menyamakan nilainya dengan "Nominal Beli".'
                      : 'Perbarui "Nilai Saat Ini" secara berkala untuk memantau performa keuntungan (profit/loss) investasimu.'}
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  className='w-full py-4 md:py-5 bg-gradient-to-r from-primary to-primary-hover text-surface font-black rounded-[1.5rem] md:rounded-[2rem] shadow-[0_10px_20px_rgb(220,198,255,0.4)] dark:shadow-[0_10px_20px_rgb(155,126,222,0.2)] mt-4 border border-white/20 text-base md:text-lg'
                >
                  {editingId ? 'Simpan Perubahan' : 'Tambahkan ke Portofolio'}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- MODAL PILIH DOMPET --- */}
      <AnimatePresence>
        {isAccountModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAccountModalOpen(false)}
              className='fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm'
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[90] bg-surface rounded-t-[2.5rem] md:rounded-t-[3rem] p-6 shadow-2xl border-t border-border max-w-md md:max-w-xl mx-auto'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6 flex-shrink-0'></div>
              <div className='flex justify-between items-center mb-6'>
                <h3 className='font-black text-xl text-text-primary flex items-center gap-2'>
                  <Wallet className='w-6 h-6 text-primary' /> Pilih Dompet
                </h3>
                <button
                  onClick={() => setIsAccountModalOpen(false)}
                  className='w-8 h-8 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
              <div className='space-y-3 max-h-[50vh] overflow-y-auto scrollbar-hide pb-4'>
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      setIsAccountModalOpen(false);
                    }}
                    className={`w-full flex justify-between items-center p-4 md:p-5 rounded-[1.2rem] md:rounded-[1.5rem] transition-colors border ${selectedAccountId === acc.id ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-bg text-text-primary border-transparent hover:border-border'}`}
                  >
                    <span className='font-bold'>{acc.name}</span>
                    <span className='text-sm font-bold opacity-80'>
                      Rp {acc.balance.toLocaleString('id-ID')}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- MODAL PILIH JENIS INSTRUMEN --- */}
      <AnimatePresence>
        {isTypeModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTypeModalOpen(false)}
              className='fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm'
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[90] bg-surface rounded-t-[2.5rem] md:rounded-t-[3rem] p-6 shadow-2xl border-t border-border max-w-md md:max-w-xl mx-auto'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6 flex-shrink-0'></div>
              <div className='flex justify-between items-center mb-6'>
                <h3 className='font-black text-xl text-text-primary flex items-center gap-2'>
                  <PieChart className='w-6 h-6 text-primary' /> Jenis Instrumen
                </h3>
                <button
                  onClick={() => setIsTypeModalOpen(false)}
                  className='w-8 h-8 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto scrollbar-hide pb-4 px-1'>
                {Object.entries(assetTypes).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setFormData({ ...formData, type: key });
                        setIsTypeModalOpen(false);
                      }}
                      className={`w-full flex items-center gap-4 p-4 md:p-5 rounded-[1.2rem] md:rounded-[1.5rem] transition-colors border ${formData.type === key ? 'bg-primary/10 border-primary/30 text-primary shadow-sm' : 'bg-bg text-text-primary border-transparent hover:border-border'}`}
                    >
                      <div
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-[1rem] flex items-center justify-center ${config.bg}`}
                      >
                        <Icon
                          className={`w-5 h-5 md:w-6 md:h-6 ${config.color}`}
                        />
                      </div>
                      <span className='font-bold text-base'>
                        {config.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
