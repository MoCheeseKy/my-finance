'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/storage';
import {
  ArrowLeft,
  User,
  Download,
  Upload,
  Trash2,
  Edit3,
  Save,
  AlertTriangle,
  CheckCircle2,
  Moon,
  Sun,
  Info,
  Shield,
  HelpCircle,
  MessageSquare,
  Code,
  Coffee,
  ChevronRight,
  Database,
  Settings,
  X,
  Heart,
  Github,
  Instagram,
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

export default function UserPage() {
  const router = useRouter();

  // State Profile & Theme
  const [isEditing, setIsEditing] = useState(false);
  const [theme, setTheme] = useState('light');
  const [profile, setProfile] = useState({
    name: 'CEO Muda',
    bio: 'Bismillah konsisten!',
  });

  // State Feedback & Modals
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeMenuModal, setActiveMenuModal] = useState(null);

  // State Hapus Data
  const [deleteType, setDeleteType] = useState('all');
  const [deleteRange, setDeleteRange] = useState('all');
  const [deleteMonth, setDeleteMonth] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const savedProfile = await db.getItem('profile');
      if (savedProfile) setProfile(savedProfile);

      const savedTheme = localStorage.getItem('app-theme') || 'light';
      setTheme(savedTheme);
      if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    };
    loadData();
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    if (newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const handleSaveProfile = async () => {
    await db.setItem('profile', profile);
    setIsEditing(false);
    showMessage('success', 'Profil berhasil diperbarui!');
  };

  // --- LOGIC MANAJEMEN DATA ---
  const handleExportData = async () => {
    try {
      const allData = {
        profile: await db.getItem('profile'),
        accounts: await db.getItem('accounts'),
        transactions: await db.getItem('transactions'),
        balance: await db.getItem('balance'),
        income: await db.getItem('income'),
        expense: await db.getItem('expense'),
        savings_plans: await db.getItem('savings_plans'),
        investments: await db.getItem('investments'),
        budgets: await db.getItem('budgets'),
      };
      const dataStr = JSON.stringify(allData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-keuangan-${new Date().toLocaleDateString('id-ID')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage('success', 'Data berhasil di-backup!');
    } catch (error) {
      showMessage('error', 'Gagal backup data.');
    }
  };

  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (!importedData.accounts || !importedData.transactions)
          throw new Error('Format salah');

        if (importedData.profile)
          await db.setItem('profile', importedData.profile);
        await db.setItem('accounts', importedData.accounts);
        await db.setItem('transactions', importedData.transactions);
        await db.setItem('balance', importedData.balance || 0);
        await db.setItem('income', importedData.income || 0);
        await db.setItem('expense', importedData.expense || 0);

        if (importedData.savings_plans)
          await db.setItem('savings_plans', importedData.savings_plans);
        if (importedData.investments)
          await db.setItem('investments', importedData.investments);
        if (importedData.budgets)
          await db.setItem('budgets', importedData.budgets);

        showMessage('success', 'Data berhasil di-restore! Memuat ulang...');
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        showMessage('error', 'File backup rusak / tidak valid.');
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleExecuteDelete = async () => {
    if (deleteType === 'all') {
      await db.setItem('transactions', []);
      await db.setItem('accounts', [{ id: 'cash', name: 'Cash', balance: 0 }]);
      await db.setItem('balance', 0);
      await db.setItem('income', 0);
      await db.setItem('expense', 0);
      await db.setItem('savings_plans', []);
      await db.setItem('investments', []);

      showMessage('success', 'Semua data berhasil dihapus.');
      setTimeout(() => {
        setIsDeleteModalOpen(false);
        router.push('/');
      }, 1000);
    } else if (deleteType === 'transactions') {
      let txns = (await db.getItem('transactions')) || [];
      if (deleteRange === 'all') {
        txns = [];
      } else if (deleteRange === 'month' && deleteMonth) {
        txns = txns.filter((t) => !t.date.startsWith(deleteMonth));
      } else {
        return showMessage('error', 'Pilih bulan yang mau dihapus!');
      }
      await db.setItem('transactions', txns);
      showMessage('success', 'Data transaksi berhasil dihapus!');
      setIsDeleteModalOpen(false);
    }
  };

  // Komponen Menu Link
  const MenuLink = ({
    icon: Icon,
    title,
    onClick,
    href,
    color = 'text-stone-600',
    bg = 'bg-stone-100',
    isLast = false,
  }) => {
    const content = (
      <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-4 bg-surface hover:bg-bg-hover transition-colors text-left group ${!isLast ? 'border-b border-border' : ''}`}
      >
        <div className='flex items-center gap-4'>
          <div
            className={`w-10 h-10 md:w-12 md:h-12 rounded-[1rem] flex items-center justify-center group-hover:scale-110 transition-transform ${bg}`}
          >
            <Icon className={`w-5 h-5 md:w-6 md:h-6 ${color}`} />
          </div>
          <span className='font-bold text-[15px] md:text-base text-text-primary group-hover:text-primary transition-colors'>
            {title}
          </span>
        </div>
        <ChevronRight className='w-5 h-5 text-text-secondary group-hover:translate-x-1 transition-transform' />
      </button>
    );
    return href ? (
      <a href={href} target='_blank' rel='noreferrer' className='block w-full'>
        {content}
      </a>
    ) : (
      content
    );
  };

  return (
    <main className='min-h-screen bg-bg relative overflow-x-hidden font-sans pb-32 md:pb-12 md:pl-32 lg:pl-36 transition-all duration-500'>
      <div className='absolute top-[-5%] left-[-10%] w-64 h-64 md:w-96 md:h-96 lg:w-[40rem] lg:h-[40rem] bg-primary/20 rounded-full mix-blend-multiply filter blur-[80px] lg:blur-[120px] z-0 pointer-events-none'></div>

      <motion.div
        variants={pageVariants}
        initial='hidden'
        animate='visible'
        className='relative z-10 p-6 max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto'
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
              Profil & Setelan
            </h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.05, rotate: 180 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.3 }}
            onClick={handleThemeToggle}
            className='w-11 h-11 bg-surface/80 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-sm border border-border transition-colors'
          >
            {theme === 'light' ? (
              <Moon className='w-5 h-5 text-text-secondary' />
            ) : (
              <Sun className='w-5 h-5 text-warning' />
            )}
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
          {/* KOLOM KIRI (Profil & Danger Zone) */}
          <div className='lg:col-span-5 flex flex-col gap-6'>
            {/* SECTION 1: PROFIL CARD */}
            <motion.section
              variants={itemVariants}
              className='bg-surface/80 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] shadow-sm border border-border relative overflow-hidden transition-colors'
            >
              <div className='absolute top-0 right-0 w-32 h-32 md:w-48 md:h-48 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10'></div>

              <div className='flex items-start justify-between mb-5 md:mb-8 relative z-10'>
                <div className='w-20 h-20 md:w-24 md:h-24 bg-gradient-to-tr from-primary to-investment rounded-[1.5rem] md:rounded-[2rem] p-1 shadow-sm rotate-3'>
                  <div className='w-full h-full bg-surface rounded-[1.2rem] md:rounded-[1.7rem] flex items-center justify-center border border-surface -rotate-3'>
                    <User className='w-8 h-8 md:w-10 md:h-10 text-primary' />
                  </div>
                </div>
                <button
                  onClick={() =>
                    isEditing ? handleSaveProfile() : setIsEditing(true)
                  }
                  className={`px-5 py-2.5 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm ${isEditing ? 'bg-primary text-surface hover:opacity-90' : 'bg-bg-hover text-text-primary hover:bg-border'}`}
                >
                  {isEditing ? (
                    <>
                      <Save className='w-4 h-4' /> Simpan
                    </>
                  ) : (
                    <>
                      <Edit3 className='w-4 h-4' /> Ubah Profil
                    </>
                  )}
                </button>
              </div>

              {isEditing ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className='space-y-4 relative z-10'
                >
                  <div className='bg-bg/50 rounded-[1.5rem] p-4 border border-border focus-within:border-primary transition-colors'>
                    <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1'>
                      Nama Panggilan
                    </label>
                    <input
                      type='text'
                      value={profile.name}
                      onChange={(e) =>
                        setProfile({ ...profile, name: e.target.value })
                      }
                      className='w-full bg-transparent outline-none font-bold text-text-primary text-lg md:text-xl'
                    />
                  </div>
                  <div className='bg-bg/50 rounded-[1.5rem] p-4 border border-border focus-within:border-primary transition-colors'>
                    <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1'>
                      Target / Bio
                    </label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) =>
                        setProfile({ ...profile, bio: e.target.value })
                      }
                      rows='2'
                      className='w-full bg-transparent outline-none font-medium text-text-secondary resize-none md:text-lg'
                    />
                  </div>
                </motion.div>
              ) : (
                <div className='relative z-10 mt-2'>
                  <h2 className='text-2xl md:text-4xl font-black text-text-primary mb-1.5 md:mb-3 tracking-tight'>
                    {profile.name}
                  </h2>
                  <p className='text-text-secondary text-sm md:text-base font-medium leading-relaxed'>
                    {profile.bio}
                  </p>
                </div>
              )}
            </motion.section>

            {/* DANGER ZONE (Pindah ke kiri bawah profil di Desktop) */}
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsDeleteModalOpen(true)}
              className='w-full bg-surface/50 backdrop-blur-sm p-5 md:p-6 rounded-[2rem] border border-expense/20 shadow-sm flex items-center justify-center gap-3 hover:bg-expense/5 transition-all group'
            >
              <Trash2 className='w-5 h-5 md:w-6 md:h-6 text-expense' />
              <span className='font-bold text-expense text-[15px] md:text-lg'>
                Hapus Data Aplikasi
              </span>
            </motion.button>

            <motion.div
              variants={itemVariants}
              className='text-center mt-4 hidden lg:block'
            >
              <p className='text-text-secondary/50 text-[10px] md:text-xs font-black uppercase tracking-widest'>
                MyFinance • v1.0.0
              </p>
            </motion.div>
          </div>

          {/* KOLOM KANAN (Manajemen Data & Menu Extra) */}
          <div className='lg:col-span-7 flex flex-col gap-6'>
            {/* SECTION 2: DATA & PENYIMPANAN */}
            <motion.div variants={itemVariants}>
              <h3 className='text-xs md:text-sm font-black text-text-secondary uppercase tracking-widest px-2 mb-3 flex items-center gap-2'>
                <Database className='w-3.5 h-3.5 md:w-4 md:h-4' /> Manajemen
                Data
              </h3>
              <section className='bg-surface/80 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-border overflow-hidden flex divide-x divide-border'>
                <button
                  onClick={handleExportData}
                  className='flex-1 p-6 md:p-8 flex flex-col items-center justify-center gap-3 md:gap-4 hover:bg-bg-hover transition-all group'
                >
                  <div className='w-14 h-14 md:w-16 md:h-16 bg-investment/10 rounded-[1.2rem] flex items-center justify-center group-hover:-translate-y-1 transition-transform duration-300'>
                    <Download className='w-6 h-6 md:w-7 md:h-7 text-investment' />
                  </div>
                  <span className='font-bold text-sm md:text-base text-text-primary'>
                    Backup Data
                  </span>
                </button>

                <label className='flex-1 p-6 md:p-8 flex flex-col items-center justify-center gap-3 md:gap-4 hover:bg-bg-hover transition-all cursor-pointer group'>
                  <div className='w-14 h-14 md:w-16 md:h-16 bg-income/10 rounded-[1.2rem] flex items-center justify-center group-hover:-translate-y-1 transition-transform duration-300'>
                    <Upload className='w-6 h-6 md:w-7 md:h-7 text-income' />
                  </div>
                  <span className='font-bold text-sm md:text-base text-text-primary'>
                    Restore Data
                  </span>
                  <input
                    type='file'
                    accept='.json'
                    className='hidden'
                    onChange={handleImportData}
                  />
                </label>
              </section>
            </motion.div>

            {/* SECTION 3: MENU EKSTRA */}
            <motion.div variants={itemVariants}>
              <h3 className='text-xs md:text-sm font-black text-text-secondary uppercase tracking-widest px-2 mb-3 flex items-center gap-2'>
                <Settings className='w-3.5 h-3.5 md:w-4 md:h-4' /> Preferensi &
                Bantuan
              </h3>
              <section className='bg-surface/80 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-border overflow-hidden'>
                <MenuLink
                  onClick={() => setActiveMenuModal('about')}
                  icon={Info}
                  title='Tentang Aplikasi'
                  bg='bg-primary/10'
                  color='text-primary'
                />
                <MenuLink
                  onClick={() => setActiveMenuModal('privacy')}
                  icon={Shield}
                  title='Kebijakan Privasi'
                  bg='bg-bg'
                  color='text-text-secondary'
                />
                <MenuLink
                  onClick={() => setActiveMenuModal('faq')}
                  icon={HelpCircle}
                  title='Bantuan & FAQ'
                  bg='bg-primary/10'
                  color='text-primary'
                />
                <MenuLink
                  onClick={() => setActiveMenuModal('developer')}
                  icon={Code}
                  title='Pengembang Aplikasi'
                  bg='bg-investment/10'
                  color='text-investment'
                />
                <MenuLink
                  onClick={() => setActiveMenuModal('coffee')}
                  icon={Coffee}
                  title='Traktir Developer'
                  bg='bg-amber-500/10'
                  color='text-amber-500'
                  isLast={true}
                />
              </section>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className='text-center mt-6 lg:hidden'
            >
              <p className='text-text-secondary/50 text-[10px] md:text-xs font-black uppercase tracking-widest'>
                MyFinance • v1.0.0
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* --- MODAL MULTIGUNA UNTUK MENU (BOTTOM SHEET) --- */}
      <AnimatePresence>
        {activeMenuModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveMenuModal(null)}
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
                <h3 className='font-black text-xl md:text-2xl text-text-primary capitalize tracking-tight flex items-center gap-2'>
                  {activeMenuModal === 'about' && (
                    <>
                      <Info className='w-6 h-6 md:w-8 md:h-8 text-primary' />{' '}
                      Tentang Aplikasi
                    </>
                  )}
                  {activeMenuModal === 'privacy' && (
                    <>
                      <Shield className='w-6 h-6 md:w-8 md:h-8 text-text-secondary' />{' '}
                      Kebijakan Privasi
                    </>
                  )}
                  {activeMenuModal === 'faq' && (
                    <>
                      <HelpCircle className='w-6 h-6 md:w-8 md:h-8 text-primary' />{' '}
                      Bantuan & FAQ
                    </>
                  )}
                  {activeMenuModal === 'developer' && (
                    <>
                      <Code className='w-6 h-6 md:w-8 md:h-8 text-investment' />{' '}
                      Pengembang
                    </>
                  )}
                  {activeMenuModal === 'coffee' && (
                    <>
                      <Coffee className='w-6 h-6 md:w-8 md:h-8 text-amber-500' />{' '}
                      Traktir Developer
                    </>
                  )}
                </h3>
                <button
                  onClick={() => setActiveMenuModal(null)}
                  className='w-8 h-8 md:w-10 md:h-10 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <div className='overflow-y-auto scrollbar-hide pb-4'>
                {/* KONTEN: TENTANG APLIKASI */}
                {activeMenuModal === 'about' && (
                  <div className='space-y-4 md:space-y-6 text-text-secondary text-[15px] md:text-base leading-relaxed'>
                    <div className='w-20 h-20 md:w-28 md:h-28 bg-primary/10 rounded-[1.5rem] md:rounded-[2rem] mx-auto flex items-center justify-center mb-5 shadow-sm border border-primary/20 rotate-3'>
                      <Database className='w-10 h-10 md:w-14 md:h-14 text-primary -rotate-3' />
                    </div>
                    <h4 className='font-black text-center text-2xl md:text-3xl text-text-primary'>
                      MyFinance
                    </h4>
                    <p className='text-center text-text-secondary/70 text-xs md:text-sm font-bold tracking-widest uppercase mb-6'>
                      Versi 1.0.0
                    </p>
                    <div className='bg-bg border border-border p-5 md:p-6 rounded-[1.5rem] space-y-3 md:space-y-4 shadow-inner'>
                      <p>
                        Aplikasi super ringan untuk menyederhanakan cara Gen-Z
                        melacak pengeluarannya.
                      </p>
                      <p>
                        Berjalan sepenuhnya di browser dengan teknologi{' '}
                        <strong>Local Storage</strong>. Data aman di HP kamu,
                        tanpa server, tanpa lemot.
                      </p>
                    </div>
                    <p className='text-center mt-6 flex items-center justify-center gap-1.5 font-bold text-text-secondary/70'>
                      Dibuat dengan{' '}
                      <Heart className='w-4 h-4 text-red-500 fill-red-500' /> &
                      Kopi.
                    </p>
                  </div>
                )}

                {/* KONTEN: KEBIJAKAN PRIVASI */}
                {activeMenuModal === 'privacy' && (
                  <div className='space-y-4 md:space-y-6 text-text-secondary text-sm md:text-base leading-relaxed'>
                    <div className='bg-bg border border-border p-5 md:p-6 rounded-[1.5rem]'>
                      <h4 className='font-black text-text-primary mb-2 text-base md:text-lg flex items-center gap-2'>
                        <Database className='w-5 h-5 text-primary' />{' '}
                        Penyimpanan Lokal
                      </h4>
                      <p>
                        Catatan keuanganmu{' '}
                        <strong>hanya tersimpan di browser perangkatmu</strong>.
                        Kami tidak mengumpulkan atau memiliki akses ke data
                        tersebut.
                      </p>
                    </div>
                    <div className='bg-bg border border-border p-5 md:p-6 rounded-[1.5rem]'>
                      <h4 className='font-black text-text-primary mb-2 text-base md:text-lg flex items-center gap-2'>
                        <Code className='w-5 h-5 text-investment' /> Fitur AI
                        Scanner
                      </h4>
                      <p>
                        Gambar bon / mutasi diproses dengan AI murni untuk
                        diekstrak teksnya dan tidak disimpan permanen di server
                        kami.
                      </p>
                    </div>
                    <div className='bg-bg border border-border p-5 md:p-6 rounded-[1.5rem]'>
                      <h4 className='font-black text-text-primary mb-2 text-base md:text-lg flex items-center gap-2'>
                        <Shield className='w-5 h-5 text-emerald-500' /> Tanggung
                        Jawab
                      </h4>
                      <p>
                        Pastikan kamu rajin menggunakan fitur{' '}
                        <strong>Backup Data</strong>. Membersihkan cache browser
                        akan menghapus data di aplikasi ini.
                      </p>
                    </div>
                  </div>
                )}

                {/* KONTEN: FAQ */}
                {activeMenuModal === 'faq' && (
                  <div className='space-y-4 md:space-y-6 text-text-secondary text-sm md:text-base leading-relaxed'>
                    <div className='bg-bg border border-border p-5 md:p-6 rounded-[1.5rem]'>
                      <h4 className='font-black text-text-primary mb-2 md:text-lg'>
                        Apakah data saya bisa hilang?
                      </h4>
                      <p>
                        Bisa. Karena aplikasi ini menggunakan Local Storage,
                        jika kamu "Clear Data/Cache" browser, data akan hilang.
                        Gunakan fitur Backup JSON.
                      </p>
                    </div>
                    <div className='bg-bg border border-border p-5 md:p-6 rounded-[1.5rem]'>
                      <h4 className='font-black text-text-primary mb-2 md:text-lg'>
                        Kenapa scan bon kadang salah?
                      </h4>
                      <p>
                        AI mencoba membaca teks dari gambar. Kualitas foto,
                        cahaya, dan bentuk struk yang lecek bisa mempengaruhi
                        akurasi AI.
                      </p>
                    </div>
                  </div>
                )}

                {/* KONTEN: PENGEMBANG */}
                {activeMenuModal === 'developer' && (
                  <div className='text-center md:px-10'>
                    <div className='relative inline-block mb-4 md:mb-6'>
                      <div className='absolute inset-0 bg-gradient-to-tr from-primary to-investment rounded-[2rem] blur-md opacity-50 rotate-6'></div>
                      <div className='w-32 h-32 md:w-40 md:h-40 relative overflow-hidden rounded-[2.5rem] border-4 border-surface shadow-xl bg-bg-hover z-10'>
                        <img
                          src='/developer-profile.jpg'
                          alt='Developer'
                          className='w-full h-full object-cover'
                          onError={(e) => {
                            e.target.src =
                              'https://ui-avatars.com/api/?name=Anak+RPL&background=dcc6ff&color=2e2e2e&size=256';
                          }}
                        />
                      </div>
                    </div>
                    <h4 className='font-black text-2xl md:text-3xl text-text-primary mb-1 tracking-tight'>
                      Rifky Muhammad Prayudhi
                    </h4>
                    <div className='inline-flex items-center gap-1.5 bg-primary/10 text-primary px-4 py-1.5 rounded-lg text-xs md:text-sm font-black uppercase tracking-widest mb-6 border border-primary/20'>
                      Software Developer
                    </div>
                    <p className='text-sm md:text-base text-text-secondary leading-relaxed bg-bg border border-border p-5 md:p-6 rounded-[1.5rem] mb-6'>
                      Membangun aplikasi ini sepenuh hati buat bantu nyelesain
                      masalah nyatet keuangan anak kosan. Kalau nemu bug atau
                      punya ide fitur, sapa aku aja!
                    </p>
                    <div className='flex justify-center gap-4'>
                      <a
                        href='#'
                        className='w-12 h-12 md:w-14 md:h-14 bg-surface border border-border shadow-sm rounded-[1rem] flex items-center justify-center text-text-primary hover:border-primary hover:text-primary transition-colors'
                      >
                        <Github className='w-5 h-5 md:w-6 md:h-6' />
                      </a>
                      <a
                        href='#'
                        className='w-12 h-12 md:w-14 md:h-14 bg-surface border border-border shadow-sm rounded-[1rem] flex items-center justify-center text-text-primary hover:border-pink-500 hover:text-pink-500 transition-colors'
                      >
                        <Instagram className='w-5 h-5 md:w-6 md:h-6' />
                      </a>
                    </div>
                  </div>
                )}

                {/* KONTEN: TRAKTIR KOPI */}
                {activeMenuModal === 'coffee' && (
                  <div className='text-center md:px-10'>
                    <p className='text-sm md:text-base text-text-secondary mb-8 leading-relaxed px-2'>
                      Walau app ini gratis & tanpa iklan, ngodingnya tetep butuh
                      kalori. Scan QRIS di bawah buat support jajan kopi! 🚀
                    </p>
                    <div className='bg-white p-5 md:p-6 rounded-[2rem] shadow-xl inline-block mb-4 border-[6px] border-surface'>
                      <img
                        src='/qris-donasi.jpeg'
                        alt='QRIS Donasi'
                        className='w-56 md:w-64 h-auto rounded-[1rem] mx-auto'
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML =
                            '<div class="w-56 h-56 flex items-center justify-center text-sm font-bold text-stone-400 text-center bg-stone-100 rounded-xl">Gambar qris-donasi.jpeg<br/>belum ada di folder public</div>';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- MODAL HAPUS DATA (BOTTOM SHEET) - BEBAS DARI HTML SELECT --- */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
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
                <h3 className='font-black text-xl md:text-2xl text-expense flex items-center gap-2'>
                  <AlertTriangle className='w-6 h-6 md:w-8 md:h-8' /> Hapus Data
                </h3>
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className='w-8 h-8 md:w-10 md:h-10 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <div className='space-y-4 md:space-y-5 mb-6 md:mb-8'>
                <label
                  className={`flex items-start gap-4 p-5 border-2 rounded-[1.5rem] cursor-pointer transition-all ${deleteType === 'all' ? 'border-expense bg-expense/10' : 'border-border bg-bg/50 hover:border-text-secondary/30'}`}
                >
                  <input
                    type='radio'
                    name='deleteType'
                    checked={deleteType === 'all'}
                    onChange={() => setDeleteType('all')}
                    className='mt-1 w-5 h-5 accent-red-600'
                  />
                  <div>
                    <div
                      className={`font-black text-[15px] md:text-lg mb-1 ${deleteType === 'all' ? 'text-expense' : 'text-text-primary'}`}
                    >
                      Hapus Semua Data
                    </div>
                    <div className='text-xs md:text-sm font-medium text-text-secondary leading-relaxed'>
                      Dompet, profil, target nabung, investasi, dan riwayat akan
                      hilang selamanya.
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-4 p-5 border-2 rounded-[1.5rem] cursor-pointer transition-all ${deleteType === 'transactions' ? 'border-warning bg-warning/10' : 'border-border bg-bg/50 hover:border-text-secondary/30'}`}
                >
                  <input
                    type='radio'
                    name='deleteType'
                    checked={deleteType === 'transactions'}
                    onChange={() => setDeleteType('transactions')}
                    className='mt-1 w-5 h-5 accent-orange-500'
                  />
                  <div className='w-full'>
                    <div
                      className={`font-black text-[15px] md:text-lg mb-1 ${deleteType === 'transactions' ? 'text-warning' : 'text-text-primary'}`}
                    >
                      Hanya Hapus Transaksi
                    </div>
                    <div className='text-xs md:text-sm font-medium text-text-secondary leading-relaxed mb-4'>
                      Saldo dompet aman, hanya history riwayat yang dibersihkan.
                    </div>

                    <AnimatePresence>
                      {deleteType === 'transactions' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className='overflow-hidden'
                        >
                          <div className='bg-surface rounded-xl border border-border p-4'>
                            {/* CUSTOM TOGGLE SELECT BUKAN HTML SELECT */}
                            <div className='relative flex bg-bg p-1.5 rounded-[1rem] border border-border mb-4'>
                              {[
                                { id: 'all', label: 'Semua Waktu' },
                                { id: 'month', label: 'Bulan Tertentu' },
                              ].map((option) => (
                                <button
                                  key={option.id}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setDeleteRange(option.id);
                                  }}
                                  className={`relative flex-1 py-2 text-xs md:text-sm font-bold rounded-lg z-10 transition-colors ${deleteRange === option.id ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                                >
                                  {option.label}
                                  {deleteRange === option.id && (
                                    <motion.div
                                      layoutId='active-delete-range'
                                      className='absolute inset-0 bg-surface rounded-lg -z-10 shadow-sm border border-border'
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

                            {/* INPUT MONTH */}
                            <AnimatePresence>
                              {deleteRange === 'month' && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                >
                                  <input
                                    type='month'
                                    value={deleteMonth}
                                    onChange={(e) =>
                                      setDeleteMonth(e.target.value)
                                    }
                                    className='w-full bg-bg border border-border p-3 rounded-lg outline-none text-text-primary font-bold md:text-base'
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </label>
              </div>

              <button
                onClick={handleExecuteDelete}
                className='w-full py-4 md:py-5 bg-expense text-white font-black text-[15px] md:text-lg rounded-[1.5rem] shadow-lg hover:opacity-90 transition-all active:scale-95'
              >
                Eksekusi Penghapusan
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
