'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/storage';
import DarkDrawer from '@/components/DarkDrawer';
import Toast from '@/components/Toast';
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

export default function UserPage() {
  const router = useRouter();

  // State Profile & Theme
  const [isEditing, setIsEditing] = useState(false);
  const [theme, setTheme] = useState('light');
  const [profile, setProfile] = useState({
    name: 'Anak RPL',
    bio: 'Lagi nabung buat trip DINACOM ke Semarang 🚀',
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
    showMessage('success', 'Profil berhasil diperbarui! ✨');
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
      showMessage('success', 'Data berhasil di-backup! 💾');
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
      showMessage('success', 'Semua data berhasil dihapus 🧹');
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
      showMessage('success', 'Data transaksi berhasil dihapus! ✨');
      setIsDeleteModalOpen(false);
    }
  };

  // Komponen Menu Link yang lebih estetik
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
        className={`w-full flex items-center justify-between p-4 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors text-left ${!isLast ? 'border-b border-stone-100 dark:border-stone-700/50' : ''}`}
      >
        <div className='flex items-center gap-4'>
          <div
            className={`w-10 h-10 rounded-[0.85rem] flex items-center justify-center ${bg}`}
          >
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <span className='font-bold text-[15px] text-stone-700 dark:text-stone-200'>
            {title}
          </span>
        </div>
        <ChevronRight className='w-5 h-5 text-stone-300 dark:text-stone-500' />
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
    <main className='min-h-screen bg-[#F4F4F5] dark:bg-[#121212] p-6 max-w-md mx-auto pb-24 relative overflow-x-hidden transition-colors duration-300 font-sans'>
      {/* HEADER */}
      <header className='flex items-center justify-between mb-8 pt-2'>
        <div className='flex items-center gap-4'>
          <button
            onClick={() => router.back()}
            className='w-11 h-11 bg-white dark:bg-stone-800 rounded-full flex items-center justify-center shadow-[0_2px_8px_rgb(0,0,0,0.04)] dark:shadow-none border border-stone-100 dark:border-stone-700 hover:bg-stone-50 transition-colors'
          >
            <ArrowLeft className='w-5 h-5 text-stone-700 dark:text-stone-200' />
          </button>
          <h1 className='text-xl font-black text-stone-800 dark:text-stone-100 tracking-tight'>
            Profil Anda
          </h1>
        </div>
        <button
          onClick={handleThemeToggle}
          className='w-11 h-11 bg-white dark:bg-stone-800 rounded-full flex items-center justify-center shadow-[0_2px_8px_rgb(0,0,0,0.04)] dark:shadow-none border border-stone-100 dark:border-stone-700 transition-colors'
        >
          {theme === 'light' ? (
            <Moon className='w-5 h-5 text-stone-600' />
          ) : (
            <Sun className='w-5 h-5 text-amber-400' />
          )}
        </button>
      </header>

      <Toast type={message.type} text={message.text} />

      {/* SECTION 1: PROFIL CARD MODERN */}
      <section className='bg-white dark:bg-stone-800 p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-stone-100 dark:border-stone-700 mb-8 transition-colors relative overflow-hidden'>
        {/* Dekorasi Gradient Bias */}
        <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full blur-3xl -mr-10 -mt-10 opacity-60'></div>

        <div className='flex items-start justify-between mb-5 relative z-10'>
          <div className='w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full p-1 shadow-md'>
            <div className='w-full h-full bg-white dark:bg-stone-800 rounded-full flex items-center justify-center border-2 border-white dark:border-stone-800'>
              <User className='w-8 h-8 text-indigo-500 dark:text-indigo-400' />
            </div>
          </div>
          <button
            onClick={() =>
              isEditing ? handleSaveProfile() : setIsEditing(true)
            }
            className={`px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${isEditing ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-200'}`}
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
          <div className='space-y-4 relative z-10'>
            <div className='bg-stone-50 dark:bg-stone-900/50 rounded-2xl p-3.5 border border-stone-200 dark:border-stone-700 focus-within:border-indigo-500 transition-colors'>
              <label className='text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1'>
                Nama Panggilan
              </label>
              <input
                type='text'
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
                className='w-full bg-transparent outline-none font-bold text-stone-800 dark:text-white text-lg'
              />
            </div>
            <div className='bg-stone-50 dark:bg-stone-900/50 rounded-2xl p-3.5 border border-stone-200 dark:border-stone-700 focus-within:border-indigo-500 transition-colors'>
              <label className='text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1'>
                Target / Bio
              </label>
              <textarea
                value={profile.bio}
                onChange={(e) =>
                  setProfile({ ...profile, bio: e.target.value })
                }
                rows='2'
                className='w-full bg-transparent outline-none font-medium text-stone-600 dark:text-stone-300 resize-none'
              />
            </div>
          </div>
        ) : (
          <div className='relative z-10 mt-2'>
            <h2 className='text-2xl font-black text-stone-800 dark:text-white mb-1.5 tracking-tight'>
              {profile.name}
            </h2>
            <p className='text-stone-500 dark:text-stone-400 text-sm font-medium leading-relaxed'>
              {profile.bio}
            </p>
          </div>
        )}
      </section>

      {/* SECTION 2: DATA & PENYIMPANAN */}
      <h3 className='text-xs font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest px-3 mb-3 flex items-center gap-2'>
        <Database className='w-3.5 h-3.5' /> Manajemen Data
      </h3>
      <section className='bg-white dark:bg-stone-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-stone-100 dark:border-stone-700 mb-8 overflow-hidden flex divide-x divide-stone-100 dark:divide-stone-700'>
        <button
          onClick={handleExportData}
          className='flex-1 p-6 flex flex-col items-center justify-center gap-3 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-all group'
        >
          <div className='w-14 h-14 bg-sky-50 dark:bg-sky-500/10 rounded-2xl flex items-center justify-center group-hover:-translate-y-1 transition-transform duration-300'>
            <Download className='w-6 h-6 text-sky-600 dark:text-sky-400' />
          </div>
          <span className='font-bold text-sm text-stone-700 dark:text-stone-200'>
            Backup Data
          </span>
        </button>
        <label className='flex-1 p-6 flex flex-col items-center justify-center gap-3 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-all cursor-pointer group'>
          <div className='w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:-translate-y-1 transition-transform duration-300'>
            <Upload className='w-6 h-6 text-emerald-600 dark:text-emerald-400' />
          </div>
          <span className='font-bold text-sm text-stone-700 dark:text-stone-200'>
            Import Data
          </span>
          <input
            type='file'
            accept='.json'
            className='hidden'
            onChange={handleImportData}
          />
        </label>
      </section>

      {/* SECTION 3: MENU EKSTRA */}
      <h3 className='text-xs font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest px-3 mb-3 flex items-center gap-2'>
        <Settings className='w-3.5 h-3.5' /> Preferensi & Bantuan
      </h3>
      <section className='bg-white dark:bg-stone-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-stone-100 dark:border-stone-700 overflow-hidden mb-10'>
        <MenuLink
          onClick={() => setActiveMenuModal('about')}
          icon={Info}
          title='Tentang Aplikasi'
          bg='bg-blue-50 dark:bg-blue-500/10'
          color='text-blue-600 dark:text-blue-400'
        />
        <MenuLink
          onClick={() => setActiveMenuModal('privacy')}
          icon={Shield}
          title='Kebijakan Privasi'
          bg='bg-stone-100 dark:bg-stone-700'
          color='text-stone-600 dark:text-stone-300'
        />
        <MenuLink
          onClick={() => setActiveMenuModal('faq')}
          icon={HelpCircle}
          title='Bantuan & FAQ'
          bg='bg-indigo-50 dark:bg-indigo-500/10'
          color='text-indigo-600 dark:text-indigo-400'
        />
        <MenuLink
          href='https://forms.gle/YOUR_FORM_LINK'
          icon={MessageSquare}
          title='Kirim Feedback'
          bg='bg-purple-50 dark:bg-purple-500/10'
          color='text-purple-600 dark:text-purple-400'
        />
        <MenuLink
          onClick={() => setActiveMenuModal('developer')}
          icon={Code}
          title='Pengembang Aplikasi'
          bg='bg-stone-800 dark:bg-stone-700'
          color='text-white dark:text-stone-200'
        />
        <MenuLink
          onClick={() => setActiveMenuModal('coffee')}
          icon={Coffee}
          title='Traktir Kopi ☕'
          bg='bg-amber-50 dark:bg-amber-500/10'
          color='text-amber-600 dark:text-amber-400'
          isLast={true}
        />
      </section>

      {/* DANGER ZONE */}
      <button
        onClick={() => setIsDeleteModalOpen(true)}
        className='w-full bg-white dark:bg-stone-800 p-5 rounded-3xl border border-red-100 dark:border-red-900/30 shadow-sm flex items-center justify-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group'
      >
        <Trash2 className='w-5 h-5 text-red-500 dark:text-red-400 group-hover:scale-110 transition-transform' />
        <span className='font-bold text-red-500 dark:text-red-400 text-[15px]'>
          Hapus Data Aplikasi
        </span>
      </button>

      <div className='text-center mt-10'>
        <p className='text-stone-400 dark:text-stone-600 text-[10px] font-black uppercase tracking-widest'>
          Catat Dulu Ygy • v1.0.0
        </p>
      </div>

      <DarkDrawer
        isOpen={!!activeMenuModal}
        onClose={() => setActiveMenuModal(null)}
        title={
          activeMenuModal === 'about'
            ? 'Tentang Aplikasi'
            : activeMenuModal === 'privacy'
              ? 'Kebijakan Privasi'
              : activeMenuModal === 'faq'
                ? 'Bantuan & FAQ'
                : activeMenuModal === 'developer'
                  ? 'Pengembang'
                  : activeMenuModal === 'coffee'
                    ? 'Dukung Kami'
                    : ''
        }
      >
        {/* KONTEN: TENTANG APLIKASI */}
        {activeMenuModal === 'about' && (
          <div className='space-y-4 text-stone-600 dark:text-stone-300 text-[15px] leading-relaxed'>
            <div className='w-20 h-20 bg-stone-800 dark:bg-stone-700 rounded-3xl mx-auto flex items-center justify-center mb-5 shadow-lg shadow-stone-800/20'>
              <Database className='w-10 h-10 text-white' />
            </div>
            <h4 className='font-black text-center text-xl text-stone-800 dark:text-white'>
              Catat Dulu Ygy
            </h4>
            <p className='text-center text-stone-400 text-xs font-bold tracking-widest uppercase mb-6'>
              Versi 1.0.0 (Local Build)
            </p>
            <div className='bg-stone-50 dark:bg-stone-800/50 p-5 rounded-3xl space-y-3'>
              <p>
                Aplikasi super ringan untuk menyederhanakan cara mahasiswa
                melacak pengeluarannya.
              </p>
              <p>
                Berjalan sepenuhnya di browser dengan teknologi{' '}
                <strong>Local Storage</strong>. Data aman di HP kamu, tanpa
                server, tanpa lemot.
              </p>
            </div>
            <p className='text-center mt-6 flex items-center justify-center gap-1.5 font-bold text-stone-500'>
              Dibuat dengan{' '}
              <Heart className='w-4 h-4 text-red-500 fill-red-500' /> & Kopi.
            </p>
          </div>
        )}

        {/* KONTEN: KEBIJAKAN PRIVASI */}
        {activeMenuModal === 'privacy' && (
          <div className='space-y-6 text-stone-600 dark:text-stone-300 text-sm leading-relaxed'>
            <div className='bg-stone-50 dark:bg-stone-800/50 p-5 rounded-3xl'>
              <h4 className='font-black text-stone-800 dark:text-white mb-2 text-base flex items-center gap-2'>
                <Database className='w-4 h-4 text-blue-500' /> Penyimpanan Lokal
              </h4>
              <p>
                Catatan keuanganmu{' '}
                <strong>hanya tersimpan di browser perangkatmu</strong>. Kami
                tidak mengumpulkan atau memiliki akses ke data tersebut.
              </p>
            </div>
            <div className='bg-stone-50 dark:bg-stone-800/50 p-5 rounded-3xl'>
              <h4 className='font-black text-stone-800 dark:text-white mb-2 text-base flex items-center gap-2'>
                <Code className='w-4 h-4 text-purple-500' /> Fitur AI Scanner
              </h4>
              <p>
                Gambar bon / mutasi dikirim sementara ke API Google Gemini murni
                untuk diekstrak teksnya dan tidak disimpan permanen di server
                kami.
              </p>
            </div>
            <div className='bg-stone-50 dark:bg-stone-800/50 p-5 rounded-3xl'>
              <h4 className='font-black text-stone-800 dark:text-white mb-2 text-base flex items-center gap-2'>
                <Shield className='w-4 h-4 text-emerald-500' /> Tanggung Jawab
              </h4>
              <p>
                Pastikan kamu rajin menggunakan fitur{' '}
                <strong>Backup Data</strong>. Membersihkan cache browser akan
                menghapus data di aplikasi ini.
              </p>
            </div>
          </div>
        )}

        {/* KONTEN: PENGEMBANG */}
        {activeMenuModal === 'developer' && (
          <div className='text-center'>
            <div className='relative inline-block mb-4'>
              <div className='absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full blur-md opacity-50'></div>
              <div className='w-32 h-32 relative overflow-hidden rounded-full border-4 border-white dark:border-stone-800 shadow-xl bg-stone-100 z-10'>
                <img
                  src='/developer-profile.png'
                  alt='Developer'
                  className='w-full h-full object-cover'
                  onError={(e) => {
                    e.target.src =
                      'https://ui-avatars.com/api/?name=Anak+RPL&background=4f46e5&color=fff&size=256';
                  }}
                />
              </div>
            </div>
            <h4 className='font-black text-2xl text-stone-800 dark:text-white mb-1 tracking-tight'>
              Nama Kamu
            </h4>
            <div className='inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-6 border border-blue-100 dark:border-blue-900/50'>
              S1 Rekayasa Perangkat Lunak
            </div>
            <p className='text-sm text-stone-600 dark:text-stone-300 leading-relaxed bg-stone-50 dark:bg-stone-800/50 p-5 rounded-3xl mb-6'>
              Membangun aplikasi ini sepenuh hati buat bantu nyelesain masalah
              anak kosan. Kalau nemu bug atau punya ide fitur gila, sapa aku
              aja!
            </p>
            <div className='flex justify-center gap-4'>
              <a
                href='#'
                className='w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors'
              >
                <Github className='w-5 h-5' />
              </a>
              <a
                href='#'
                className='w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors'
              >
                <Instagram className='w-5 h-5' />
              </a>
            </div>
          </div>
        )}

        {/* KONTEN: TRAKTIR KOPI */}
        {activeMenuModal === 'coffee' && (
          <div className='text-center'>
            <h4 className='font-black text-2xl text-stone-800 dark:text-white mb-3 tracking-tight'>
              Support Server... eh Perut! ☕
            </h4>
            <p className='text-sm text-stone-600 dark:text-stone-400 mb-8 leading-relaxed px-2'>
              Walau app ini gratis & jalan lokal, ngodingnya tetep butuh kalori.
              Scan QRIS di bawah buat support jajan developer! 🚀
            </p>
            <div className='bg-white dark:bg-white p-5 rounded-[2.5rem] shadow-xl inline-block mb-8 border-[6px] border-stone-50 dark:border-stone-800'>
              <img
                src='/qris-donasi.jpeg'
                alt='QRIS Donasi'
                className='w-56 h-auto rounded-2xl mx-auto'
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML =
                    '<div class="w-56 h-56 flex items-center justify-center text-sm font-bold text-stone-400 text-center">Gambar qris-donasi.jpeg<br/>belum ada di folder public</div>';
                }}
              />
            </div>
            <a
              href='https://trakteer.id/yourusername'
              target='_blank'
              rel='noreferrer'
              className='block w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl shadow-[0_8px_20px_rgb(245,158,11,0.3)] transition-all active:scale-95 text-[15px]'
            >
              Donasi via Trakteer
            </a>
          </div>
        )}
      </DarkDrawer>

      {/* MODAL HAPUS DATA */}
      <DarkDrawer
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title='Hapus Data'
        footer={
          <button
            onClick={handleExecuteDelete}
            className='w-full py-4 bg-red-600 text-white font-black text-[15px] rounded-2xl shadow-[0_8px_20px_rgb(220,38,38,0.25)] hover:bg-red-700 transition-all active:scale-95'
          >
            Eksekusi Penghapusan
          </button>
        }
      >
        <div className='space-y-4'>
          <label
            className={`flex items-start gap-4 p-5 border-2 rounded-3xl cursor-pointer transition-all ${deleteType === 'all' ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-800/50'}`}
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
                className={`font-black text-[15px] mb-1 ${deleteType === 'all' ? 'text-red-700 dark:text-red-400' : 'text-stone-700 dark:text-stone-200'}`}
              >
                Hapus Data Keseluruhan
              </div>
              <div className='text-sm text-stone-500 dark:text-stone-400 leading-relaxed'>
                Semua dompet, profil, dan history akan hilang selamanya.
              </div>
            </div>
          </label>

          <label
            className={`flex items-start gap-4 p-5 border-2 rounded-3xl cursor-pointer transition-all ${deleteType === 'transactions' ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-800/50'}`}
          >
            <input
              type='radio'
              name='deleteType'
              checked={deleteType === 'transactions'}
              onChange={() => setDeleteType('transactions')}
              className='mt-1 w-5 h-5 accent-orange-600'
            />
            <div className='w-full'>
              <div
                className={`font-black text-[15px] mb-1 ${deleteType === 'transactions' ? 'text-orange-700 dark:text-orange-400' : 'text-stone-700 dark:text-stone-200'}`}
              >
                Hapus Data Transaksi Saja
              </div>
              <div className='text-sm text-stone-500 dark:text-stone-400 leading-relaxed mb-4'>
                Saldo dompet aman, hanya history riwayat yang dibersihkan.
              </div>
              {deleteType === 'transactions' && (
                <div className='bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-3 text-sm'>
                  <select
                    value={deleteRange}
                    onChange={(e) => setDeleteRange(e.target.value)}
                    className='w-full bg-transparent outline-none font-bold text-stone-700 dark:text-stone-300 mb-2 py-1 cursor-pointer'
                  >
                    <option value='all'>Bersihkan Semua Waktu</option>
                    <option value='month'>Pilih Bulan Tertentu</option>
                  </select>
                  {deleteRange === 'month' && (
                    <input
                      type='month'
                      value={deleteMonth}
                      onChange={(e) => setDeleteMonth(e.target.value)}
                      className='w-full bg-stone-100 dark:bg-stone-800 p-3 rounded-xl outline-none text-stone-800 dark:text-white font-medium mt-2'
                    />
                  )}
                </div>
              )}
            </div>
          </label>
        </div>
      </DarkDrawer>
    </main>
  );
}
