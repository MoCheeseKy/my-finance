'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/storage';
import {
  ArrowLeft,
  ChevronDown,
  X,
  Wallet,
  Camera,
  FileText,
  Trash2,
  Calendar,
  Plus,
  RefreshCcw,
  Sparkles,
  Search,
  Tags,
  Briefcase,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

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

export default function AddRecord() {
  const router = useRouter();
  const [txnType, setTxnType] = useState('expense');
  const [accounts, setAccounts] = useState([]);

  // Dapatkan tanggal lokal hari ini (YYYY-MM-DD)
  const todayDate = new Date().toLocaleDateString('en-CA');

  // State Form Manual
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [category, setCategory] = useState('pokok');
  const [frequency, setFrequency] = useState('bulanan');
  const [date, setDate] = useState(todayDate);

  // State Modals & Scanner
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // State Scanner & Drawer
  const [isScanning, setIsScanning] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);

  // --- KATEGORI ---
  const expenseCategories = [
    { id: 'pokok', label: 'Pokok (Needs)' },
    { id: 'keinginan', label: 'Keinginan (Wants)' },
    { id: 'tetap', label: 'Tetap (Rutinitas)' },
  ];

  const incomeCategories = [
    { id: 'uang_jajan', label: 'Uang Jajan / Ortu' },
    { id: 'gaji', label: 'Gaji / Freelance' },
    { id: 'jualan', label: 'Hasil Jualan' },
    { id: 'bonus', label: 'Bonus / Hadiah' },
    { id: 'bunga', label: 'Bunga / Investasi' },
  ];

  const activeCategories =
    txnType === 'expense' ? expenseCategories : incomeCategories;

  const handleTypeChange = (type) => {
    setTxnType(type);
    setCategory(
      type === 'expense' ? expenseCategories[0].id : incomeCategories[0].id,
    );
  };

  useEffect(() => {
    const loadInitialData = async () => {
      let accs = await db.getItem('accounts');
      if (!accs || accs.length === 0) {
        const defaultCash = [{ id: 'cash', name: 'Cash', balance: 0 }];
        await db.setItem('accounts', defaultCash);
        accs = defaultCash;
      }
      setAccounts(accs);
      if (accs.length > 0) setSelectedAccount(accs[0].id);
    };
    loadInitialData();
  }, []);

  // --- LOGIC HIT API SCANNER ---
  const processScan = async (file, type) => {
    if (!file) return;
    setIsScanning(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/scan-add', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Gagal scan dari server');

      const result = await response.json();

      const dataWithIds = result.data.map((item, index) => ({
        ...item,
        id: Date.now() + index,
        date: item.date || todayDate,
      }));

      setScannedItems(dataWithIds);
      setIsDrawerOpen(true);
    } catch (error) {
      console.error('Error scanning:', error);
      alert('Waduh, gagal baca datanya nih. Coba lagi ya!');
    } finally {
      setIsScanning(false);
    }
  };

  const handleScanBon = (e) => {
    processScan(e.target.files[0], 'bon');
    e.target.value = null;
  };

  const handleScanMutasi = (e) => {
    processScan(e.target.files[0], 'mutasi');
    e.target.value = null;
  };

  // --- LOGIC DRAWER ITEM ---
  const updateScannedItem = (id, field, value) => {
    setScannedItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const removeScannedItem = (id) => {
    setScannedItems((items) => items.filter((item) => item.id !== id));
    if (scannedItems.length <= 1) setIsDrawerOpen(false);
  };

  const toggleItemType = (id, currentType) => {
    const newType = currentType === 'expense' ? 'income' : 'expense';
    const newCategory = newType === 'expense' ? 'pokok' : 'gaji';
    setScannedItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, type: newType, category: newCategory }
          : item,
      ),
    );
  };

  const handleAddBlankItem = () => {
    setScannedItems([
      ...scannedItems,
      {
        id: Date.now(),
        type: 'expense',
        title: '',
        amount: '',
        source: '',
        category: 'pokok',
        date: todayDate,
      },
    ]);
  };

  // --- SIMPAN MASSAL (BATCH) DARI DRAWER ---
  const handleSaveBatch = async () => {
    if (!selectedAccount) return alert('Pilih sumber dana dulu bro!');
    if (scannedItems.length === 0)
      return alert('Nggak ada data yang disimpen!');

    const currentAccs = [...accounts];
    const accIndex = currentAccs.findIndex((a) => a.id === selectedAccount);
    const newTxns = [];
    let totalExpense = 0;
    let totalIncome = 0;

    for (const item of scannedItems) {
      const numAmount = Number(item.amount);
      if (numAmount <= 0) continue;

      newTxns.push({
        id: item.id,
        type: item.type,
        title: item.title || 'Tanpa Nama',
        amount: numAmount,
        source: item.source || '-',
        accountId: selectedAccount,
        category: item.category,
        date: new Date(item.date).toISOString(),
      });

      if (item.type === 'expense') {
        currentAccs[accIndex].balance -= numAmount;
        totalExpense += numAmount;
      } else {
        currentAccs[accIndex].balance += numAmount;
        totalIncome += numAmount;
      }
    }

    await db.setItem(
      'expense',
      ((await db.getItem('expense')) || 0) + totalExpense,
    );
    await db.setItem(
      'income',
      ((await db.getItem('income')) || 0) + totalIncome,
    );
    await db.setItem('accounts', currentAccs);
    await db.setItem(
      'balance',
      currentAccs.reduce((sum, acc) => sum + acc.balance, 0),
    );

    const history = (await db.getItem('transactions')) || [];
    await db.setItem('transactions', [...newTxns, ...history]);

    router.push('/');
  };

  // --- SIMPAN MANUAL (DARI FORM UTAMA) ---
  const handleSaveManual = async () => {
    if (!title.trim()) return alert('Namain dulu transaksinya bro!');
    if (!amount || Number(amount) <= 0)
      return alert('Masukin nominal yang valid!');
    if (!selectedAccount) return alert('Pilih sumber dananya dulu!');

    const numAmount = Number(amount);
    const currentAccs = [...accounts];

    const newTxn = {
      id: Date.now(),
      type: txnType,
      title: title.trim(),
      amount: numAmount,
      source: sourceName.trim() || '-',
      accountId: selectedAccount,
      category,
      frequency:
        txnType === 'expense' && category === 'tetap' ? frequency : null,
      date: new Date(date).toISOString(),
    };

    const accIndex = currentAccs.findIndex((a) => a.id === selectedAccount);

    if (txnType === 'expense') {
      if (currentAccs[accIndex].balance < numAmount) {
        return alert(
          'Saldo di sumber ini tidak cukup. Silakan isi pemasukannya dulu.',
        );
      }
      currentAccs[accIndex].balance -= numAmount;
      await db.setItem(
        'expense',
        ((await db.getItem('expense')) || 0) + numAmount,
      );
    } else if (txnType === 'income') {
      currentAccs[accIndex].balance += numAmount;
      await db.setItem(
        'income',
        ((await db.getItem('income')) || 0) + numAmount,
      );
    }

    await db.setItem('accounts', currentAccs);
    await db.setItem(
      'balance',
      currentAccs.reduce((sum, acc) => sum + acc.balance, 0),
    );

    const history = (await db.getItem('transactions')) || [];
    await db.setItem('transactions', [newTxn, ...history]);

    router.push('/');
  };

  return (
    <main className='min-h-screen bg-bg relative overflow-x-hidden font-sans pb-28 md:pb-12 md:pl-32 lg:pl-36 transition-all duration-500'>
      {/* Background Soft Glow */}
      <div className='absolute top-[-5%] left-[-10%] w-64 h-64 md:w-96 md:h-96 lg:w-[40rem] lg:h-[40rem] bg-primary/20 rounded-full mix-blend-multiply filter blur-[80px] lg:blur-[120px] z-0 pointer-events-none'></div>

      <motion.div
        variants={pageVariants}
        initial='hidden'
        animate='visible'
        className='relative z-10 p-6 max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto'
      >
        {/* HEADER */}
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
            Catat Transaksi
          </h1>
        </header>

        {/* LOADING OVERLAY */}
        <AnimatePresence>
          {isScanning && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className='flex items-center justify-center gap-3 text-sm font-bold text-primary p-4 bg-primary/10 rounded-[1.5rem] border border-primary/20 overflow-hidden'
            >
              <Sparkles className='w-5 h-5 animate-spin' /> AI sedang
              mengekstrak data...
            </motion.div>
          )}
        </AnimatePresence>

        {/* GRID LAYOUT UNTUK DESKTOP */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10'>
          {/* KOLOM KIRI (Quick Actions, Tipe, Input Nominal) */}
          <div className='lg:col-span-5 flex flex-col gap-6'>
            {/* QUICK ACTIONS */}
            <motion.div variants={itemVariants} className='flex gap-3'>
              <label className='flex-1 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4 md:p-5 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group'>
                <div className='w-10 h-10 md:w-12 md:h-12 bg-surface rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300'>
                  <Camera className='w-5 h-5 md:w-6 md:h-6 text-primary' />
                </div>
                <span className='text-xs md:text-sm font-bold text-text-primary'>
                  Scan Bon
                </span>
                <input
                  type='file'
                  accept='image/*'
                  className='hidden'
                  onChange={handleScanBon}
                />
              </label>
              <label className='flex-1 bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 p-4 md:p-5 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-secondary/40 hover:shadow-md transition-all group'>
                <div className='w-10 h-10 md:w-12 md:h-12 bg-surface rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300'>
                  <FileText className='w-5 h-5 md:w-6 md:h-6 text-secondary' />
                </div>
                <span className='text-xs md:text-sm font-bold text-text-primary'>
                  File Mutasi
                </span>
                <input
                  type='file'
                  accept='.pdf,.csv,image/*'
                  className='hidden'
                  onChange={handleScanMutasi}
                />
              </label>
            </motion.div>

            {/* BENTO CARD: Tipe & Nominal (Desktop di-group dalam 1 card biar rapi) */}
            <motion.div
              variants={itemVariants}
              className='bg-surface/80 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col gap-8 lg:mt-2'
            >
              {/* TIPE TRANSAKSI */}
              <div className='relative flex bg-bg p-1.5 rounded-[1.5rem] md:rounded-[2rem] shadow-inner border border-border'>
                {['expense', 'income'].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleTypeChange(type)}
                    className={`relative flex-1 py-3.5 md:py-4 text-sm md:text-base font-bold rounded-[1.2rem] md:rounded-[1.7rem] z-10 transition-colors flex items-center justify-center gap-2 ${txnType === type ? (type === 'expense' ? 'text-expense' : 'text-income') : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    {type === 'expense' ? (
                      <>
                        <TrendingDown className='w-4 h-4 md:w-5 md:h-5' />{' '}
                        Ngabisin
                      </>
                    ) : (
                      <>
                        <TrendingUp className='w-4 h-4 md:w-5 md:h-5' /> Dapet
                        Cuan
                      </>
                    )}
                    {txnType === type && (
                      <motion.div
                        layoutId='active-type'
                        className={`absolute inset-0 rounded-[1.2rem] md:rounded-[1.7rem] -z-10 shadow-sm border ${type === 'expense' ? 'bg-expense/10 border-expense/20' : 'bg-income/10 border-income/20'}`}
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

              {/* INPUT NOMINAL */}
              <div className='flex flex-col items-center justify-center'>
                <p className='text-text-secondary font-bold mb-3 md:mb-5 text-sm md:text-base uppercase tracking-wider'>
                  Masukkan Nominal
                </p>
                <div className='flex items-center text-5xl md:text-6xl font-black text-text-primary border-b-2 border-border focus-within:border-primary pb-2 transition-colors group w-full justify-center'>
                  <span className='text-3xl md:text-4xl mr-2 text-text-secondary group-focus-within:text-primary transition-colors'>
                    Rp
                  </span>
                  <input
                    type='number'
                    min='0'
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (['-', 'e', '+', '.'].includes(e.key))
                        e.preventDefault();
                    }}
                    placeholder='0'
                    className='w-full max-w-[250px] md:max-w-[300px] bg-transparent outline-none text-center placeholder:text-text-secondary/30 text-text-primary'
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* KOLOM KANAN (Form Detail) */}
          <div className='lg:col-span-7'>
            <motion.section variants={itemVariants} className='space-y-4'>
              {/* NAMA & TANGGAL (Bento Row) */}
              <div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
                <div className='md:col-span-3 bg-surface/80 backdrop-blur-md p-5 rounded-[1.5rem] md:rounded-[2rem] border border-border shadow-sm focus-within:ring-2 focus-within:ring-primary/30 transition-all'>
                  <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5'>
                    Nama Transaksi
                  </label>
                  <input
                    type='text'
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      txnType === 'expense' ? 'Makan Siang...' : 'Gaji...'
                    }
                    className='w-full bg-transparent outline-none font-bold text-text-primary placeholder:text-text-secondary/50 placeholder:font-normal text-sm md:text-base'
                  />
                </div>

                {/* Tanggal (Trik overlay agar seluruh kotak bisa di-klik) */}
                <div className='md:col-span-2 bg-surface/80 backdrop-blur-md p-5 rounded-[1.5rem] md:rounded-[2rem] border border-border shadow-sm focus-within:ring-2 focus-within:ring-primary/30 transition-all relative group flex flex-col justify-center'>
                  <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5 group-hover:text-primary transition-colors'>
                    Tanggal
                  </label>
                  <div className='flex items-center justify-between'>
                    <div className='font-bold text-text-primary text-sm md:text-base'>
                      {date
                        ? format(new Date(date), 'dd MMM yyyy', {
                            locale: localeId,
                          })
                        : 'Pilih Tanggal'}
                    </div>
                    <Calendar className='w-4 h-4 md:w-5 md:h-5 text-text-secondary group-hover:text-primary transition-colors flex-shrink-0' />
                  </div>
                  <input
                    type='date'
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10'
                  />
                </div>
              </div>

              {/* SUMBER / TUJUAN OPSIONAL */}
              <div className='bg-surface/80 backdrop-blur-md p-5 rounded-[1.5rem] md:rounded-[2rem] border border-border shadow-sm focus-within:ring-2 focus-within:ring-primary/30 transition-all'>
                <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5'>
                  {txnType === 'expense'
                    ? 'Tujuan (Merchant / Orang)'
                    : 'Sumber (Instansi / Orang)'}
                </label>
                <input
                  type='text'
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder='Opsional, cth: Indomaret, Mas Budi...'
                  className='w-full bg-transparent outline-none font-bold text-text-primary placeholder:text-text-secondary/50 placeholder:font-normal text-sm md:text-base'
                />
              </div>

              {/* SUMBER DANA & KATEGORI (Bento Row Desktop) */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div
                  onClick={() => setIsAccountModalOpen(true)}
                  className='bg-surface/80 backdrop-blur-md p-5 rounded-[1.5rem] md:rounded-[2rem] border border-border shadow-sm cursor-pointer hover:border-primary/50 transition-all flex justify-between items-center group'
                >
                  <div>
                    <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-wider block mb-1 group-hover:text-primary transition-colors'>
                      {txnType === 'expense'
                        ? 'Pakai Uang Dari'
                        : 'Masuk Ke Dompet'}
                    </label>
                    <div className='font-bold text-text-primary text-base md:text-lg'>
                      {accounts.find((a) => a.id === selectedAccount)?.name ||
                        'Pilih Sumber'}
                    </div>
                  </div>
                  <div className='w-10 h-10 md:w-12 md:h-12 bg-bg group-hover:bg-primary/10 rounded-full flex items-center justify-center transition-colors'>
                    <ChevronDown className='w-5 h-5 text-text-secondary group-hover:text-primary transition-colors' />
                  </div>
                </div>

                <div
                  onClick={() => setIsCategoryModalOpen(true)}
                  className='bg-surface/80 backdrop-blur-md p-5 rounded-[1.5rem] md:rounded-[2rem] border border-border shadow-sm cursor-pointer hover:border-primary/50 transition-all flex justify-between items-center group'
                >
                  <div>
                    <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-wider block mb-1 group-hover:text-primary transition-colors'>
                      {txnType === 'expense'
                        ? 'Kategori Pengeluaran'
                        : 'Sumber Pemasukan'}
                    </label>
                    <div className='font-bold text-text-primary text-base md:text-lg'>
                      {activeCategories.find((c) => c.id === category)?.label ||
                        'Pilih Kategori'}
                    </div>
                  </div>
                  <div className='w-10 h-10 md:w-12 md:h-12 bg-bg group-hover:bg-primary/10 rounded-full flex items-center justify-center transition-colors'>
                    <ChevronDown className='w-5 h-5 text-text-secondary group-hover:text-primary transition-colors' />
                  </div>
                </div>
              </div>

              {/* FREKUENSI KHUSUS PENGELUARAN TETAP */}
              <AnimatePresence>
                {txnType === 'expense' && category === 'tetap' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className='bg-primary/5 p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-primary/20 flex gap-2 overflow-x-auto scrollbar-hide'
                  >
                    {['harian', 'mingguan', 'bulanan', 'tahunan'].map(
                      (freq) => (
                        <button
                          type='button'
                          key={freq}
                          onClick={() => setFrequency(freq)}
                          className={`px-5 py-2.5 md:py-3 rounded-[1rem] text-sm md:text-base font-bold capitalize whitespace-nowrap transition-colors border ${frequency === freq ? 'bg-primary text-text-primary shadow-md border-primary' : 'bg-surface/80 backdrop-blur-md text-primary border-primary/20 hover:border-primary/50'}`}
                        >
                          {freq}
                        </button>
                      ),
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* TOMBOL SIMPAN MANUAL */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveManual}
                disabled={accounts.length === 0}
                className='w-full py-5 md:py-6 bg-gradient-to-r from-primary to-primary-hover text-surface font-black rounded-[1.5rem] md:rounded-[2rem] shadow-[0_15px_30px_rgb(220,198,255,0.4)] dark:shadow-[0_15px_30px_rgb(155,126,222,0.2)] mt-6 border border-white/20 text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all'
              >
                Simpan Transaksi
              </motion.button>
            </motion.section>
          </div>
        </div>
      </motion.div>

      {/* --- DRAWER HASIL SCAN --- */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='fixed inset-0 z-[40] bg-black/40 backdrop-blur-sm'
              onClick={() => setIsDrawerOpen(false)}
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[50] bg-bg rounded-t-[2.5rem] md:rounded-t-[3rem] shadow-2xl max-h-[90vh] flex flex-col max-w-md md:max-w-2xl mx-auto'
            >
              <div className='p-6 pb-4 border-b border-border flex justify-between items-center bg-surface rounded-t-[2.5rem] md:rounded-t-[3rem]'>
                <div className='flex items-center gap-3'>
                  <div className='w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center'>
                    <Search className='w-6 h-6 text-primary' />
                  </div>
                  <div>
                    <h3 className='font-black text-xl text-text-primary'>
                      Review Hasil Scan
                    </h3>
                    <p className='text-xs font-medium text-text-secondary mt-0.5'>
                      Pastikan data sudah benar.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className='w-10 h-10 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <div className='p-4 md:p-6 overflow-y-auto flex-1 space-y-4 bg-bg'>
                {scannedItems.length === 0 ? (
                  <p className='text-center text-text-secondary font-bold py-10'>
                    Belum ada item ditambahkan.
                  </p>
                ) : (
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    {scannedItems.map((item) => (
                      <div
                        key={item.id}
                        className='bg-surface p-4 rounded-[1.5rem] border border-border shadow-sm relative group flex flex-col justify-between'
                      >
                        <button
                          onClick={() => removeScannedItem(item.id)}
                          className='absolute top-4 right-4 p-2 text-expense hover:bg-expense/10 rounded-xl transition-colors z-10'
                        >
                          <Trash2 className='w-4 h-4' />
                        </button>

                        <div className='mb-4 pr-10'>
                          <button
                            onClick={() => toggleItemType(item.id, item.type)}
                            className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors border ${item.type === 'expense' ? 'bg-expense/10 text-expense border-expense/20 hover:bg-expense/20' : 'bg-income/10 text-income border-income/20 hover:bg-income/20'}`}
                          >
                            <RefreshCcw className='w-3 h-3' />
                            {item.type === 'expense'
                              ? 'Pengeluaran'
                              : 'Pemasukan'}
                          </button>
                        </div>

                        <div className='space-y-3'>
                          <div className='flex gap-2'>
                            <div className='flex-1 bg-bg/50 rounded-2xl p-2.5 px-3.5 border border-border focus-within:border-primary transition-colors'>
                              <label className='text-[9px] font-bold text-text-secondary block mb-1'>
                                Nama Transaksi
                              </label>
                              <input
                                type='text'
                                value={item.title}
                                onChange={(e) =>
                                  updateScannedItem(
                                    item.id,
                                    'title',
                                    e.target.value,
                                  )
                                }
                                placeholder='Cth: Beli Kopi'
                                className='w-full bg-transparent outline-none text-sm font-bold text-text-primary'
                              />
                            </div>
                            <div className='flex-1 bg-bg/50 rounded-2xl p-2.5 px-3.5 border border-border focus-within:border-primary transition-colors'>
                              <label className='text-[9px] font-bold text-text-secondary block mb-1'>
                                Nominal (Rp)
                              </label>
                              <input
                                type='number'
                                value={item.amount}
                                onChange={(e) =>
                                  updateScannedItem(
                                    item.id,
                                    'amount',
                                    e.target.value,
                                  )
                                }
                                placeholder='0'
                                className='w-full bg-transparent outline-none text-sm font-bold text-text-primary'
                              />
                            </div>
                          </div>

                          <div className='flex gap-2'>
                            <div className='flex-1 bg-bg/50 rounded-2xl p-2.5 px-3.5 border border-border focus-within:border-primary transition-colors relative group/date flex flex-col justify-center'>
                              <label className='text-[9px] font-bold text-text-secondary block mb-1 group-hover/date:text-primary transition-colors'>
                                Tanggal
                              </label>
                              <div className='text-sm font-bold text-text-primary flex justify-between items-center'>
                                <span>
                                  {item.date
                                    ? format(
                                        new Date(item.date),
                                        'dd MMM yyyy',
                                        { locale: localeId },
                                      )
                                    : 'Pilih'}
                                </span>
                              </div>
                              <input
                                type='date'
                                value={item.date}
                                onChange={(e) =>
                                  updateScannedItem(
                                    item.id,
                                    'date',
                                    e.target.value,
                                  )
                                }
                                className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10'
                              />
                            </div>
                            <div className='flex-[1.5] bg-bg/50 rounded-2xl p-2.5 px-3.5 border border-border focus-within:border-primary transition-colors'>
                              <label className='text-[9px] font-bold text-text-secondary block mb-1'>
                                Sumber / Tujuan
                              </label>
                              <input
                                type='text'
                                value={item.source}
                                onChange={(e) =>
                                  updateScannedItem(
                                    item.id,
                                    'source',
                                    e.target.value,
                                  )
                                }
                                placeholder='Opsional...'
                                className='w-full bg-transparent outline-none text-sm font-bold text-text-primary'
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleAddBlankItem}
                  className='w-full md:w-auto md:px-8 mx-auto py-4 border-2 border-dashed border-border rounded-[1.5rem] text-text-secondary font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface hover:text-text-primary hover:border-primary/40 transition-colors mt-4'
                >
                  <Plus className='w-5 h-5' /> Tambah Transaksi Manual
                </button>
              </div>

              {/* BAGIAN SIMPAN KE DOMPET (BATCH) */}
              <div className='p-6 bg-surface border-t border-border pb-8 md:rounded-b-[3rem]'>
                <label className='text-[10px] font-black text-text-secondary uppercase tracking-wider block mb-2'>
                  Simpan ke Dompet
                </label>

                <div
                  onClick={() => setIsAccountModalOpen(true)}
                  className='bg-bg border border-border p-4 rounded-[1.5rem] mb-5 shadow-sm cursor-pointer hover:border-primary/50 transition-all flex justify-between items-center group md:max-w-md'
                >
                  <div className='font-bold text-text-primary text-base'>
                    {accounts.find((a) => a.id === selectedAccount)?.name ||
                      'Pilih Sumber'}
                    {selectedAccount && (
                      <span className='text-xs font-medium text-text-secondary ml-2 whitespace-nowrap hidden sm:inline-block'>
                        (Rp{' '}
                        {accounts
                          .find((a) => a.id === selectedAccount)
                          ?.balance.toLocaleString('id-ID')}
                        )
                      </span>
                    )}
                  </div>
                  <div className='w-8 h-8 bg-surface group-hover:bg-primary/10 rounded-full flex items-center justify-center transition-colors'>
                    <ChevronDown className='w-5 h-5 text-text-secondary group-hover:text-primary transition-colors' />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveBatch}
                  className='w-full py-4 md:py-5 bg-gradient-to-r from-primary to-primary-hover text-surface font-black rounded-[1.5rem] shadow-[0_10px_20px_rgb(220,198,255,0.4)] dark:shadow-[0_10px_20px_rgb(155,126,222,0.2)] md:max-w-md text-lg'
                >
                  Simpan {scannedItems.length} Transaksi
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- MODAL PILIH DOMPET (REUSABLE) --- */}
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
              className='fixed inset-x-0 bottom-0 z-[90] bg-surface rounded-t-[2.5rem] p-6 shadow-2xl border-t border-border max-w-md mx-auto'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6'></div>
              <h3 className='font-black text-xl text-text-primary mb-6 flex items-center gap-2'>
                <Wallet className='w-6 h-6 text-primary' /> Pilih Dompet
              </h3>
              <div className='space-y-3 max-h-[50vh] overflow-y-auto scrollbar-hide pb-4'>
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      setSelectedAccount(acc.id);
                      setIsAccountModalOpen(false);
                    }}
                    className={`w-full flex justify-between items-center p-4 rounded-[1.2rem] transition-colors border ${selectedAccount === acc.id ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-bg text-text-primary border-transparent hover:border-border'}`}
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

      {/* --- MODAL KATEGORI --- */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategoryModalOpen(false)}
              className='fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm'
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[90] bg-surface rounded-t-[2.5rem] p-6 shadow-2xl border-t border-border max-w-md mx-auto'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6'></div>
              <h3 className='font-black text-xl text-text-primary mb-6 flex items-center gap-2'>
                {txnType === 'expense' ? (
                  <>
                    <Tags className='w-6 h-6 text-expense' /> Kategori
                    Pengeluaran
                  </>
                ) : (
                  <>
                    <Briefcase className='w-6 h-6 text-income' /> Sumber
                    Pemasukan
                  </>
                )}
              </h3>
              <div className='space-y-3 max-h-[50vh] overflow-y-auto scrollbar-hide pb-4'>
                {activeCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setCategory(cat.id);
                      setIsCategoryModalOpen(false);
                    }}
                    className={`w-full text-left p-4 rounded-[1.2rem] transition-colors border ${category === cat.id ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-bg text-text-primary border-transparent hover:border-border'}`}
                  >
                    <span className='font-bold'>{cat.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
