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
  Wallet,
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
      let accs = (await db.getItem('accounts')) || [];

      // Auto-create Cash account if completely empty
      if (accs.length === 0) {
        const defaultCash = { id: 'cash', name: 'Cash', balance: 0 };
        accs = [defaultCash];
        await db.setItem('accounts', accs);
      }

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

    // Kalo user masukin modal awal pas bikin dompet, catat sebagai "Income"
    if (initialBalance > 0) {
      const currentIncome = (await db.getItem('income')) || 0;
      await db.setItem('income', currentIncome + initialBalance);

      const newTxn = {
        id: Date.now(),
        type: 'income',
        title: `Saldo Awal: ${newAcc.name}`,
        amount: initialBalance,
        source: '-',
        accountId: newId,
        category: 'lainnya',
        date: new Date().toISOString(),
      };
      const history = (await db.getItem('transactions')) || [];
      await db.setItem('transactions', [newTxn, ...history]);
    }

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

  const handleDeleteAccount = async (id, name, balance) => {
    if (id === 'cash') return;
    const confirmDelete = window.confirm(
      `Yakin mau ngehapus sumber "${name}"? (Sisa saldo ${formatRupiah(balance)} tidak akan otomatis pindah)`,
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

    if (
      currentAccs[fromIndex].balance < amount ||
      amount <= 0 ||
      transferFrom === transferTo
    )
      return;

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

  const isTransferDisabled =
    isBalanceInsufficient || isSameAccount || isZeroAmount;

  return (
    <main className='min-h-screen bg-bg relative overflow-x-hidden font-sans pb-32 md:pb-12 md:pl-32 lg:pl-36 transition-all duration-500'>
      <div className='absolute top-[-5%] left-[-10%] w-64 h-64 md:w-96 md:h-96 lg:w-[40rem] lg:h-[40rem] bg-primary/20 rounded-full mix-blend-multiply filter blur-[80px] lg:blur-[120px] z-0 pointer-events-none'></div>

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
              Sumber Dana
            </h1>
          </div>
        </header>

        {/* GRID LAYOUT UNTUK DESKTOP */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10'>
          {/* KOLOM KIRI (Total Balance & Action Buttons) */}
          <div className='lg:col-span-5 flex flex-col gap-6'>
            <motion.section
              variants={itemVariants}
              className='bg-surface/80 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] shadow-sm border border-border text-text-primary relative overflow-hidden transition-colors'
            >
              <div className='absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none'></div>

              <div className='relative z-10 flex justify-between items-end'>
                <div>
                  <p className='text-text-secondary text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1 md:mb-2 flex items-center gap-1.5'>
                    <Wallet className='w-3.5 h-3.5 md:w-4 md:h-4' /> Total Saldo
                    Aktif
                  </p>
                  <h2 className='text-4xl md:text-5xl font-black text-text-primary drop-shadow-sm tracking-tight'>
                    {formatRupiah(totalBalance)}
                  </h2>
                </div>
              </div>
            </motion.section>

            {/* --- INLINE ACTION BUTTONS --- */}
            <motion.div
              variants={itemVariants}
              className='grid grid-cols-2 gap-3 mb-8 lg:mb-0'
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsModalOpen(true)}
                className='bg-primary hover:bg-primary-hover text-surface p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] font-bold text-sm md:text-base shadow-[0_10px_20px_rgb(220,198,255,0.4)] dark:shadow-[0_10px_20px_rgb(155,126,222,0.2)] flex items-center justify-center gap-2 transition-all'
              >
                <Plus className='w-5 h-5 stroke-[3]' /> Tambah
              </motion.button>

              {accounts.length >= 2 ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleOpenTransfer}
                  className='bg-surface/80 backdrop-blur-md border border-border text-text-primary p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] font-bold text-sm md:text-base shadow-sm flex items-center justify-center gap-2 hover:border-primary/50 transition-colors'
                >
                  <ArrowRightLeft className='w-5 h-5 text-primary' /> Transfer
                </motion.button>
              ) : (
                <div className='bg-surface/50 border border-dashed border-border rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-text-secondary/60 text-[11px] md:text-xs font-bold px-4 text-center leading-tight'>
                  Tambah 1 dompet lagi untuk fitur transfer
                </div>
              )}
            </motion.div>
          </div>

          {/* KOLOM KANAN (Daftar Dompet) */}
          <div className='lg:col-span-7'>
            <motion.section variants={itemVariants}>
              <div className='flex justify-between items-end mb-4 px-1'>
                <h3 className='text-xs md:text-sm font-black text-text-secondary uppercase tracking-widest'>
                  Daftar Dompet
                </h3>
                <span className='text-[10px] md:text-xs font-bold text-text-secondary bg-surface px-2.5 py-1 md:py-1.5 rounded-lg border border-border'>
                  {accounts.length} Sumber
                </span>
              </div>

              {/* List Dompet dibuat Grid 2 Kolom di Desktop */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-h-[65vh] lg:max-h-[75vh] overflow-y-auto scrollbar-hide pb-4'>
                <AnimatePresence mode='popLayout'>
                  {accounts.map((acc, idx) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: idx * 0.05 }}
                      key={acc.id}
                      className='bg-surface/80 backdrop-blur-md p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-border shadow-sm flex items-center justify-between group transition-all hover:border-primary/40 hover:shadow-md'
                    >
                      <div className='flex items-center gap-3 md:gap-4'>
                        <div className='w-12 h-12 md:w-14 md:h-14 bg-bg rounded-[1rem] md:rounded-[1.2rem] flex items-center justify-center border border-border/50 shadow-sm group-hover:scale-105 transition-transform'>
                          <CreditCard className='w-6 h-6 md:w-7 md:h-7 text-primary' />
                        </div>
                        <div>
                          <p className='font-bold text-text-primary text-sm md:text-base mb-0.5 leading-tight'>
                            {acc.name}{' '}
                            {acc.id === 'cash' && (
                              <span className='text-[9px] md:text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-md ml-1 align-middle uppercase tracking-widest'>
                                Default
                              </span>
                            )}
                          </p>
                          <p className='text-xs md:text-sm font-black text-text-secondary'>
                            {formatRupiah(acc.balance)}
                          </p>
                        </div>
                      </div>

                      {acc.id !== 'cash' && (
                        <button
                          onClick={() =>
                            handleDeleteAccount(acc.id, acc.name, acc.balance)
                          }
                          className='w-10 h-10 md:w-12 md:h-12 rounded-[1rem] flex items-center justify-center text-expense/50 hover:bg-expense/10 hover:text-expense transition-colors shrink-0'
                        >
                          <Trash2 className='w-5 h-5' />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          </div>
        </div>
      </motion.div>

      {/* --- MODAL TAMBAH SUMBER (BOTTOM SHEET) --- */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className='fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm'
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[70] bg-surface rounded-t-[2.5rem] md:rounded-t-[3rem] p-6 md:p-8 shadow-2xl border-t border-border max-w-md mx-auto flex flex-col'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6 flex-shrink-0'></div>
              <div className='flex justify-between items-center mb-6'>
                <h3 className='font-black text-xl md:text-2xl text-text-primary flex items-center gap-2'>
                  <CreditCard className='w-6 h-6 md:w-8 md:h-8 text-primary' />{' '}
                  Bikin Dompet Baru
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className='w-8 h-8 md:w-10 md:h-10 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <div className='space-y-4 md:space-y-5 mb-6'>
                <div className='bg-bg/50 rounded-[1.5rem] p-4 md:p-5 border border-border focus-within:border-primary transition-colors'>
                  <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1'>
                    Nama Dompet/Bank
                  </label>
                  <input
                    type='text'
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder='Misal: BCA, GoPay...'
                    className='w-full bg-transparent outline-none font-bold text-text-primary text-sm md:text-base placeholder:text-text-secondary/50 placeholder:font-normal'
                  />
                </div>

                <div className='bg-bg/50 rounded-[1.5rem] p-4 md:p-5 border border-border focus-within:border-primary transition-colors flex items-center'>
                  <span className='text-2xl md:text-3xl font-black text-text-secondary mr-3'>
                    Rp
                  </span>
                  <div className='w-full'>
                    <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1'>
                      Saldo Awal Saat Ini
                    </label>
                    <input
                      type='number'
                      min='0'
                      value={newBalance}
                      onChange={(e) => setNewBalance(e.target.value)}
                      onKeyDown={(e) => {
                        if (['-', 'e', '+', '.'].includes(e.key))
                          e.preventDefault();
                      }}
                      placeholder='0'
                      className='w-full bg-transparent outline-none font-black text-xl md:text-2xl text-text-primary placeholder:font-normal placeholder:text-text-secondary/50'
                    />
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddAccount}
                className='w-full py-4 md:py-5 bg-gradient-to-r from-primary to-primary-hover text-surface text-base md:text-lg font-black rounded-[1.5rem] md:rounded-[2rem] shadow-[0_10px_20px_rgb(220,198,255,0.4)] dark:shadow-[0_10px_20px_rgb(155,126,222,0.2)] mt-2'
              >
                Simpan Dompet
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- MODAL TRANSFER (BOTTOM SHEET) --- */}
      <AnimatePresence>
        {isTransferModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTransferModalOpen(false)}
              className='fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm'
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[70] bg-surface rounded-t-[2.5rem] md:rounded-t-[3rem] p-6 md:p-8 shadow-2xl border-t border-border max-w-md mx-auto flex flex-col'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6 flex-shrink-0'></div>
              <div className='flex justify-between items-center mb-6'>
                <h3 className='font-black text-xl md:text-2xl text-text-primary flex items-center gap-2'>
                  <ArrowRightLeft className='w-6 h-6 md:w-8 md:h-8 text-primary' />{' '}
                  Transfer Dana
                </h3>
                <button
                  onClick={() => setIsTransferModalOpen(false)}
                  className='w-8 h-8 md:w-10 md:h-10 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <div className='space-y-4 md:space-y-5 mb-2'>
                {/* Nominal Transfer */}
                <div
                  className={`bg-bg/50 rounded-[1.5rem] p-4 md:p-5 border transition-colors flex items-center ${isBalanceInsufficient ? 'border-expense focus-within:border-expense' : 'border-border focus-within:border-primary'}`}
                >
                  <span
                    className={`text-2xl md:text-3xl font-black mr-3 ${isBalanceInsufficient ? 'text-expense/50' : 'text-text-secondary'}`}
                  >
                    Rp
                  </span>
                  <div className='w-full'>
                    <label
                      className={`text-[10px] md:text-xs font-black uppercase tracking-widest block mb-1 ${isBalanceInsufficient ? 'text-expense' : 'text-text-secondary'}`}
                    >
                      Mau transfer berapa?
                    </label>
                    <input
                      type='number'
                      min='0'
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (['-', 'e', '+', '.'].includes(e.key))
                          e.preventDefault();
                      }}
                      placeholder='0'
                      className={`w-full bg-transparent outline-none font-black text-xl md:text-2xl ${isBalanceInsufficient ? 'text-expense placeholder:text-expense/50' : 'text-text-primary placeholder:text-text-secondary/50'}`}
                    />
                  </div>
                </div>

                {/* Pilih Dompet (Dari -> Ke) */}
                <div className='flex items-center gap-3 bg-bg/50 p-4 md:p-5 rounded-[1.5rem] border border-border'>
                  <div
                    onClick={() => setIsTransferFromModalOpen(true)}
                    className='flex-1 cursor-pointer group'
                  >
                    <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1 group-hover:text-text-primary transition-colors'>
                      Dari
                    </label>
                    <div className='font-bold text-text-primary flex items-center gap-1 text-sm md:text-base'>
                      <ChevronDown className='w-4 h-4 text-text-secondary' />{' '}
                      <span className='truncate'>{fromAccountObj?.name}</span>
                    </div>
                    <div
                      className={`text-[10px] md:text-xs font-bold mt-0.5 ${isBalanceInsufficient ? 'text-expense' : 'text-text-secondary'}`}
                    >
                      Rp {fromAccountObj?.balance.toLocaleString('id-ID')}
                    </div>
                  </div>

                  <button
                    onClick={handleSwapAccounts}
                    className='w-10 h-10 md:w-12 md:h-12 bg-surface rounded-full flex items-center justify-center shadow-sm flex-shrink-0 hover:scale-110 active:scale-95 transition-all border border-border text-text-secondary hover:text-primary'
                  >
                    <ArrowRightLeft className='w-4 h-4 md:w-5 md:h-5' />
                  </button>

                  <div
                    onClick={() => setIsTransferToModalOpen(true)}
                    className='flex-1 text-right cursor-pointer group flex flex-col items-end'
                  >
                    <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1 group-hover:text-text-primary transition-colors'>
                      Ke
                    </label>
                    <div className='font-bold text-text-primary flex items-center gap-1 text-sm md:text-base justify-end'>
                      <ChevronDown className='w-4 h-4 text-text-secondary' />{' '}
                      <span className='truncate'>
                        {accounts.find((a) => a.id === transferTo)?.name}
                      </span>
                    </div>
                    <div className='text-[10px] md:text-xs text-text-secondary font-bold mt-0.5'>
                      Rp{' '}
                      {accounts
                        .find((a) => a.id === transferTo)
                        ?.balance.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning Inline */}
              <div className='h-6 md:h-8 mb-4 mt-2'>
                {isBalanceInsufficient && (
                  <p className='text-expense text-xs md:text-sm font-bold text-center animate-pulse'>
                    Saldo {fromAccountObj?.name} kurang nih!
                  </p>
                )}
                {isSameAccount && (
                  <p className='text-warning text-xs md:text-sm font-bold text-center animate-pulse'>
                    Masa transfer ke dompet yang sama?
                  </p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleTransfer}
                disabled={isTransferDisabled}
                className='w-full py-4 md:py-5 bg-gradient-to-r from-primary to-primary-hover text-surface font-black text-base md:text-lg rounded-[1.5rem] md:rounded-[2rem] shadow-[0_10px_20px_rgb(220,198,255,0.4)] dark:shadow-[0_10px_20px_rgb(155,126,222,0.2)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed mt-2 border border-white/20'
              >
                Proses Transfer
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- SUB-MODALS PILIH DARI/KE --- */}
      <AnimatePresence>
        {isTransferFromModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTransferFromModalOpen(false)}
              className='fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm'
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[90] bg-surface rounded-t-[2.5rem] md:rounded-t-[3rem] p-6 md:p-8 shadow-2xl border-t border-border max-w-md mx-auto'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6'></div>
              <h3 className='font-black text-xl md:text-2xl text-text-primary mb-6'>
                Pilih Sumber: DARI
              </h3>
              <div className='space-y-2 max-h-[50vh] overflow-y-auto scrollbar-hide pb-4'>
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => handleSelectTransferFrom(acc.id)}
                    className={`w-full flex justify-between items-center p-4 md:p-5 rounded-[1.2rem] md:rounded-[1.5rem] text-left transition-colors border ${transferFrom === acc.id ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-bg text-text-primary border-transparent hover:border-border'}`}
                  >
                    <span className='font-bold text-sm md:text-base'>
                      {acc.name}
                    </span>
                    <span
                      className={`text-sm md:text-base font-bold ${transferFrom === acc.id ? 'opacity-80' : 'text-text-secondary'}`}
                    >
                      Rp {acc.balance.toLocaleString('id-ID')}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTransferToModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTransferToModalOpen(false)}
              className='fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm'
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[90] bg-surface rounded-t-[2.5rem] md:rounded-t-[3rem] p-6 md:p-8 shadow-2xl border-t border-border max-w-md mx-auto'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6'></div>
              <h3 className='font-black text-xl md:text-2xl text-text-primary mb-6'>
                Pilih Tujuan: KE
              </h3>
              <div className='space-y-2 max-h-[50vh] overflow-y-auto scrollbar-hide pb-4'>
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => handleSelectTransferTo(acc.id)}
                    className={`w-full flex justify-between items-center p-4 md:p-5 rounded-[1.2rem] md:rounded-[1.5rem] text-left transition-colors border ${transferTo === acc.id ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-bg text-text-primary border-transparent hover:border-border'}`}
                  >
                    <span className='font-bold text-sm md:text-base'>
                      {acc.name}
                    </span>
                    <span
                      className={`text-sm md:text-base font-bold ${transferTo === acc.id ? 'opacity-80' : 'text-text-secondary'}`}
                    >
                      Rp {acc.balance.toLocaleString('id-ID')}
                    </span>
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
