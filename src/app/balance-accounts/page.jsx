'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/storage';
import {
  ArrowLeft,
  Plus,
  Trash2,
  X,
  CreditCard,
  ArrowRightLeft,
  ChevronDown,
} from 'lucide-react';

export default function AccountsManager() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);

  // State Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('');

  // State Modal Transfer
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');

  // State Sub-Modals
  const [isTransferFromModalOpen, setIsTransferFromModalOpen] = useState(false);
  const [isTransferToModalOpen, setIsTransferToModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const accs = (await db.getItem('accounts')) || [];
      setAccounts(accs);

      const total = accs.reduce((sum, acc) => sum + acc.balance, 0);
      setTotalBalance(total);

      if (accs.length >= 2) {
        setTransferFrom(accs[0].id);
        setTransferTo(accs[1].id);
      } else if (accs.length === 1) {
        setTransferFrom(accs[0].id);
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

  const handleAddAccount = async () => {
    if (!newName.trim()) return alert('Kasih nama dulu dong dompetnya! 🏷️');

    const initialBalance = Number(newBalance) || 0;
    const newId = newName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();

    const newAcc = { id: newId, name: newName.trim(), balance: initialBalance };
    const updatedAccounts = [...accounts, newAcc];
    const updatedTotal = updatedAccounts.reduce(
      (sum, acc) => sum + acc.balance,
      0,
    );

    await db.setItem('accounts', updatedAccounts);
    await db.setItem('balance', updatedTotal);

    setAccounts(updatedAccounts);
    setTotalBalance(updatedTotal);

    setNewName('');
    setNewBalance('');
    setIsModalOpen(false);

    if (updatedAccounts.length >= 2 && !transferTo) {
      setTransferTo(newAcc.id);
    }
  };

  const handleDeleteAccount = async (id, name) => {
    if (id === 'cash') return;
    const confirmDelete = window.confirm(
      `Yakin mau ngehapus sumber "${name}"?`,
    );
    if (!confirmDelete) return;

    const updatedAccounts = accounts.filter((acc) => acc.id !== id);
    const updatedTotal = updatedAccounts.reduce(
      (sum, acc) => sum + acc.balance,
      0,
    );

    await db.setItem('accounts', updatedAccounts);
    await db.setItem('balance', updatedTotal);

    setAccounts(updatedAccounts);
    setTotalBalance(updatedTotal);
  };

  // --- LOGIC TRANSFER ---
  const handleOpenTransfer = () => {
    if (accounts.length < 2) return;
    setIsTransferModalOpen(true);
  };

  const handleSwapAccounts = () => {
    setTransferFrom((prevFrom) => {
      setTransferTo(prevFrom);
      return transferTo;
    });
  };

  const handleSelectTransferFrom = (id) => {
    if (id === transferTo) setTransferTo(transferFrom);
    setTransferFrom(id);
    setIsTransferFromModalOpen(false);
  };

  const handleSelectTransferTo = (id) => {
    if (id === transferFrom) setTransferFrom(transferTo);
    setTransferTo(id);
    setIsTransferToModalOpen(false);
  };

  const handleTransfer = async () => {
    const amount = Number(transferAmount);
    const currentAccs = [...accounts];

    const fromIndex = currentAccs.findIndex((a) => a.id === transferFrom);
    const toIndex = currentAccs.findIndex((a) => a.id === transferTo);

    // Guarding ekstra, walaupun udah di-disable di UI
    if (
      currentAccs[fromIndex].balance < amount ||
      amount <= 0 ||
      transferFrom === transferTo
    ) {
      return;
    }

    currentAccs[fromIndex].balance -= amount;
    currentAccs[toIndex].balance += amount;

    const newTxn = {
      id: Date.now(),
      type: 'transfer',
      title: `Mutasi: ${currentAccs[fromIndex].name} ke ${currentAccs[toIndex].name}`,
      amount: amount,
      fromAccountId: transferFrom,
      toAccountId: transferTo,
      date: new Date().toISOString(),
    };

    await db.setItem('accounts', currentAccs);

    const history = (await db.getItem('transactions')) || [];
    await db.setItem('transactions', [newTxn, ...history]);

    setAccounts(currentAccs);
    setTransferAmount('');
    setIsTransferModalOpen(false);
  };

  // --- REAL-TIME VALIDATION RULES ---
  const fromAccountObj = accounts.find((a) => a.id === transferFrom);
  const amountNum = Number(transferAmount) || 0;

  const isBalanceInsufficient = amountNum > (fromAccountObj?.balance || 0);
  const isSameAccount = transferFrom === transferTo;
  const isZeroAmount = amountNum <= 0;

  // Tombol mati kalau ada salah satu error di atas
  const isTransferDisabled =
    isBalanceInsufficient || isSameAccount || isZeroAmount;

  return (
    <main className='min-h-screen bg-pastel-bg p-6 max-w-md mx-auto pb-24 relative'>
      <header className='flex items-center gap-4 mb-8 pt-2'>
        <button
          onClick={() => router.back()}
          className='w-10 h-10 bg-white rounded-[1rem] flex items-center justify-center shadow-sm border border-pastel-pink hover:bg-pastel-pink transition-colors group'
        >
          <ArrowLeft className='w-5 h-5 text-text-main group-hover:text-pink-600 transition-colors' />
        </button>
        <h1 className='text-xl font-black text-text-main'>
          Atur Sumber Dana 💳
        </h1>
      </header>

      <section className='bg-gradient-to-tr from-pastel-purple via-white to-pastel-pink p-6 rounded-[2.5rem] shadow-sm border-2 border-white mb-8 text-text-main relative overflow-hidden'>
        <div className='relative z-10'>
          <p className='text-text-main/70 text-sm font-bold mb-1'>
            Total Saldo Aktif
          </p>
          <h2 className='text-3xl font-black text-text-main drop-shadow-sm'>
            {formatRupiah(totalBalance)}
          </h2>
        </div>
        <div className='absolute -bottom-10 -right-10 w-32 h-32 bg-white/40 rounded-full blur-2xl'></div>
      </section>

      <section>
        <div className='flex justify-between items-end mb-4 px-1'>
          <h3 className='text-sm font-black text-stone-400 uppercase tracking-wider'>
            Daftar Dompet Kamu
          </h3>
          <span className='text-xs font-bold text-stone-500 bg-stone-200 px-2 py-1 rounded-lg'>
            {accounts.length} Sumber
          </span>
        </div>

        <div className='space-y-3'>
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className='bg-white/90 backdrop-blur-sm p-4 rounded-[2rem] border-2 border-pastel-blue/30 shadow-sm flex items-center justify-between group transition-all hover:border-pastel-blue/60 hover:-translate-y-0.5'
            >
              <div className='flex items-center gap-4'>
                <div className='w-12 h-12 bg-pastel-blue rounded-[1rem] flex items-center justify-center border border-white shadow-inner'>
                  <CreditCard className='w-6 h-6 text-blue-500' />
                </div>
                <div>
                  <p className='font-bold text-text-main text-lg leading-tight'>
                    {acc.name}{' '}
                    {acc.id === 'cash' && (
                      <span className='text-[10px] bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full ml-1 align-middle'>
                        Default
                      </span>
                    )}
                  </p>
                  <p className='text-xs font-bold text-stone-400'>
                    {formatRupiah(acc.balance)}
                  </p>
                </div>
              </div>

              {acc.id !== 'cash' && (
                <button
                  onClick={() => handleDeleteAccount(acc.id, acc.name)}
                  className='w-10 h-10 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors'
                >
                  <Trash2 className='w-5 h-5' />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* DYNAMIC FLOATING ACTION BUTTONS */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] z-40 grid gap-3 ${accounts.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'}`}
      >
        {accounts.length >= 2 && (
          <button
            onClick={handleOpenTransfer}
            className='w-full py-4 bg-white text-text-main border-2 border-pastel-purple font-black rounded-[2rem] shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-pastel-purple/10'
          >
            <ArrowRightLeft className='w-5 h-5 text-purple-500' /> Transfer
          </button>
        )}
        <button
          onClick={() => setIsModalOpen(true)}
          className='w-full py-4 bg-gradient-to-r from-pink-400 to-purple-400 text-white font-black rounded-[2rem] shadow-[0_8px_20px_rgb(255,182,193,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-2 border-white/50'
        >
          <Plus className='w-5 h-5' /> Tambah
        </button>
      </div>

      {/* --- MODAL TAMBAH SUMBER --- */}
      {isModalOpen && (
        <div className='fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
          <div className='bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300'>
            <div className='flex justify-between items-center mb-6'>
              <h3 className='font-black text-xl text-stone-800'>
                Bikin Sumber Baru
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className='w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='space-y-4 mb-6'>
              <div className='bg-stone-50 p-4 rounded-3xl border border-stone-200 focus-within:border-stone-800 focus-within:ring-2 focus-within:ring-stone-800 transition-all'>
                <label className='text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1'>
                  Nama Dompet/Bank
                </label>
                <input
                  type='text'
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder='Misal: BCA, GoPay...'
                  className='w-full bg-transparent outline-none font-bold text-stone-800 placeholder:text-stone-300 placeholder:font-normal'
                />
              </div>

              <div className='bg-stone-50 p-4 rounded-3xl border border-stone-200 focus-within:border-stone-800 focus-within:ring-2 focus-within:ring-stone-800 transition-all'>
                <label className='text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1'>
                  Saldo Awal Saat Ini
                </label>
                <div className='flex items-center font-bold text-stone-800'>
                  <span className='mr-2 text-stone-400'>Rp</span>
                  <input
                    type='number'
                    min='0'
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
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
                    className='w-full bg-transparent outline-none placeholder:text-stone-300 placeholder:font-normal'
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleAddAccount}
              className='w-full py-5 bg-gradient-to-r from-pink-400 to-purple-400 text-white font-black rounded-[2rem] shadow-[0_8px_20px_rgb(255,182,193,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all border-2 border-white/50'
            >
              Simpan Dompet 🚀
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL TRANSFER --- */}
      {isTransferModalOpen && (
        <div className='fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
          <div className='bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300'>
            <div className='flex justify-between items-center mb-6'>
              <h3 className='font-black text-xl text-stone-800'>
                Transfer Dana 💸
              </h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className='w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='space-y-4 mb-4'>
              <div
                className={`bg-stone-50 p-4 rounded-3xl border transition-all ${isBalanceInsufficient ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-500' : 'border-stone-200 focus-within:border-stone-800 focus-within:ring-stone-800'} focus-within:ring-2`}
              >
                <label
                  className={`text-[10px] font-black uppercase tracking-wider block mb-1 ${isBalanceInsufficient ? 'text-red-400' : 'text-stone-400'}`}
                >
                  Mau transfer berapa?
                </label>
                <div
                  className={`flex items-center font-black text-2xl ${isBalanceInsufficient ? 'text-red-500' : 'text-stone-800'}`}
                >
                  <span
                    className={`mr-2 text-lg ${isBalanceInsufficient ? 'text-red-400' : 'text-stone-400'}`}
                  >
                    Rp
                  </span>
                  <input
                    type='number'
                    min='0'
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
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
                    className={`w-full bg-transparent outline-none placeholder:font-normal ${isBalanceInsufficient ? 'placeholder:text-red-200' : 'placeholder:text-stone-300'}`}
                  />
                </div>
              </div>

              {/* DAERAH PILIH DOMPET */}
              <div className='flex items-center gap-3 bg-stone-50 p-4 rounded-3xl border border-stone-200'>
                {/* DARI */}
                <div
                  onClick={() => setIsTransferFromModalOpen(true)}
                  className='flex-1 cursor-pointer group'
                >
                  <label className='text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1 group-hover:text-stone-600 transition-colors'>
                    Dari
                  </label>
                  <div className='font-bold text-stone-800 flex items-center gap-1 text-sm'>
                    <ChevronDown className='w-4 h-4 text-stone-400' />
                    <span className='truncate'>{fromAccountObj?.name}</span>
                  </div>
                  <div
                    className={`text-[10px] font-bold mt-0.5 ${isBalanceInsufficient ? 'text-red-500' : 'text-stone-500'}`}
                  >
                    Rp {fromAccountObj?.balance.toLocaleString('id-ID')}
                  </div>
                </div>

                {/* SWAP */}
                <button
                  type='button'
                  onClick={handleSwapAccounts}
                  className='w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0 hover:scale-110 active:scale-95 transition-all border border-stone-200 text-stone-600 hover:text-stone-900'
                >
                  <ArrowRightLeft className='w-4 h-4' />
                </button>

                {/* KE */}
                <div
                  onClick={() => setIsTransferToModalOpen(true)}
                  className='flex-1 text-right cursor-pointer group flex flex-col items-end'
                >
                  <label className='text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1 group-hover:text-stone-600 transition-colors'>
                    Ke
                  </label>
                  <div className='font-bold text-stone-800 flex items-center gap-1 text-sm justify-end'>
                    <ChevronDown className='w-4 h-4 text-stone-400' />
                    <span className='truncate'>
                      {accounts.find((a) => a.id === transferTo)?.name}
                    </span>
                  </div>
                  <div className='text-[10px] text-stone-500 font-bold mt-0.5'>
                    Rp{' '}
                    {accounts
                      .find((a) => a.id === transferTo)
                      ?.balance.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </div>

            {/* Peringatan Error Inline */}
            <div className='h-6 mb-2'>
              {isBalanceInsufficient && (
                <p className='text-red-500 text-xs font-bold text-center animate-pulse'>
                  ⚠️ Saldo {fromAccountObj?.name} kurang nih!
                </p>
              )}
              {isSameAccount && (
                <p className='text-orange-500 text-xs font-bold text-center animate-pulse'>
                  ⚠️ Masa transfer ke dompet yang sama?
                </p>
              )}
            </div>

            <button
              onClick={handleTransfer}
              disabled={isTransferDisabled}
              className='w-full py-5 bg-gradient-to-r from-pink-400 to-purple-400 text-white font-black rounded-[2rem] shadow-[0_8px_20px_rgb(255,182,193,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:from-stone-300 disabled:to-stone-300 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none border-2 border-white/50'
            >
              Proses Transfer 🚀
            </button>
          </div>
        </div>
      )}

      {/* --- SUB-MODALS PILIH DARI/KE (Sama aja kaya sebelumnya) --- */}
      {isTransferFromModalOpen && (
        <div className='fixed inset-0 z-[60] flex items-end justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
          <div className='bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300'>
            <div className='flex justify-between items-center mb-6'>
              <h3 className='font-black text-xl text-stone-800'>
                Transfer Dari
              </h3>
              <button
                onClick={() => setIsTransferFromModalOpen(false)}
                className='w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='space-y-2 max-h-[50vh] overflow-y-auto scrollbar-hide'>
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => handleSelectTransferFrom(acc.id)}
                  className={`w-full flex justify-between items-center p-4 rounded-2xl text-left transition-colors border ${transferFrom === acc.id ? 'bg-stone-800 text-white border-stone-800' : 'bg-stone-50 text-stone-700 border-transparent hover:border-stone-200'}`}
                >
                  <span className='font-bold'>{acc.name}</span>
                  <span
                    className={`text-sm font-bold ${transferFrom === acc.id ? 'text-stone-300' : 'text-stone-500'}`}
                  >
                    Rp {acc.balance.toLocaleString('id-ID')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isTransferToModalOpen && (
        <div className='fixed inset-0 z-[60] flex items-end justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
          <div className='bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300'>
            <div className='flex justify-between items-center mb-6'>
              <h3 className='font-black text-xl text-stone-800'>Transfer Ke</h3>
              <button
                onClick={() => setIsTransferToModalOpen(false)}
                className='w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='space-y-2 max-h-[50vh] overflow-y-auto scrollbar-hide'>
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => handleSelectTransferTo(acc.id)}
                  className={`w-full flex justify-between items-center p-4 rounded-2xl text-left transition-colors border ${transferTo === acc.id ? 'bg-stone-800 text-white border-stone-800' : 'bg-stone-50 text-stone-700 border-transparent hover:border-stone-200'}`}
                >
                  <span className='font-bold'>{acc.name}</span>
                  <span
                    className={`text-sm font-bold ${transferTo === acc.id ? 'text-stone-300' : 'text-stone-500'}`}
                  >
                    Rp {acc.balance.toLocaleString('id-ID')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
