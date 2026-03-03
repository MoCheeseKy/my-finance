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
  Wallet,
  Flame,
  CheckCircle2,
  X,
  MinusCircle,
  PlusCircle,
  PiggyBank,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
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

export default function SavingsPage() {
  const router = useRouter();
  const [savings, setSavings] = useState([]);
  const [accounts, setAccounts] = useState([]);

  // Modals State Utama
  const [showAddModal, setShowAddModal] = useState(false);
  const [manageData, setManageData] = useState(null); // { plan, type: 'add' | 'withdraw' }
  const [confirmActionData, setConfirmActionData] = useState(null); // { plan, action: 'delete' | 'complete' }

  // State Pengendali Modal Pilih Dompet (Biar reusable)
  const [accountPickerTarget, setAccountPickerTarget] = useState(null); // 'initial', 'manage', 'confirm'
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Input States
  const [manageAmount, setManageAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [initialSourceAcc, setInitialSourceAcc] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    const loadData = async () => {
      const savedPlans = (await db.getItem('savings_plans')) || [];
      setSavings(savedPlans);

      let accs = await db.getItem('accounts');
      if (!accs || accs.length === 0) {
        accs = [{ id: 'cash', name: 'Cash', balance: 0 }];
        await db.setItem('accounts', accs);
      }
      setAccounts(accs);
      if (accs.length > 0) {
        setSelectedAccountId(accs[0].id);
        setInitialSourceAcc(accs[0].id);
      }
    };
    loadData();
  }, []);

  // --- LOGIC BUAT TARGET BARU ---
  const handleSave = async () => {
    if (!formData.title || !formData.targetAmount || !formData.deadline) {
      return alert('Lengkapi data dulu ya! ✍️');
    }

    const target = parseFloat(formData.targetAmount);
    const initial = parseFloat(formData.currentAmount || 0);

    if (initial > 0) {
      if (!initialSourceAcc)
        return alert('Pilih sumber dompet untuk modal awal dulu! 🏦');
      const currentAccs = [...accounts];
      const accIndex = currentAccs.findIndex((a) => a.id === initialSourceAcc);

      if (currentAccs[accIndex].balance < initial) {
        return alert('Waduh, saldo dompet nggak cukup buat modal awal ini! 🥲');
      }

      currentAccs[accIndex].balance -= initial;
      setAccounts(currentAccs);
      await db.setItem('accounts', currentAccs);

      const currentGlobalBalance = (await db.getItem('balance')) || 0;
      await db.setItem('balance', currentGlobalBalance - initial);

      const exp = (await db.getItem('expense')) || 0;
      await db.setItem('expense', exp + initial);

      const newTxn = {
        id: Date.now(),
        type: 'expense',
        title: `Nabung Awal: ${formData.title}`,
        amount: initial,
        source: formData.title,
        accountId: initialSourceAcc,
        category: 'tabungan',
        date: new Date().toISOString(),
      };
      const history = (await db.getItem('transactions')) || [];
      await db.setItem('transactions', [newTxn, ...history]);
    }

    const newPlan = {
      ...formData,
      id: Date.now().toString(),
      targetAmount: target,
      currentAmount: initial,
    };
    const updated = [...savings, newPlan];
    setSavings(updated);
    await db.setItem('savings_plans', updated);

    setShowAddModal(false);
    setFormData({
      title: '',
      targetAmount: '',
      currentAmount: '',
      deadline: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  // --- LOGIC NABUNG & TARIK DANA ---
  const handleManageSubmit = async () => {
    if (!manageAmount || parseFloat(manageAmount) <= 0)
      return alert('Masukkan nominal yang valid!');
    if (!selectedAccountId) return alert('Pilih sumber/tujuan dompet dulu!');

    const amount = parseFloat(manageAmount);
    const isTopup = manageData.type === 'add';
    const accIndex = accounts.findIndex((a) => a.id === selectedAccountId);
    const currentAccs = [...accounts];

    if (isTopup && currentAccs[accIndex].balance < amount)
      return alert('Saldo di dompet tidak cukup untuk nabung sebesar ini! 🥲');
    if (!isTopup && manageData.plan.currentAmount < amount)
      return alert('Duit tabungannya nggak cukup buat ditarik segini! 🥲');

    const updatedSavings = savings.map((s) =>
      s.id === manageData.plan.id
        ? {
            ...s,
            currentAmount: s.currentAmount + (isTopup ? amount : -amount),
          }
        : s,
    );
    currentAccs[accIndex].balance += isTopup ? -amount : amount;

    const currentGlobalBalance = (await db.getItem('balance')) || 0;
    await db.setItem(
      'balance',
      currentGlobalBalance + (isTopup ? -amount : amount),
    );

    if (isTopup) {
      const exp = (await db.getItem('expense')) || 0;
      await db.setItem('expense', exp + amount);
    } else {
      const inc = (await db.getItem('income')) || 0;
      await db.setItem('income', inc + amount);
    }

    const newTxn = {
      id: Date.now(),
      type: isTopup ? 'expense' : 'income',
      title: isTopup
        ? `Nabung: ${manageData.plan.title}`
        : `Tarik Tabungan: ${manageData.plan.title}`,
      amount: amount,
      source: manageData.plan.title,
      accountId: selectedAccountId,
      category: 'tabungan',
      date: new Date().toISOString(),
    };

    const history = (await db.getItem('transactions')) || [];
    await db.setItem('transactions', [newTxn, ...history]);

    setSavings(updatedSavings);
    await db.setItem('savings_plans', updatedSavings);
    setAccounts(currentAccs);
    await db.setItem('accounts', currentAccs);

    setManageData(null);
    setManageAmount('');
  };

  // --- LOGIC SELESAIKAN & HAPUS TARGET ---
  const handleExecuteAction = async () => {
    const { plan, action } = confirmActionData;

    if (plan.currentAmount > 0) {
      if (!selectedAccountId)
        return alert('Pilih dompet tujuan pencairan dulu bossque!');

      const currentAccs = [...accounts];
      const accIndex = currentAccs.findIndex((a) => a.id === selectedAccountId);

      currentAccs[accIndex].balance += plan.currentAmount;
      setAccounts(currentAccs);
      await db.setItem('accounts', currentAccs);

      const currentGlobalBalance = (await db.getItem('balance')) || 0;
      await db.setItem('balance', currentGlobalBalance + plan.currentAmount);

      const inc = (await db.getItem('income')) || 0;
      await db.setItem('income', inc + plan.currentAmount);

      const newTxn = {
        id: Date.now(),
        type: 'income',
        title: `Pencairan Tabungan: ${plan.title}`,
        amount: plan.currentAmount,
        source: plan.title,
        accountId: selectedAccountId,
        category: 'tabungan',
        date: new Date().toISOString(),
      };
      const history = (await db.getItem('transactions')) || [];
      await db.setItem('transactions', [newTxn, ...history]);
    }

    const updatedSavings = savings.filter((s) => s.id !== plan.id);
    setSavings(updatedSavings);
    await db.setItem('savings_plans', updatedSavings);

    setConfirmActionData(null);
  };

  const formatRupiah = (num) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num || 0);

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
              Saving Plan
            </h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddModal(true)}
            className='w-11 h-11 md:w-12 md:h-12 bg-gradient-to-tr from-primary to-primary-hover rounded-2xl flex items-center justify-center shadow-[0_8px_20px_rgb(220,198,255,0.4)] dark:shadow-[0_8px_20px_rgb(155,126,222,0.3)] text-surface border border-white/20'
          >
            <Plus className='w-6 h-6 md:w-7 md:h-7 stroke-[3]' />
          </motion.button>
        </header>

        {/* --- LIST SAVING PLANS (GRID DI DESKTOP) --- */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6'>
          <AnimatePresence mode='popLayout'>
            {savings.length === 0 ? (
              <motion.div
                key='empty-state'
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className='lg:col-span-2 text-center py-20 bg-surface/60 backdrop-blur-md rounded-[2.5rem] border border-dashed border-border shadow-sm'
              >
                <Target className='w-14 h-14 md:w-16 md:h-16 text-text-secondary/30 mx-auto mb-4' />
                <p className='text-text-secondary font-bold text-sm md:text-base'>
                  Belum ada target? <br />
                  Mimpi aja dulu, catat kemudian! ✨
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className='mt-6 px-6 py-3 bg-primary text-surface font-bold rounded-[1.2rem] shadow-sm transition-transform active:scale-95 text-sm md:text-base hover:opacity-90 lg:hidden'
                >
                  Bikin Target Pertama
                </button>
              </motion.div>
            ) : (
              savings.map((plan) => (
                <SavingCard
                  key={plan.id}
                  plan={plan}
                  onConfirmAction={(p, action) =>
                    setConfirmActionData({ plan: p, action })
                  }
                  onManage={(type) => setManageData({ plan, type })}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* --- BOTTOM SHEET: TAMBAH TARGET BARU --- */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
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
                  <Target className='w-6 h-6 md:w-8 md:h-8 text-primary' />{' '}
                  Target Baru
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className='w-8 h-8 md:w-10 md:h-10 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <div className='space-y-4 md:space-y-6 overflow-y-auto scrollbar-hide pb-4 px-1'>
                <div className='bg-bg/50 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-5 border border-border focus-within:border-primary transition-colors'>
                  <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1'>
                    Nama Keinginan
                  </label>
                  <input
                    type='text'
                    placeholder='Misal: iPhone 17 Pro Max'
                    className='w-full bg-transparent font-bold outline-none text-text-primary text-sm md:text-base placeholder:font-normal'
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>

                <div className='grid grid-cols-2 gap-3 md:gap-5'>
                  <div className='bg-bg/50 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-5 border border-border focus-within:border-primary transition-colors'>
                    <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1'>
                      Target (Rp)
                    </label>
                    <input
                      type='number'
                      placeholder='0'
                      className='w-full bg-transparent font-bold outline-none text-text-primary text-sm md:text-base'
                      value={formData.targetAmount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetAmount: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className='bg-bg/50 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-5 border border-border focus-within:border-primary transition-colors'>
                    <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1'>
                      Modal Awal
                    </label>
                    <input
                      type='number'
                      placeholder='Opsional'
                      className='w-full bg-transparent font-bold outline-none text-text-primary text-sm md:text-base placeholder:font-normal'
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

                {/* Pilih Dompet (Modal Awal) */}
                <AnimatePresence>
                  {parseFloat(formData.currentAmount) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className='overflow-hidden'
                    >
                      <div
                        onClick={() => {
                          setAccountPickerTarget('initial');
                          setIsAccountModalOpen(true);
                        }}
                        className='bg-primary/5 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-5 border border-primary/20 cursor-pointer hover:border-primary/50 transition-all flex justify-between items-center group mt-1'
                      >
                        <div>
                          <label className='text-[10px] md:text-xs font-black text-primary uppercase tracking-widest block mb-1 group-hover:text-primary/80 transition-colors flex items-center gap-1'>
                            <Wallet className='w-3 h-3 md:w-4 md:h-4' /> Potong
                            Saldo Dari
                          </label>
                          <div className='font-bold text-text-primary text-sm md:text-base'>
                            {accounts.find((a) => a.id === initialSourceAcc)
                              ?.name || 'Pilih Sumber'}
                            {initialSourceAcc && (
                              <span className='text-xs font-medium text-text-secondary ml-2 whitespace-nowrap hidden sm:inline-block'>
                                (Rp{' '}
                                {accounts
                                  .find((a) => a.id === initialSourceAcc)
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

                {/* Date Input yg Mudah di-Klik */}
                <div className='relative bg-bg/50 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-5 border border-border focus-within:border-primary transition-colors flex items-center justify-between group'>
                  <div>
                    <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1 group-hover:text-primary transition-colors'>
                      Deadline
                    </label>
                    <div className='font-bold text-text-primary text-sm md:text-base'>
                      {formData.deadline ? (
                        format(parseISO(formData.deadline), 'dd MMMM yyyy', {
                          locale: localeId,
                        })
                      ) : (
                        <span className='text-text-secondary/50 font-normal'>
                          Pilih Tanggal
                        </span>
                      )}
                    </div>
                  </div>
                  <Calendar className='w-5 h-5 md:w-6 md:h-6 text-text-secondary group-hover:text-primary transition-colors flex-shrink-0' />
                  <input
                    type='date'
                    className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10'
                    value={formData.deadline}
                    onChange={(e) =>
                      setFormData({ ...formData, deadline: e.target.value })
                    }
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  className='w-full py-4 md:py-5 bg-gradient-to-r from-primary to-primary-hover text-surface text-base md:text-lg font-black rounded-[1.5rem] md:rounded-[2rem] shadow-[0_10px_20px_rgb(220,198,255,0.4)] dark:shadow-[0_10px_20px_rgb(155,126,222,0.2)] mt-4 border border-white/20'
                >
                  Mulai Nabung!
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- BOTTOM SHEET: MANAGE PLAN (NABUNG / TARIK) --- */}
      <AnimatePresence>
        {manageData && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setManageData(null)}
              className='fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm'
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[70] bg-surface rounded-t-[2.5rem] md:rounded-t-[3rem] p-6 md:p-8 shadow-2xl border-t border-border max-w-md md:max-w-2xl mx-auto flex flex-col'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6 flex-shrink-0'></div>
              <div className='flex justify-between items-center mb-6 md:mb-8'>
                <h3 className='font-black text-xl md:text-2xl text-text-primary flex items-center gap-2'>
                  {manageData.type === 'add' ? (
                    <>
                      <PlusCircle className='w-6 h-6 md:w-8 md:h-8 text-income' />{' '}
                      Isi Tabungan
                    </>
                  ) : (
                    <>
                      <MinusCircle className='w-6 h-6 md:w-8 md:h-8 text-expense' />{' '}
                      Tarik Tabungan
                    </>
                  )}
                </h3>
                <button
                  onClick={() => setManageData(null)}
                  className='w-8 h-8 md:w-10 md:h-10 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <div className='mb-6 md:mb-8'>
                <p className='text-xs md:text-sm text-text-secondary font-semibold mb-1'>
                  Target:{' '}
                  <span className='text-text-primary font-black'>
                    {manageData.plan.title}
                  </span>
                </p>
                <p className='text-[10px] md:text-xs font-black uppercase text-text-secondary tracking-widest bg-bg px-3 py-1.5 md:py-2 rounded-lg border border-border inline-block'>
                  Terkumpul: {formatRupiah(manageData.plan.currentAmount)}
                </p>
              </div>

              <div className='space-y-4 md:space-y-6'>
                <div className='bg-bg/50 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-5 border border-border focus-within:border-primary transition-colors flex items-center'>
                  <span className='text-2xl md:text-3xl font-black text-text-secondary mr-3 md:mr-4'>
                    Rp
                  </span>
                  <div className='w-full'>
                    <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1'>
                      Nominal
                    </label>
                    <input
                      type='number'
                      placeholder='0'
                      className='w-full bg-transparent font-black text-xl md:text-2xl outline-none text-text-primary'
                      value={manageAmount}
                      onChange={(e) => setManageAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div
                  onClick={() => {
                    setAccountPickerTarget('manage');
                    setIsAccountModalOpen(true);
                  }}
                  className='bg-bg/50 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-5 border border-border cursor-pointer hover:border-primary/50 transition-all flex justify-between items-center group'
                >
                  <div>
                    <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1 group-hover:text-text-primary transition-colors'>
                      {manageData.type === 'add'
                        ? 'Ambil Uang Dari'
                        : 'Cairkan Ke Dompet'}
                    </label>
                    <div className='font-bold text-text-primary text-sm md:text-base'>
                      {accounts.find((a) => a.id === selectedAccountId)?.name ||
                        'Pilih Sumber'}
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

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleManageSubmit}
                  className={`w-full py-4 md:py-5 text-surface font-black text-base md:text-lg rounded-[1.5rem] md:rounded-[2rem] shadow-lg mt-2 md:mt-4 ${manageData.type === 'add' ? 'bg-primary hover:bg-primary-hover shadow-primary/30 border border-white/20' : 'bg-surface border-2 border-border text-text-primary hover:border-text-secondary shadow-none'}`}
                >
                  Konfirmasi {manageData.type === 'add' ? 'Nabung' : 'Tarik'}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- BOTTOM SHEET: KONFIRMASI HAPUS / SELESAI TARGET --- */}
      <AnimatePresence>
        {confirmActionData && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmActionData(null)}
              className='fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm'
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[70] bg-surface rounded-t-[2.5rem] md:rounded-t-[3rem] p-6 md:p-8 shadow-2xl border-t border-border max-w-md md:max-w-2xl mx-auto flex flex-col'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6 flex-shrink-0'></div>
              <div className='flex justify-between items-center mb-6 md:mb-8'>
                <h3 className='font-black text-xl md:text-2xl text-text-primary flex items-center gap-2'>
                  {confirmActionData.action === 'complete' ? (
                    <>
                      <CheckCircle2 className='w-6 h-6 md:w-8 md:h-8 text-income' />{' '}
                      Selesaikan Target
                    </>
                  ) : (
                    <>
                      <AlertTriangle className='w-6 h-6 md:w-8 md:h-8 text-expense' />{' '}
                      Hapus Target
                    </>
                  )}
                </h3>
                <button
                  onClick={() => setConfirmActionData(null)}
                  className='w-8 h-8 md:w-10 md:h-10 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <div className='mb-6 md:mb-8 text-sm md:text-base text-text-secondary leading-relaxed bg-bg border border-border p-5 rounded-2xl'>
                {confirmActionData.action === 'complete'
                  ? `Selamat! Target "${confirmActionData.plan.title}" sudah tercapai. 🎉`
                  : `Yakin mau menghapus target "${confirmActionData.plan.title}"?`}
                {confirmActionData.plan.currentAmount > 0 && (
                  <span className='block mt-3 font-bold text-text-primary'>
                    Dana terkumpul sebesar{' '}
                    <span
                      className={
                        confirmActionData.action === 'complete'
                          ? 'text-income bg-income/10 px-2 py-0.5 rounded-md'
                          : 'text-expense bg-expense/10 px-2 py-0.5 rounded-md'
                      }
                    >
                      Rp{' '}
                      {confirmActionData.plan.currentAmount.toLocaleString(
                        'id-ID',
                      )}
                    </span>{' '}
                    akan dicairkan kembali ke dompetmu.
                  </span>
                )}
              </div>

              {confirmActionData.plan.currentAmount > 0 && (
                <div className='space-y-4 mb-6 md:mb-8'>
                  <div
                    onClick={() => {
                      setAccountPickerTarget('confirm');
                      setIsAccountModalOpen(true);
                    }}
                    className='bg-bg/50 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-5 border border-border cursor-pointer hover:border-primary/50 transition-all flex justify-between items-center group'
                  >
                    <div>
                      <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1 group-hover:text-text-primary transition-colors'>
                        Cairkan Ke Dompet
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
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExecuteAction}
                className={`w-full py-4 md:py-5 text-surface text-base md:text-lg font-black rounded-[1.5rem] md:rounded-[2rem] shadow-lg mt-2 ${confirmActionData.action === 'complete' ? 'bg-income hover:bg-green-600 shadow-income/30 border border-white/20' : 'bg-expense hover:bg-red-600 shadow-expense/30 border border-white/20'}`}
              >
                {confirmActionData.action === 'complete'
                  ? 'Cairkan & Selesai'
                  : confirmActionData.plan.currentAmount > 0
                    ? 'Cairkan & Hapus'
                    : 'Ya, Hapus Target'}
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- REUSABLE MODAL PILIH DOMPET --- */}
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
              className='fixed inset-x-0 bottom-0 z-[90] bg-surface rounded-t-[2.5rem] md:rounded-t-[3rem] p-6 md:p-8 shadow-2xl border-t border-border max-w-md md:max-w-xl mx-auto'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6 flex-shrink-0'></div>
              <div className='flex justify-between items-center mb-6'>
                <h3 className='font-black text-xl md:text-2xl text-text-primary flex items-center gap-2'>
                  <Wallet className='w-6 h-6 text-primary' /> Pilih Dompet
                </h3>
                <button
                  onClick={() => setIsAccountModalOpen(false)}
                  className='w-8 h-8 md:w-10 md:h-10 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
              <div className='space-y-3 max-h-[50vh] overflow-y-auto scrollbar-hide pb-4 px-1'>
                {accounts.map((acc) => {
                  const isActive =
                    (accountPickerTarget === 'initial' &&
                      initialSourceAcc === acc.id) ||
                    (accountPickerTarget !== 'initial' &&
                      selectedAccountId === acc.id);
                  return (
                    <button
                      key={acc.id}
                      onClick={() => {
                        if (accountPickerTarget === 'initial')
                          setInitialSourceAcc(acc.id);
                        else setSelectedAccountId(acc.id);
                        setIsAccountModalOpen(false);
                      }}
                      className={`w-full flex justify-between items-center p-4 md:p-5 rounded-[1.2rem] md:rounded-[1.5rem] transition-colors border ${isActive ? 'bg-primary/10 border-primary/30 text-primary shadow-sm' : 'bg-bg text-text-primary border-transparent hover:border-border'}`}
                    >
                      <span className='font-bold text-sm md:text-base'>
                        {acc.name}
                      </span>
                      <span className='text-sm md:text-base font-bold opacity-80'>
                        Rp {acc.balance.toLocaleString('id-ID')}
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

// --- SUB-COMPONENT: SAVING CARD ---
function SavingCard({ plan, onConfirmAction, onManage }) {
  const formatRupiah = (num) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num || 0);

  const stats = useMemo(() => {
    const today = new Date();
    const start = plan.startDate ? parseISO(plan.startDate) : today;
    const end = plan.deadline ? parseISO(plan.deadline) : today;

    const totalDays = Math.max(differenceInDays(end, start), 1);
    const daysLeft = Math.max(differenceInDays(end, today), 0);
    const remainingAmount = Math.max(plan.targetAmount - plan.currentAmount, 0);

    const progress = Math.min(
      (plan.currentAmount / plan.targetAmount) * 100,
      100,
    );
    const daily = remainingAmount / Math.max(daysLeft, 1);

    return {
      daysLeft,
      remainingAmount,
      progress,
      daily,
      weekly: remainingAmount / (Math.max(daysLeft, 1) / 7),
      monthly: remainingAmount / (Math.max(daysLeft, 1) / 30),
      isCompleted: plan.currentAmount >= plan.targetAmount,
    };
  }, [plan]);

  const getSacrificeText = (dailyAmount) => {
    if (dailyAmount <= 5000) return 'Tahan jajan cilok sehari aja!';
    if (dailyAmount <= 15000) return 'Kurangin jajan es teh / manis';
    if (dailyAmount <= 35000) return 'Sisihkan setara segelas es kopi susu';
    if (dailyAmount <= 75000) return 'Ganti makan siang di luar sama bekal';
    if (dailyAmount <= 150000) return 'Skip dulu nongkrong cantiknya';
    if (dailyAmount <= 300000) return 'Tunda checkout keranjang oren!';
    if (dailyAmount <= 750000) return 'Sisihkan gaji/uang jajan harianmu';
    return 'Targetnya sultan nih, fokus kerja/usaha ya! 🔥';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className='bg-surface/80 backdrop-blur-xl rounded-[2rem] md:rounded-[2.5rem] border border-border shadow-sm overflow-hidden relative transition-all group'
    >
      <div className='absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none'>
        <Target className='w-32 h-32 md:w-48 md:h-48 text-text-primary' />
      </div>

      <div className='p-6 md:p-8 relative z-10'>
        <div className='flex justify-between items-start mb-4 md:mb-6'>
          <div>
            <h4 className='text-xl md:text-2xl font-black text-text-primary mb-1 md:mb-2 tracking-tight'>
              {plan.title}
            </h4>
            <div className='flex items-center gap-1.5 px-2.5 py-1 md:py-1.5 bg-bg rounded-lg inline-flex border border-border'>
              <Calendar className='w-3 h-3 md:w-4 md:h-4 text-text-secondary' />
              <p className='text-[10px] md:text-xs font-bold text-text-secondary uppercase tracking-widest'>
                {stats.daysLeft} Hari Lagi
              </p>
            </div>
          </div>
          <button
            onClick={() => onConfirmAction(plan, 'delete')}
            className='p-2 md:p-3 text-text-secondary hover:text-expense hover:bg-expense/10 rounded-xl md:rounded-2xl transition-colors'
          >
            <Trash2 className='w-4 h-4 md:w-5 md:h-5' />
          </button>
        </div>

        <div className='mb-6 md:mb-8'>
          <div className='flex justify-between items-end mb-2 md:mb-3'>
            <span className='text-3xl md:text-4xl font-black text-text-primary'>
              {stats.progress.toFixed(0)}%
            </span>
            <span className='text-xs md:text-sm font-bold text-text-secondary'>
              {formatRupiah(plan.currentAmount)} /{' '}
              <span className='text-text-primary'>
                {formatRupiah(plan.targetAmount)}
              </span>
            </span>
          </div>
          <div className='w-full h-3.5 md:h-4 bg-bg border border-border rounded-full overflow-hidden shadow-inner'>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.progress}%` }}
              transition={{ duration: 1.5, type: 'spring' }}
              className='h-full bg-gradient-to-r from-primary to-primary-hover rounded-full'
            />
          </div>
        </div>

        {!stats.isCompleted && (
          <div className='flex gap-2 mb-6 md:mb-8'>
            <button
              onClick={() => onManage('add')}
              className='flex-1 flex items-center justify-center gap-2 py-3 md:py-4 bg-primary text-surface font-bold text-sm md:text-base rounded-2xl md:rounded-[1.5rem] hover:opacity-90 transition-opacity shadow-[0_8px_20px_rgb(220,198,255,0.4)]'
            >
              <PlusCircle className='w-4 h-4 md:w-5 md:h-5' /> Nabung
            </button>
            <button
              onClick={() => onManage('withdraw')}
              disabled={plan.currentAmount <= 0}
              className='flex-[0.5] flex items-center justify-center py-3 md:py-4 bg-bg border border-border text-text-primary font-bold text-sm md:text-base rounded-2xl md:rounded-[1.5rem] hover:bg-bg-hover transition-colors shadow-sm disabled:opacity-50'
            >
              Tarik
            </button>
          </div>
        )}

        {!stats.isCompleted ? (
          <div className='grid grid-cols-3 gap-2 md:gap-3 mb-6 md:mb-8'>
            <div className='bg-surface border border-border p-3 md:p-4 rounded-2xl md:rounded-3xl text-center'>
              <p className='text-[8px] md:text-[10px] font-black text-text-secondary uppercase tracking-wider mb-1'>
                Harian
              </p>
              <p className='text-xs md:text-sm font-black text-text-primary'>
                {formatRupiah(stats.daily)}
              </p>
            </div>
            <div className='bg-surface border border-border p-3 md:p-4 rounded-2xl md:rounded-3xl text-center'>
              <p className='text-[8px] md:text-[10px] font-black text-text-secondary uppercase tracking-wider mb-1'>
                Mingguan
              </p>
              <p className='text-xs md:text-sm font-black text-text-primary'>
                {formatRupiah(stats.weekly)}
              </p>
            </div>
            <div className='bg-primary/10 border border-primary/20 p-3 md:p-4 rounded-2xl md:rounded-3xl text-center'>
              <p className='text-[8px] md:text-[10px] font-black text-primary uppercase tracking-wider mb-1'>
                Bulanan
              </p>
              <p className='text-xs md:text-sm font-black text-text-primary'>
                {formatRupiah(stats.monthly)}
              </p>
            </div>
          </div>
        ) : (
          <div className='bg-income/10 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-income/20 flex flex-col gap-4 mb-6 md:mb-8'>
            <div className='flex items-center gap-3 md:gap-4'>
              <div className='w-10 h-10 md:w-12 md:h-12 bg-income/20 rounded-full flex items-center justify-center flex-shrink-0'>
                <CheckCircle2 className='w-6 h-6 md:w-7 md:h-7 text-income' />
              </div>
              <div>
                <p className='text-sm md:text-base font-bold text-income leading-tight'>
                  Target tercapai! 🎉
                </p>
                <p className='text-[10px] md:text-xs font-medium text-income/80 mt-0.5 md:mt-1'>
                  Kamu berhasil mengumpulkan {formatRupiah(plan.currentAmount)}
                </p>
              </div>
            </div>
            <button
              onClick={() => onConfirmAction(plan, 'complete')}
              className='w-full py-3 md:py-4 bg-income text-surface font-bold rounded-xl md:rounded-2xl shadow-sm hover:opacity-90 active:scale-95 transition-all text-sm md:text-base flex items-center justify-center gap-2 border border-white/20'
            >
              <Wallet className='w-4 h-4 md:w-5 md:h-5' /> Selesaikan & Cairkan
            </button>
          </div>
        )}

        {!stats.isCompleted && (
          <div className='bg-warning/10 p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-warning/20 flex items-center gap-4'>
            <div className='w-10 h-10 md:w-12 md:h-12 bg-surface rounded-[1rem] md:rounded-[1.2rem] flex items-center justify-center shadow-sm flex-shrink-0'>
              <Flame className='w-5 h-5 md:w-6 md:h-6 text-warning' />
            </div>
            <div>
              <p className='text-[10px] md:text-xs font-black text-warning uppercase tracking-widest mb-0.5'>
                Daily Sacrifice
              </p>
              <p className='text-xs md:text-sm font-bold text-warning/90 leading-snug'>
                {getSacrificeText(stats.daily)} ({formatRupiah(stats.daily)}
                /hari).
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
