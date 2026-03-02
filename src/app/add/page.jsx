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
    <main className='min-h-screen bg-[#FAFAF9] p-6 max-w-md mx-auto pb-24 relative overflow-x-hidden'>
      <header className='flex items-center gap-4 mb-6 pt-2'>
        <button
          onClick={() => router.back()}
          className='w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-stone-200 hover:bg-stone-50 transition-colors'
        >
          <ArrowLeft className='w-5 h-5 text-stone-800' />
        </button>
        <h1 className='text-xl font-black text-stone-800'>Catat Dulu Ygy</h1>
      </header>

      {/* QUICK ACTIONS: SCAN BON & MUTASI */}
      <div className='flex gap-3 mb-6'>
        <label className='flex-1 bg-white border border-stone-200 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-stone-50 transition-colors shadow-sm'>
          <Camera className='w-5 h-5 text-stone-600' />
          <span className='text-xs font-bold text-stone-600'>Scan Bon</span>
          <input
            type='file'
            accept='image/*'
            className='hidden'
            onChange={handleScanBon}
          />
        </label>
        <label className='flex-1 bg-white border border-stone-200 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-stone-50 transition-colors shadow-sm'>
          <FileText className='w-5 h-5 text-stone-600' />
          <span className='text-xs font-bold text-stone-600'>File Mutasi</span>
          <input
            type='file'
            accept='.pdf,.csv,image/*'
            className='hidden'
            onChange={handleScanMutasi}
          />
        </label>
      </div>

      {isScanning && (
        <div className='text-center text-sm font-bold text-blue-600 mb-6 animate-pulse'>
          AI lagi baca datanya bentar ya...
        </div>
      )}

      {/* TIPE TRANSAKSI (Form Manual) */}
      <div className='flex bg-white p-1.5 rounded-[1.25rem] shadow-sm border border-stone-200 mb-8'>
        <button
          onClick={() => handleTypeChange('expense')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${txnType === 'expense' ? 'bg-red-100 text-red-700 shadow-sm' : 'text-stone-400 hover:bg-stone-50'}`}
        >
          Ngabisin
        </button>
        <button
          onClick={() => handleTypeChange('income')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${txnType === 'income' ? 'bg-green-100 text-green-700 shadow-sm' : 'text-stone-400 hover:bg-stone-50'}`}
        >
          Dapet Cuan
        </button>
      </div>

      {/* INPUT NOMINAL */}
      <div className='flex flex-col items-center justify-center mb-10'>
        <p className='text-stone-500 font-bold mb-2'>Mau masukin berapa?</p>
        <div className='flex items-center text-5xl font-black text-stone-800 border-b-2 border-stone-300 focus-within:border-stone-800 pb-2 transition-colors'>
          <span className='text-3xl mr-2 text-stone-600'>Rp</span>
          <input
            type='number'
            min='0'
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (['-', 'e', '+', '.'].includes(e.key)) e.preventDefault();
            }}
            placeholder='0'
            className='w-full max-w-[220px] bg-transparent outline-none text-center placeholder:text-stone-300 text-stone-800'
          />
        </div>
      </div>

      <section className='space-y-5'>
        {/* NAMA TRANSAKSI */}
        <div className='bg-white p-4 rounded-3xl border border-stone-200 shadow-sm focus-within:ring-2 focus-within:ring-stone-800 transition-all'>
          <label className='text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1'>
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
            className='w-full bg-transparent outline-none font-bold text-stone-800 placeholder:text-stone-300 placeholder:font-normal'
          />
        </div>

        {/* INPUT TANGGAL */}
        <div className='bg-white p-4 rounded-3xl border border-stone-200 shadow-sm focus-within:ring-2 focus-within:ring-stone-800 transition-all'>
          <label className='text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1'>
            Tanggal Transaksi
          </label>
          <div className='flex items-center gap-2'>
            <Calendar className='w-4 h-4 text-stone-400' />
            <input
              type='date'
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className='w-full bg-transparent outline-none font-bold text-stone-800'
            />
          </div>
        </div>

        {/* SUMBER / TUJUAN */}
        <div className='bg-white p-4 rounded-3xl border border-stone-200 shadow-sm focus-within:ring-2 focus-within:ring-stone-800 transition-all'>
          <label className='text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1'>
            {txnType === 'expense'
              ? 'Tujuan (Toko / Merchant)'
              : 'Sumber (Pengirim / Instansi)'}
          </label>
          <input
            type='text'
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder='Opsional...'
            className='w-full bg-transparent outline-none font-bold text-stone-800 placeholder:text-stone-300 placeholder:font-normal'
          />
        </div>

        {/* SUMBER DANA (ACCOUNT) */}
        {accounts.length === 0 ? (
          <div className='bg-white p-6 rounded-3xl border border-dashed border-stone-300 shadow-sm flex flex-col items-center justify-center text-center gap-2'>
            <div className='w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mb-2'>
              <Wallet className='w-6 h-6 text-stone-400' />
            </div>
            <p className='font-bold text-stone-800'>Belum Ada Sumber Dana</p>
            <p className='text-xs text-stone-500 mb-2 px-4'>
              Kamu belum masukin dompet, e-wallet, atau rekening nih.
            </p>
            <button
              type='button'
              onClick={() => router.push('/accounts')}
              className='px-6 py-3 bg-stone-100 text-stone-800 text-sm font-bold rounded-2xl hover:bg-stone-200 transition-colors'
            >
              Atur Sumber Dana
            </button>
          </div>
        ) : (
          <div
            onClick={() => setIsAccountModalOpen(true)}
            className='bg-white p-4 rounded-3xl border border-stone-200 shadow-sm cursor-pointer hover:border-stone-400 transition-all flex justify-between items-center'
          >
            <div>
              <label className='text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1'>
                {txnType === 'expense' ? 'Pakai Uang Dari' : 'Masuk Ke Dompet'}
              </label>
              <div className='font-bold text-stone-800 text-lg'>
                {accounts.find((a) => a.id === selectedAccount)?.name ||
                  'Pilih Sumber'}
              </div>
            </div>
            <div className='w-10 h-10 bg-stone-50 rounded-full flex items-center justify-center'>
              <ChevronDown className='w-5 h-5 text-stone-500' />
            </div>
          </div>
        )}

        {/* KATEGORI */}
        <div
          onClick={() => setIsCategoryModalOpen(true)}
          className='bg-white p-4 rounded-3xl border border-stone-200 shadow-sm cursor-pointer hover:border-stone-400 transition-all flex justify-between items-center'
        >
          <div>
            <label className='text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1'>
              {txnType === 'expense'
                ? 'Kategori Pengeluaran'
                : 'Sumber Pemasukan'}
            </label>
            <div className='font-bold text-stone-800 text-lg'>
              {activeCategories.find((c) => c.id === category)?.label ||
                'Pilih Kategori'}
            </div>
          </div>
          <div className='w-10 h-10 bg-stone-50 rounded-full flex items-center justify-center'>
            <ChevronDown className='w-5 h-5 text-stone-500' />
          </div>
        </div>

        {/* FREKUENSI */}
        {txnType === 'expense' && category === 'tetap' && (
          <div className='bg-blue-50 p-4 rounded-3xl border border-blue-200 shadow-sm flex gap-2 overflow-x-auto scrollbar-hide'>
            {['harian', 'mingguan', 'bulanan', 'tahunan'].map((freq) => (
              <button
                type='button'
                key={freq}
                onClick={() => setFrequency(freq)}
                className={`px-5 py-2.5 rounded-2xl text-sm font-bold capitalize whitespace-nowrap transition-colors ${frequency === freq ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 border border-blue-200'}`}
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
          className='w-full py-5 bg-stone-800 text-white font-black rounded-3xl shadow-[0_8px_20px_rgb(0,0,0,0.15)] hover:scale-[1.02] active:scale-[0.98] transition-all mt-6 disabled:bg-stone-300 disabled:cursor-not-allowed'
        >
          Simpan Transaksi
        </button>
      </section>

      {/* --- DRAWER HASIL SCAN --- */}
      {isDrawerOpen && (
        <>
          <div
            className='fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-sm animate-in fade-in'
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className='fixed inset-x-0 bottom-0 z-50 bg-[#FAFAF9] rounded-t-[2.5rem] shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-full duration-300 max-w-md mx-auto'>
            <div className='p-6 pb-2 border-b border-stone-200 flex justify-between items-center bg-white rounded-t-[2.5rem]'>
              <h3 className='font-black text-xl text-stone-800'>
                Review Hasil Scan
              </h3>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className='p-2 bg-stone-100 rounded-full hover:bg-stone-200'
              >
                <X className='w-5 h-5 text-stone-600' />
              </button>
            </div>

            <div className='p-4 overflow-y-auto flex-1 space-y-4'>
              {scannedItems.map((item) => (
                <div
                  key={item.id}
                  className='bg-white p-4 rounded-3xl border border-stone-200 shadow-sm relative'
                >
                  <button
                    onClick={() => removeScannedItem(item.id)}
                    className='absolute top-4 right-4 p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors'
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>

                  {/* TOMBOL SWAP STATUS */}
                  <div className='mb-3 pr-10'>
                    <button
                      onClick={() => toggleItemType(item.id, item.type)}
                      className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-1.5 rounded-md transition-colors ${item.type === 'expense' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                      title='Klik untuk menukar status'
                    >
                      <RefreshCcw className='w-3 h-3' />
                      {item.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                    </button>
                  </div>

                  <div className='space-y-3'>
                    <div className='flex gap-2'>
                      <div className='flex-1 bg-stone-50 rounded-xl p-2 px-3 border border-stone-100 focus-within:border-stone-400'>
                        <label className='text-[9px] font-bold text-stone-400 block'>
                          Nama Transaksi
                        </label>
                        <input
                          type='text'
                          value={item.title}
                          onChange={(e) =>
                            updateScannedItem(item.id, 'title', e.target.value)
                          }
                          placeholder='Cth: Beli Kopi'
                          className='w-full bg-transparent outline-none text-sm font-bold text-stone-800'
                        />
                      </div>
                      <div className='flex-1 bg-stone-50 rounded-xl p-2 px-3 border border-stone-100 focus-within:border-stone-400'>
                        <label className='text-[9px] font-bold text-stone-400 block'>
                          Nominal (Rp)
                        </label>
                        <input
                          type='number'
                          value={item.amount}
                          onChange={(e) =>
                            updateScannedItem(item.id, 'amount', e.target.value)
                          }
                          placeholder='0'
                          className='w-full bg-transparent outline-none text-sm font-bold text-stone-800'
                        />
                      </div>
                    </div>

                    <div className='flex gap-2'>
                      <div className='flex-1 bg-stone-50 rounded-xl p-2 px-3 border border-stone-100 focus-within:border-stone-400'>
                        <label className='text-[9px] font-bold text-stone-400 block'>
                          Tanggal
                        </label>
                        <input
                          type='date'
                          value={item.date}
                          onChange={(e) =>
                            updateScannedItem(item.id, 'date', e.target.value)
                          }
                          className='w-full bg-transparent outline-none text-sm font-bold text-stone-800'
                        />
                      </div>
                      <div className='flex-[1.5] bg-stone-50 rounded-xl p-2 px-3 border border-stone-100 focus-within:border-stone-400'>
                        <label className='text-[9px] font-bold text-stone-400 block'>
                          Sumber / Tujuan
                        </label>
                        <input
                          type='text'
                          value={item.source}
                          onChange={(e) =>
                            updateScannedItem(item.id, 'source', e.target.value)
                          }
                          placeholder='Opsional...'
                          className='w-full bg-transparent outline-none text-sm font-bold text-stone-800'
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* TOMBOL TAMBAH MANUAL */}
              <button
                onClick={handleAddBlankItem}
                className='w-full py-4 border-2 border-dashed border-stone-300 rounded-3xl text-stone-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-stone-100 hover:text-stone-700 transition-colors mt-2'
              >
                <Plus className='w-5 h-5' />
                Tambah Transaksi Manual
              </button>
            </div>

            <div className='p-6 bg-white border-t border-stone-200 pb-10'>
              <label className='text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-2'>
                Simpan ke Dompet
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className='w-full bg-stone-50 border border-stone-200 p-3 rounded-2xl mb-4 font-bold text-stone-700 outline-none'
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Saldo: Rp {acc.balance.toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
              <button
                onClick={handleSaveBatch}
                className='w-full py-4 bg-stone-800 text-white font-black rounded-2xl shadow-lg hover:bg-stone-900 active:scale-[0.98] transition-all'
              >
                Simpan {scannedItems.length} Transaksi
              </button>
            </div>
          </div>
        </>
      )}

      {/* MODAL PILIH SUMBER & KATEGORI */}
      {isAccountModalOpen && (
        <div className='fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
          <div className='bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300'>
            <div className='flex justify-between items-center mb-6'>
              <h3 className='font-black text-xl text-stone-800'>
                Pilih Sumber
              </h3>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className='w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200'
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
                  className={`w-full flex justify-between items-center p-4 rounded-2xl text-left transition-colors border ${selectedAccount === acc.id ? 'bg-stone-800 text-white border-stone-800' : 'bg-stone-50 text-stone-700 border-transparent hover:border-stone-200'}`}
                >
                  <span className='font-bold'>{acc.name}</span>
                  <span
                    className={`text-sm font-bold ${selectedAccount === acc.id ? 'text-stone-300' : 'text-stone-500'}`}
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
        <div className='fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
          <div className='bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300'>
            <div className='flex justify-between items-center mb-6'>
              <h3 className='font-black text-xl text-stone-800'>
                {txnType === 'expense'
                  ? 'Pilih Kategori'
                  : 'Pilih Sumber Pemasukan'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className='w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200'
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
                  className={`w-full p-4 rounded-2xl text-left transition-colors border ${category === cat.id ? 'bg-stone-800 text-white border-stone-800' : 'bg-stone-50 text-stone-700 border-transparent hover:border-stone-200'}`}
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
