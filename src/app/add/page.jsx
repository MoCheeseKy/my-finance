'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/storage';
import { ArrowLeft, ChevronDown, X, Wallet } from 'lucide-react';

export default function AddRecord() {
  const router = useRouter();
  const [txnType, setTxnType] = useState('expense');
  const [accounts, setAccounts] = useState([]);

  // State Form
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [category, setCategory] = useState('pokok'); // Default awal
  const [frequency, setFrequency] = useState('bulanan');

  // State Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // --- ARRAY KATEGORI DIPISAH ---
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

  // Logic nentuin kategori mana yang lagi aktif
  const activeCategories =
    txnType === 'expense' ? expenseCategories : incomeCategories;

  // Logic pas ganti Tab (Biar kategorinya keriset otomatis)
  const handleTypeChange = (type) => {
    setTxnType(type);
    // Auto-select kategori pertama dari list yang baru biar ga nyangkut
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
      if (accs.length > 0) {
        setSelectedAccount(accs[0].id);
      }
    };
    loadInitialData();
  }, []);

  const handleSave = async () => {
    if (!title.trim()) return alert('Namain dulu transaksinya bro! 📝');
    if (!amount || Number(amount) <= 0)
      return alert('Masukin nominal yang bener! 💸');
    if (!selectedAccount) return alert('Pilih sumbernya dulu!');

    const numAmount = Number(amount);
    const currentAccs = [...accounts];

    const newTxn = {
      id: Date.now(),
      type: txnType,
      title: title.trim(),
      amount: numAmount,
      accountId: selectedAccount,
      category,
      frequency:
        txnType === 'expense' && category === 'tetap' ? frequency : null,
      date: new Date().toISOString(),
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
    <main className='min-h-screen bg-[#FAFAF9] p-6 max-w-md mx-auto pb-24 relative'>
      <header className='flex items-center gap-4 mb-8 pt-2'>
        <button
          onClick={() => router.back()}
          className='w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-stone-200 hover:bg-stone-50 transition-colors'
        >
          <ArrowLeft className='w-5 h-5 text-stone-800' />
        </button>
        <h1 className='text-xl font-black text-stone-800'>Catat Dulu Ygy</h1>
      </header>

      {/* TIPE TRANSAKSI (Pakai handleTypeChange) */}
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
              if (
                e.key === '-' ||
                e.key === 'e' ||
                e.key === '+' ||
                e.key === '.'
              )
                e.preventDefault();
            }}
            placeholder='0'
            className='w-full max-w-[220px] bg-transparent outline-none text-center placeholder:text-stone-300 text-stone-800'
          />
        </div>
      </div>

      <section className='space-y-5'>
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

        {/* SUMBER DANA */}
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

        {/* KATEGORI DINAMIS */}
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

        {/* FREKUENSI (Hanya muncul kalau Expense & Kategori Tetap) */}
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

        <button
          type='button'
          onClick={handleSave}
          disabled={accounts.length === 0}
          className='w-full py-5 bg-stone-800 text-white font-black rounded-3xl shadow-[0_8px_20px_rgb(0,0,0,0.15)] hover:scale-[1.02] active:scale-[0.98] transition-all mt-6 disabled:bg-stone-300 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none'
        >
          Simpan Transaksi 🚀
        </button>
      </section>

      {/* MODAL PILIH SUMBER */}
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

      {/* MODAL KATEGORI (RENDER SESUAI ACTIVE CATEGORIES) */}
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
