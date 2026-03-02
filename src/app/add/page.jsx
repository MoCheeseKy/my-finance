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
} from 'lucide-react';

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
    { id: 'tabungan', label: 'Tabungan (Savings)' },
    { id: 'investasi', label: 'Investasi' },
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
    const file = e.target.files[0];
    processScan(file, 'bon');
    e.target.value = null;
  };

  const handleScanMutasi = (e) => {
    const file = e.target.files[0];
    processScan(file, 'mutasi');
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

  // NEW: Fungsi untuk Swap Tipe Pengeluaran <-> Pemasukan
  const toggleItemType = (id, currentType) => {
    const newType = currentType === 'expense' ? 'income' : 'expense';
    const newCategory = newType === 'expense' ? 'pokok' : 'gaji'; // Reset kategori sesuai tipe baru
    setScannedItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, type: newType, category: newCategory }
          : item,
      ),
    );
  };

  // NEW: Fungsi untuk Tambah Manual di dalam Drawer
  const handleAddBlankItem = () => {
    setScannedItems([
      ...scannedItems,
      {
        id: Date.now(),
        type: 'expense', // Default pengeluaran
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
      if (numAmount <= 0) continue; // Skip transaksi yang nominalnya 0 / kosong

      newTxns.push({
        id: item.id,
        type: item.type,
        title: item.title || 'Tanpa Nama', // Fallback jika user lupa isi judul
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
    if (!title.trim()) return alert('Namain dulu transaksinya bro! ');
    if (!amount || Number(amount) <= 0)
      return alert('Masukin nominal yang bener! ');
    if (!selectedAccount) return alert('Pilih sumbernya dulu!');

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
          'Saldo di sumber ini nggak cukup bro! Isi dulu pemasukannya ya.',
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
    <main className='min-h-screen bg-bg p-6 max-w-md mx-auto pb-24 relative overflow-x-hidden transition-colors duration-300'>
      <header className='flex items-center gap-4 mb-6 pt-2'>
        <button
          onClick={() => router.back()}
          className='w-10 h-10 bg-surface rounded-2xl flex items-center justify-center shadow-sm border border-border hover:bg-bg-hover transition-colors'
        >
          <ArrowLeft className='w-5 h-5 text-text-primary' />
        </button>
        <h1 className='text-xl font-black text-text-primary'>Catat Dulu Ygy</h1>
      </header>

      {/* QUICK ACTIONS: SCAN BON & MUTASI */}
      <div className='flex gap-3 mb-6'>
        <label className='flex-1 bg-surface border border-border p-3 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-bg-hover transition-colors shadow-sm'>
          <Camera className='w-5 h-5 text-text-secondary' />
          <span className='text-xs font-bold text-text-secondary'>
            Scan Bon
          </span>
          <input
            type='file'
            accept='image/*'
            className='hidden'
            onChange={handleScanBon}
          />
        </label>
        <label className='flex-1 bg-surface border border-border p-3 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-bg-hover transition-colors shadow-sm'>
          <FileText className='w-5 h-5 text-text-secondary' />
          <span className='text-xs font-bold text-text-secondary'>
            File Mutasi
          </span>
          <input
            type='file'
            accept='.pdf,.csv,image/*'
            className='hidden'
            onChange={handleScanMutasi}
          />
        </label>
      </div>

      {isScanning && (
        <div className='text-center text-sm font-bold text-primary mb-6 animate-pulse'>
          AI lagi baca datanya bentar ya...
        </div>
      )}

      {/* TIPE TRANSAKSI (Form Manual) */}
      <div className='flex bg-surface p-1.5 rounded-[1.25rem] shadow-sm border border-border mb-8'>
        <button
          onClick={() => handleTypeChange('expense')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${txnType === 'expense' ? 'bg-expense/10 text-expense shadow-sm' : 'text-text-secondary hover:bg-bg-hover'}`}
        >
          Ngabisin
        </button>
        <button
          onClick={() => handleTypeChange('income')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${txnType === 'income' ? 'bg-income/10 text-income shadow-sm' : 'text-text-secondary hover:bg-bg-hover'}`}
        >
          Dapet Cuan
        </button>
      </div>

      {/* INPUT NOMINAL */}
      <div className='flex flex-col items-center justify-center mb-10'>
        <p className='text-text-secondary font-bold mb-2'>
          Mau masukin berapa?
        </p>
        <div className='flex items-center text-5xl font-black text-text-primary border-b-2 border-border focus-within:border-primary pb-2 transition-colors'>
          <span className='text-3xl mr-2 text-text-secondary'>Rp</span>
          <input
            type='number'
            min='0'
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (['-', 'e', '+', '.'].includes(e.key)) e.preventDefault();
            }}
            placeholder='0'
            className='w-full max-w-[220px] bg-transparent outline-none text-center placeholder:text-text-secondary/50 text-text-primary'
          />
        </div>
      </div>

      <section className='space-y-5'>
        {/* NAMA TRANSAKSI */}
        <div className='bg-surface p-4 rounded-3xl border border-border shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all'>
          <label className='text-[10px] font-black text-text-secondary uppercase tracking-wider block mb-1'>
            Nama Transaksi
          </label>
          <input
            type='text'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              txnType === 'expense'
                ? 'Misal: Makan Siang, Bensin...'
                : 'Misal: Gaji, Jual Barang...'
            }
            className='w-full bg-transparent outline-none font-bold text-text-primary placeholder:text-text-secondary/50 placeholder:font-normal'
          />
        </div>

        {/* INPUT TANGGAL */}
        <div className='bg-surface p-4 rounded-3xl border border-border shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all'>
          <label className='text-[10px] font-black text-text-secondary uppercase tracking-wider block mb-1'>
            Tanggal Transaksi
          </label>
          <div className='flex items-center gap-2'>
            <Calendar className='w-4 h-4 text-text-secondary' />
            <input
              type='date'
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className='w-full bg-transparent outline-none font-bold text-text-primary'
            />
          </div>
        </div>

        {/* SUMBER / TUJUAN */}
        <div className='bg-surface p-4 rounded-3xl border border-border shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all'>
          <label className='text-[10px] font-black text-text-secondary uppercase tracking-wider block mb-1'>
            {txnType === 'expense'
              ? 'Tujuan (Toko / Merchant)'
              : 'Sumber (Pengirim / Instansi)'}
          </label>
          <input
            type='text'
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder='Opsional...'
            className='w-full bg-transparent outline-none font-bold text-text-primary placeholder:text-text-secondary/50 placeholder:font-normal'
          />
        </div>

        {/* SUMBER DANA (ACCOUNT) */}
        {accounts.length === 0 ? (
          <div className='bg-surface p-6 rounded-3xl border border-dashed border-border shadow-sm flex flex-col items-center justify-center text-center gap-2'>
            <div className='w-12 h-12 bg-bg-hover rounded-full flex items-center justify-center mb-2'>
              <Wallet className='w-6 h-6 text-text-secondary' />
            </div>
            <p className='font-bold text-text-primary'>Belum Ada Sumber Dana</p>
            <p className='text-xs text-text-secondary mb-2 px-4'>
              Kamu belum masukin dompet, e-wallet, atau rekening nih.
            </p>
            <button
              type='button'
              onClick={() => router.push('/accounts')}
              className='px-6 py-3 bg-bg-hover text-text-primary text-sm font-bold rounded-2xl hover:bg-border transition-colors'
            >
              Atur Sumber Dana
            </button>
          </div>
        ) : (
          <div
            onClick={() => setIsAccountModalOpen(true)}
            className='bg-surface p-4 rounded-3xl border border-border shadow-sm cursor-pointer hover:border-primary transition-all flex justify-between items-center'
          >
            <div>
              <label className='text-[10px] font-black text-text-secondary uppercase tracking-wider block mb-1'>
                {txnType === 'expense' ? 'Pakai Uang Dari' : 'Masuk Ke Dompet'}
              </label>
              <div className='font-bold text-text-primary text-lg'>
                {accounts.find((a) => a.id === selectedAccount)?.name ||
                  'Pilih Sumber'}
              </div>
            </div>
            <div className='w-10 h-10 bg-bg-hover rounded-full flex items-center justify-center'>
              <ChevronDown className='w-5 h-5 text-text-secondary' />
            </div>
          </div>
        )}

        {/* KATEGORI */}
        <div
          onClick={() => setIsCategoryModalOpen(true)}
          className='bg-surface p-4 rounded-3xl border border-border shadow-sm cursor-pointer hover:border-primary transition-all flex justify-between items-center'
        >
          <div>
            <label className='text-[10px] font-black text-text-secondary uppercase tracking-wider block mb-1'>
              {txnType === 'expense'
                ? 'Kategori Pengeluaran'
                : 'Sumber Pemasukan'}
            </label>
            <div className='font-bold text-text-primary text-lg'>
              {activeCategories.find((c) => c.id === category)?.label ||
                'Pilih Kategori'}
            </div>
          </div>
          <div className='w-10 h-10 bg-bg-hover rounded-full flex items-center justify-center'>
            <ChevronDown className='w-5 h-5 text-text-secondary' />
          </div>
        </div>

        {/* FREKUENSI */}
        {txnType === 'expense' && category === 'tetap' && (
          <div className='bg-primary/5 p-4 rounded-3xl border border-primary/20 shadow-sm flex gap-2 overflow-x-auto scrollbar-hide'>
            {['harian', 'mingguan', 'bulanan', 'tahunan'].map((freq) => (
              <button
                type='button'
                key={freq}
                onClick={() => setFrequency(freq)}
                className={`px-5 py-2.5 rounded-2xl text-sm font-bold capitalize whitespace-nowrap transition-colors border ${frequency === freq ? 'bg-primary text-text-primary shadow-md border-primary' : 'bg-surface text-primary border-primary/20 hover:border-primary/50'}`}
              >
                {freq}
              </button>
            ))}
          </div>
        )}

        {/* TOMBOL SIMPAN MANUAL */}
        <button
          type='button'
          onClick={handleSaveManual}
          disabled={accounts.length === 0}
          className='w-full py-5 bg-gradient-to-r from-primary to-investment text-text-primary font-black rounded-3xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all mt-6 disabled:from-bg-hover disabled:to-bg-hover disabled:text-text-secondary/50 disabled:cursor-not-allowed disabled:shadow-none border-2 border-primary/20'
        >
          Simpan Transaksi
        </button>
      </section>

      {/* --- DRAWER HASIL SCAN --- */}
      {isDrawerOpen && (
        <>
          <div
            className='fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in'
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className='fixed inset-x-0 bottom-0 z-50 bg-bg rounded-t-[2.5rem] shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-full duration-300 max-w-md mx-auto'>
            <div className='p-6 pb-2 border-b border-border flex justify-between items-center bg-surface rounded-t-[2.5rem]'>
              <h3 className='font-black text-xl text-text-primary'>
                Review Hasil Scan
              </h3>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className='p-2 bg-bg-hover rounded-full hover:bg-border transition-colors'
              >
                <X className='w-5 h-5 text-text-secondary' />
              </button>
            </div>

            <div className='p-4 overflow-y-auto flex-1 space-y-4'>
              {scannedItems.map((item) => (
                <div
                  key={item.id}
                  className='bg-surface p-4 rounded-3xl border border-border shadow-sm relative'
                >
                  <button
                    onClick={() => removeScannedItem(item.id)}
                    className='absolute top-4 right-4 p-2 text-expense hover:bg-expense/10 rounded-xl transition-colors'
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>

                  {/* TOMBOL SWAP STATUS */}
                  <div className='mb-3 pr-10'>
                    <button
                      onClick={() => toggleItemType(item.id, item.type)}
                      className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-1.5 rounded-md transition-colors border ${item.type === 'expense' ? 'bg-expense/10 text-expense border-expense/20 hover:bg-expense/20' : 'bg-income/10 text-income border-income/20 hover:bg-income/20'}`}
                      title='Klik untuk menukar status'
                    >
                      <RefreshCcw className='w-3 h-3' />
                      {item.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                    </button>
                  </div>

                  <div className='space-y-3'>
                    <div className='flex gap-2'>
                      <div className='flex-1 bg-bg-hover rounded-xl p-2 px-3 border border-border focus-within:border-primary transition-colors'>
                        <label className='text-[9px] font-bold text-text-secondary block mb-1'>
                          Nama Transaksi
                        </label>
                        <input
                          type='text'
                          value={item.title}
                          onChange={(e) =>
                            updateScannedItem(item.id, 'title', e.target.value)
                          }
                          placeholder='Cth: Beli Kopi'
                          className='w-full bg-transparent outline-none text-sm font-bold text-text-primary'
                        />
                      </div>
                      <div className='flex-1 bg-bg-hover rounded-xl p-2 px-3 border border-border focus-within:border-primary transition-colors'>
                        <label className='text-[9px] font-bold text-text-secondary block mb-1'>
                          Nominal (Rp)
                        </label>
                        <input
                          type='number'
                          value={item.amount}
                          onChange={(e) =>
                            updateScannedItem(item.id, 'amount', e.target.value)
                          }
                          placeholder='0'
                          className='w-full bg-transparent outline-none text-sm font-bold text-text-primary'
                        />
                      </div>
                    </div>

                    <div className='flex gap-2'>
                      <div className='flex-1 bg-bg-hover rounded-xl p-2 px-3 border border-border focus-within:border-primary transition-colors'>
                        <label className='text-[9px] font-bold text-text-secondary block mb-1'>
                          Tanggal
                        </label>
                        <input
                          type='date'
                          value={item.date}
                          onChange={(e) =>
                            updateScannedItem(item.id, 'date', e.target.value)
                          }
                          className='w-full bg-transparent outline-none text-sm font-bold text-text-primary'
                        />
                      </div>
                      <div className='flex-[1.5] bg-bg-hover rounded-xl p-2 px-3 border border-border focus-within:border-primary transition-colors'>
                        <label className='text-[9px] font-bold text-text-secondary block mb-1'>
                          Sumber / Tujuan
                        </label>
                        <input
                          type='text'
                          value={item.source}
                          onChange={(e) =>
                            updateScannedItem(item.id, 'source', e.target.value)
                          }
                          placeholder='Opsional...'
                          className='w-full bg-transparent outline-none text-sm font-bold text-text-primary'
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* TOMBOL TAMBAH MANUAL */}
              <button
                onClick={handleAddBlankItem}
                className='w-full py-4 border-2 border-dashed border-border rounded-3xl text-text-secondary font-bold text-sm flex items-center justify-center gap-2 hover:bg-bg-hover hover:text-text-primary transition-colors mt-2'
              >
                <Plus className='w-5 h-5' />
                Tambah Transaksi Manual
              </button>
            </div>

            <div className='p-6 bg-surface border-t border-border pb-10 rounded-t-3xl'>
              <label className='text-[10px] font-black text-text-secondary uppercase tracking-wider block mb-2'>
                Simpan ke Dompet
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className='w-full bg-bg-hover border border-border p-3 rounded-2xl mb-4 font-bold text-text-primary outline-none focus:border-primary transition-colors'
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Saldo: Rp {acc.balance.toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
              <button
                onClick={handleSaveBatch}
                className='w-full py-4 bg-primary text-text-primary font-black rounded-2xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all'
              >
                Simpan {scannedItems.length} Transaksi
              </button>
            </div>
          </div>
        </>
      )}

      {/* MODAL PILIH SUMBER & KATEGORI */}
      {isAccountModalOpen && (
        <div className='fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
          <div className='bg-surface w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 border border-border'>
            <div className='flex justify-between items-center mb-6'>
              <h3 className='font-black text-xl text-text-primary'>
                Pilih Sumber
              </h3>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className='w-8 h-8 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='space-y-2'>
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => {
                    setSelectedAccount(acc.id);
                    setIsAccountModalOpen(false);
                  }}
                  className={`w-full flex justify-between items-center p-4 rounded-2xl text-left transition-colors border ${selectedAccount === acc.id ? 'bg-primary text-text-primary border-primary' : 'bg-bg-hover text-text-primary border-transparent hover:border-border'}`}
                >
                  <span className='font-bold'>{acc.name}</span>
                  <span
                    className={`text-sm font-bold ${selectedAccount === acc.id ? 'text-text-primary/70' : 'text-text-secondary'}`}
                  >
                    Rp {acc.balance.toLocaleString('id-ID')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className='fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
          <div className='bg-surface w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 border border-border'>
            <div className='flex justify-between items-center mb-6'>
              <h3 className='font-black text-xl text-text-primary'>
                {txnType === 'expense'
                  ? 'Pilih Kategori'
                  : 'Pilih Sumber Pemasukan'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className='w-8 h-8 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='space-y-2'>
              {activeCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setCategory(cat.id);
                    setIsCategoryModalOpen(false);
                  }}
                  className={`w-full p-4 rounded-2xl text-left transition-colors border ${category === cat.id ? 'bg-primary text-text-primary border-primary' : 'bg-bg-hover text-text-primary border-transparent hover:border-border'}`}
                >
                  <span className='font-bold'>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
