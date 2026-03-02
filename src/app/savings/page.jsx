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

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);

  // State for Manage (Topup / Withdraw)
  const [manageData, setManageData] = useState(null); // { plan, type: 'add' | 'withdraw' }
  const [manageAmount, setManageAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    targetAmount: '',
    currentAmount: '', // Dikosongkan defaultnya agar placeholder muncul
    deadline: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
  });

  // State Sumber Dana khusus untuk "Modal Awal"
  const [initialSourceAcc, setInitialSourceAcc] = useState('');

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

    // Jika ada modal awal, potong dari dompet & catat sebagai pengeluaran
    if (initial > 0) {
      if (!initialSourceAcc)
        return alert('Pilih sumber dompet untuk modal awal dulu! 🏦');

      const currentAccs = [...accounts];
      const accIndex = currentAccs.findIndex((a) => a.id === initialSourceAcc);

      if (currentAccs[accIndex].balance < initial) {
        return alert('Waduh, saldo dompet nggak cukup buat modal awal ini! 🥲');
      }

      // 1. Potong Saldo
      currentAccs[accIndex].balance -= initial;
      setAccounts(currentAccs);
      await db.setItem('accounts', currentAccs);

      // 2. Update Global Balance & Expense
      const currentGlobalBalance = (await db.getItem('balance')) || 0;
      await db.setItem('balance', currentGlobalBalance - initial);

      const exp = (await db.getItem('expense')) || 0;
      await db.setItem('expense', exp + initial);

      // 3. Catat di Riwayat Transaksi
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

    // Buat Plan Tabungan Baru
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

  const deletePlan = async (id) => {
    if (
      !confirm(
        'Yakin mau hapus target tabungan ini? (Uang yang sudah dicatat masuk tidak akan otomatis kembali ke dompet)',
      )
    )
      return;
    const updated = savings.filter((s) => s.id !== id);
    setSavings(updated);
    await db.setItem('savings_plans', updated);
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

    if (isTopup && currentAccs[accIndex].balance < amount) {
      return alert('Saldo di dompet tidak cukup untuk nabung sebesar ini! 🥲');
    }
    if (!isTopup && manageData.plan.currentAmount < amount) {
      return alert('Duit tabungannya nggak cukup buat ditarik segini! 🥲');
    }

    // 1. Update Tabungan
    const updatedSavings = savings.map((s) => {
      if (s.id === manageData.plan.id) {
        return {
          ...s,
          currentAmount: s.currentAmount + (isTopup ? amount : -amount),
        };
      }
      return s;
    });

    // 2. Update Dompet
    currentAccs[accIndex].balance += isTopup ? -amount : amount;

    // 3. Update Pemasukan/Pengeluaran Global
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

    // 4. Catat Riwayat Transaksi
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

  const formatRupiah = (num) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num || 0);

  return (
    <main className='min-h-screen bg-bg relative overflow-x-hidden font-sans pb-28'>
      {/* Background Soft Glow */}
      <div className='absolute top-[-5%] right-[-10%] w-64 h-64 bg-primary/20 rounded-full mix-blend-multiply filter blur-[80px] z-0 pointer-events-none'></div>

      <motion.div
        variants={pageVariants}
        initial='hidden'
        animate='visible'
        className='relative z-10 p-6 max-w-md mx-auto'
      >
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
            <h1 className='text-xl font-black text-text-primary tracking-tight'>
              Saving Plan
            </h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddModal(true)}
            className='w-11 h-11 bg-gradient-to-tr from-primary to-primary-hover rounded-2xl flex items-center justify-center shadow-[0_8px_20px_rgb(220,198,255,0.4)] dark:shadow-[0_8px_20px_rgb(155,126,222,0.3)] text-surface border border-white/20'
          >
            <Plus className='w-6 h-6 stroke-[3]' />
          </motion.button>
        </header>

        {/* --- LIST SAVING PLANS --- */}
        <div className='space-y-5'>
          <AnimatePresence mode='popLayout'>
            {savings.length === 0 ? (
              <motion.div
                key='empty-state'
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className='text-center py-20 bg-surface/60 backdrop-blur-md rounded-[2.5rem] border border-dashed border-border shadow-sm'
              >
                <Target className='w-14 h-14 text-text-secondary/30 mx-auto mb-4' />
                <p className='text-text-secondary font-bold text-sm'>
                  Belum ada target? <br />
                  Mimpi aja dulu, catat kemudian! ✨
                </p>
              </motion.div>
            ) : (
              savings.map((plan) => (
                <SavingCard
                  key={plan.id}
                  plan={plan}
                  onDelete={() => deletePlan(plan.id)}
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
              className='fixed inset-x-0 bottom-0 z-[70] bg-surface rounded-t-[2.5rem] p-6 shadow-2xl border-t border-border max-w-md mx-auto flex flex-col max-h-[90vh]'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6 flex-shrink-0'></div>
              <div className='flex justify-between items-center mb-6 flex-shrink-0'>
                <h3 className='font-black text-xl text-text-primary flex items-center gap-2'>
                  <Target className='w-6 h-6 text-primary' /> Target Baru
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className='w-8 h-8 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <div className='space-y-4 overflow-y-auto scrollbar-hide pb-4 px-1'>
                <div className='bg-bg/50 rounded-[1.5rem] p-4 border border-border focus-within:border-primary transition-colors'>
                  <label className='text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-1'>
                    Nama Keinginan
                  </label>
                  <input
                    type='text'
                    placeholder='Misal: iPhone 17 Pro Max'
                    className='w-full bg-transparent font-bold outline-none text-text-primary text-sm placeholder:font-normal'
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div className='bg-bg/50 rounded-[1.5rem] p-4 border border-border focus-within:border-primary transition-colors'>
                    <label className='text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-1'>
                      Target (Rp)
                    </label>
                    <input
                      type='number'
                      placeholder='0'
                      className='w-full bg-transparent font-bold outline-none text-text-primary text-sm'
                      value={formData.targetAmount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetAmount: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className='bg-bg/50 rounded-[1.5rem] p-4 border border-border focus-within:border-primary transition-colors'>
                    <label className='text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-1'>
                      Modal Awal
                    </label>
                    <input
                      type='number'
                      placeholder='Opsional'
                      className='w-full bg-transparent font-bold outline-none text-text-primary text-sm placeholder:font-normal'
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

                {/* Pilih Dompet hanya muncul kalau Modal Awal diisi > 0 */}
                <AnimatePresence>
                  {parseFloat(formData.currentAmount) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className='overflow-hidden'
                    >
                      <div className='bg-bg/50 rounded-[1.5rem] p-4 border border-border focus-within:border-primary transition-colors mt-1'>
                        <label className='text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-2'>
                          Ambil Uang Dari
                        </label>
                        <select
                          value={initialSourceAcc}
                          onChange={(e) => setInitialSourceAcc(e.target.value)}
                          className='w-full bg-transparent outline-none text-sm font-bold text-text-primary appearance-none cursor-pointer'
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} (Rp{' '}
                              {acc.balance.toLocaleString('id-ID')})
                            </option>
                          ))}
                        </select>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Date Input yg Mudah di-Klik */}
                <div className='relative bg-bg/50 rounded-[1.5rem] p-4 border border-border focus-within:border-primary transition-colors flex items-center justify-between group'>
                  <div>
                    <label className='text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-1'>
                      Deadline
                    </label>
                    <div className='font-bold text-text-primary text-sm'>
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
                  <Calendar className='w-5 h-5 text-text-secondary group-hover:text-primary transition-colors flex-shrink-0' />
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
                  className='w-full py-4 bg-gradient-to-r from-primary to-primary-hover text-surface font-black rounded-[1.5rem] shadow-[0_10px_20px_rgb(220,198,255,0.4)] dark:shadow-[0_10px_20px_rgb(155,126,222,0.2)] mt-2'
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
              className='fixed inset-x-0 bottom-0 z-[70] bg-surface rounded-t-[2.5rem] p-6 shadow-2xl border-t border-border max-w-md mx-auto flex flex-col'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6'></div>
              <div className='flex justify-between items-center mb-6'>
                <h3 className='font-black text-xl text-text-primary flex items-center gap-2'>
                  {manageData.type === 'add' ? (
                    <>
                      <PlusCircle className='w-6 h-6 text-income' /> Isi
                      Tabungan
                    </>
                  ) : (
                    <>
                      <MinusCircle className='w-6 h-6 text-expense' /> Tarik
                      Tabungan
                    </>
                  )}
                </h3>
                <button
                  onClick={() => setManageData(null)}
                  className='w-8 h-8 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <div className='mb-6'>
                <p className='text-xs text-text-secondary font-semibold mb-1'>
                  Target:{' '}
                  <span className='text-text-primary font-black'>
                    {manageData.plan.title}
                  </span>
                </p>
                <p className='text-[10px] font-black uppercase text-text-secondary tracking-widest bg-bg px-3 py-1.5 rounded-lg inline-block border border-border'>
                  Terkumpul: {formatRupiah(manageData.plan.currentAmount)}
                </p>
              </div>

              <div className='space-y-4'>
                <div className='bg-bg/50 rounded-[1.5rem] p-4 border border-border focus-within:border-primary transition-colors flex items-center'>
                  <span className='text-2xl font-black text-text-secondary mr-2'>
                    Rp
                  </span>
                  <div className='w-full'>
                    <label className='text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-1'>
                      Nominal
                    </label>
                    <input
                      type='number'
                      placeholder='0'
                      className='w-full bg-transparent font-black text-xl outline-none text-text-primary'
                      value={manageAmount}
                      onChange={(e) => setManageAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className='bg-bg/50 rounded-[1.5rem] p-4 border border-border focus-within:border-primary transition-colors'>
                  <label className='text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-2'>
                    {manageData.type === 'add'
                      ? 'Ambil Uang Dari'
                      : 'Cairkan Ke Dompet'}
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className='w-full bg-transparent outline-none text-sm font-bold text-text-primary appearance-none cursor-pointer'
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Rp {acc.balance.toLocaleString('id-ID')})
                      </option>
                    ))}
                  </select>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleManageSubmit}
                  className={`w-full py-4 text-surface font-black rounded-[1.5rem] shadow-lg mt-2 ${manageData.type === 'add' ? 'bg-primary hover:bg-primary-hover shadow-primary/30' : 'bg-surface border-2 border-border text-text-primary hover:border-text-secondary shadow-none'}`}
                >
                  Konfirmasi {manageData.type === 'add' ? 'Nabung' : 'Tarik'}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}

// --- SUB-COMPONENT: SAVING CARD ---
function SavingCard({ plan, onDelete, onManage }) {
  const formatRupiah = (num) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num || 0);

  // Perhitungan Proyeksi
  const stats = useMemo(() => {
    const today = new Date();
    // Safety check supaya kalau datanya aneh nggak error layarnya
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

  // Logic Teks "Daily Sacrifice" yang Nyata & Realistis
  const getSacrificeText = (dailyAmount) => {
    if (dailyAmount <= 5000) return 'Tahan jajan cilok sehari aja!';
    if (dailyAmount <= 15000) return 'Kurangin jajan es teh / cemilan manis';
    if (dailyAmount <= 35000) return 'Sisihkan setara segelas es kopi susu';
    if (dailyAmount <= 75000) return 'Ganti makan siang di luar sama bekal';
    if (dailyAmount <= 150000) return 'Skip dulu nongkrong cantiknya hari ini';
    if (dailyAmount <= 300000) return 'Tunda dulu checkout keranjang oren-nya!';
    if (dailyAmount <= 750000)
      return 'Sisihkan sebagian gaji/uang jajan harianmu';
    return 'Targetnya sultan nih, fokus kerja/usaha ya bossque! 🔥';
  };

  return (
    <motion.div
      layout // Biar pas di-delete animasinya geser ke atas dengan mulus
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className='bg-surface/80 backdrop-blur-xl rounded-[2rem] border border-border shadow-sm overflow-hidden relative transition-all group'
    >
      {/* Background Decor */}
      <div className='absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none'>
        <Target className='w-32 h-32 text-text-primary' />
      </div>

      <div className='p-6 relative z-10'>
        <div className='flex justify-between items-start mb-4'>
          <div>
            <h4 className='text-xl font-black text-text-primary mb-1 tracking-tight'>
              {plan.title}
            </h4>
            <div className='flex items-center gap-1.5 px-2.5 py-1 bg-bg rounded-lg inline-flex border border-border'>
              <Calendar className='w-3 h-3 text-text-secondary' />
              <p className='text-[10px] font-bold text-text-secondary uppercase tracking-widest'>
                {stats.daysLeft} Hari Lagi
              </p>
            </div>
          </div>
          <button
            onClick={onDelete}
            className='p-2 text-text-secondary hover:text-expense hover:bg-expense/10 rounded-xl transition-colors'
          >
            <Trash2 className='w-4 h-4' />
          </button>
        </div>

        {/* Progress Bar */}
        <div className='mb-6'>
          <div className='flex justify-between items-end mb-2'>
            <span className='text-3xl font-black text-text-primary'>
              {stats.progress.toFixed(0)}%
            </span>
            <span className='text-xs font-bold text-text-secondary'>
              {formatRupiah(plan.currentAmount)} /{' '}
              <span className='text-text-primary'>
                {formatRupiah(plan.targetAmount)}
              </span>
            </span>
          </div>
          <div className='w-full h-3.5 bg-bg border border-border rounded-full overflow-hidden shadow-inner'>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.progress}%` }}
              transition={{ duration: 1.5, type: 'spring' }}
              className='h-full bg-gradient-to-r from-primary to-primary-hover rounded-full'
            />
          </div>
        </div>

        {/* Aksi Nabung & Tarik */}
        <div className='flex gap-2 mb-6'>
          <button
            onClick={() => onManage('add')}
            disabled={stats.isCompleted}
            className='flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-surface font-bold text-sm rounded-2xl hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50'
          >
            <PlusCircle className='w-4 h-4' /> Nabung
          </button>
          <button
            onClick={() => onManage('withdraw')}
            disabled={plan.currentAmount <= 0}
            className='flex-[0.5] flex items-center justify-center py-3 bg-bg border border-border text-text-primary font-bold text-sm rounded-2xl hover:bg-bg-hover transition-colors shadow-sm disabled:opacity-50'
          >
            Tarik
          </button>
        </div>

        {/* Projection Grid */}
        {!stats.isCompleted ? (
          <div className='grid grid-cols-3 gap-2 mb-6'>
            <div className='bg-surface border border-border p-3 rounded-2xl text-center'>
              <p className='text-[8px] font-black text-text-secondary uppercase tracking-wider mb-1'>
                Harian
              </p>
              <p className='text-xs font-black text-text-primary'>
                {formatRupiah(stats.daily)}
              </p>
            </div>
            <div className='bg-surface border border-border p-3 rounded-2xl text-center'>
              <p className='text-[8px] font-black text-text-secondary uppercase tracking-wider mb-1'>
                Mingguan
              </p>
              <p className='text-xs font-black text-text-primary'>
                {formatRupiah(stats.weekly)}
              </p>
            </div>
            <div className='bg-primary/10 border border-primary/20 p-3 rounded-2xl text-center'>
              <p className='text-[8px] font-black text-primary uppercase tracking-wider mb-1'>
                Bulanan
              </p>
              <p className='text-xs font-black text-text-primary'>
                {formatRupiah(stats.monthly)}
              </p>
            </div>
          </div>
        ) : (
          <div className='bg-income/10 p-4 rounded-[1.5rem] border border-income/20 flex items-center gap-3 mb-6'>
            <div className='w-8 h-8 bg-income/20 rounded-full flex items-center justify-center flex-shrink-0'>
              <CheckCircle2 className='w-5 h-5 text-income' />
            </div>
            <p className='text-xs font-bold text-income leading-tight'>
              Target tercapai! Kamu keren banget! ✨
            </p>
          </div>
        )}

        {/* Insight Feature: Daily Sacrifice (Dynamic Text) */}
        {!stats.isCompleted && (
          <div className='bg-warning/10 p-4 rounded-[1.5rem] border border-warning/20 flex items-center gap-4'>
            <div className='w-10 h-10 bg-surface rounded-[1rem] flex items-center justify-center shadow-sm flex-shrink-0'>
              <Flame className='w-5 h-5 text-warning' />
            </div>
            <div>
              <p className='text-[10px] font-black text-warning uppercase tracking-widest mb-0.5'>
                Daily Sacrifice
              </p>
              <p className='text-xs font-bold text-warning/90 leading-snug'>
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
