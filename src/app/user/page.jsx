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
        className={`w-full flex items-center justify-between p-4 bg-surface hover:bg-surface-hover transition-colors text-left ${!isLast ? 'border-b border-border' : ''}`}
      >
        <div className='flex items-center gap-4'>
          <div
            className={`w-10 h-10 rounded-[0.85rem] flex items-center justify-center ${bg}`}
          >
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <span className='font-bold text-[15px] text-text-primary'>
            {title}
          </span>
        </div>
        <ChevronRight className='w-5 h-5 text-text-secondary' />
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
    <main className='min-h-screen bg-bg p-6 max-w-md mx-auto pb-24 relative overflow-x-hidden transition-colors duration-300 font-sans'>
      {/* HEADER */}
      <header className='flex items-center justify-between mb-8 pt-2'>
        <div className='flex items-center gap-4'>
          <button
            onClick={() => router.back()}
            className='w-11 h-11 bg-surface rounded-full flex items-center justify-center shadow-[0_2px_8px_rgb(0,0,0,0.04)] dark:shadow-none border border-border hover:bg-bg-hover transition-colors'
          >
            <ArrowLeft className='w-5 h-5 text-text-primary' />
          </button>
          <h1 className='text-xl font-black text-text-primary tracking-tight'>
            Profil Anda
          </h1>
        </div>
        <button
          onClick={handleThemeToggle}
          className='w-11 h-11 bg-surface rounded-full flex items-center justify-center shadow-[0_2px_8px_rgb(0,0,0,0.04)] dark:shadow-none border border-border transition-colors'
        >
          {theme === 'light' ? (
            <Moon className='w-5 h-5 text-text-secondary' />
          ) : (
            <Sun className='w-5 h-5 text-warning' />
          )}
        </button>
      </header>

      {/* FEEDBACK TOAST */}
      {message.text && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-2.5 animate-in slide-in-from-top-10 font-bold text-sm backdrop-blur-md ${message.type === 'success' ? 'bg-stone-800/95 text-white' : 'bg-red-500/95 text-white'}`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className='w-5 h-5 text-green-400' />
          ) : (
            <AlertTriangle className='w-5 h-5 text-white' />
          )}
          {message.text}
        </div>
      )}

      {/* SECTION 1: PROFIL CARD MODERN */}
      <section className='bg-surface p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-border mb-8 transition-colors relative overflow-hidden'>
        {/* Dekorasi Gradient Bias */}
        <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full blur-3xl -mr-10 -mt-10 opacity-60'></div>

        <div className='flex items-start justify-between mb-5 relative z-10'>
          <div className='w-20 h-20 bg-gradient-to-tr from-investment to-primary rounded-full p-1 shadow-md'>
            <div className='w-full h-full bg-surface rounded-full flex items-center justify-center border-2 border-surface'>
              <User className='w-8 h-8 text-investment' />
            </div>
          </div>
          <button
            onClick={() =>
              isEditing ? handleSaveProfile() : setIsEditing(true)
            }
            className={`px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${isEditing ? 'bg-primary text-text-primary hover:bg-primary-hover' : 'bg-bg-hover text-text-primary hover:bg-surface'}`}
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
            <div className='bg-surface/50 rounded-2xl p-3.5 border border-border focus-within:border-primary transition-colors'>
              <label className='text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-1'>
                Nama Panggilan
              </label>
              <input
                type='text'
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
                className='w-full bg-transparent outline-none font-bold text-text-primary text-lg'
              />
            </div>
            <div className='bg-surface/50 rounded-2xl p-3.5 border border-border focus-within:border-primary transition-colors'>
              <label className='text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-1'>
                Target / Bio
              </label>
              <textarea
                value={profile.bio}
                onChange={(e) =>
                  setProfile({ ...profile, bio: e.target.value })
                }
                rows='2'
                className='w-full bg-transparent outline-none font-medium text-text-secondary resize-none'
              />
            </div>
          </div>
        ) : (
          <div className='relative z-10 mt-2'>
            <h2 className='text-2xl font-black text-text-primary mb-1.5 tracking-tight'>
              {profile.name}
            </h2>
            <p className='text-text-secondary text-sm font-medium leading-relaxed'>
              {profile.bio}
            </p>
          </div>
        )}
      </section>

      {/* SECTION 2: DATA & PENYIMPANAN */}
      <h3 className='text-xs font-black text-text-secondary uppercase tracking-widest px-3 mb-3 flex items-center gap-2'>
        <Database className='w-3.5 h-3.5' /> Manajemen Data
      </h3>
      <section className='bg-surface rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-border mb-8 overflow-hidden flex divide-x divide-border'>
        <button
          onClick={handleExportData}
          className='flex-1 p-6 flex flex-col items-center justify-center gap-3 hover:bg-surface-hover transition-all group'
        >
          <div className='w-14 h-14 bg-investment/10 rounded-2xl flex items-center justify-center group-hover:-translate-y-1 transition-transform duration-300'>
            <Download className='w-6 h-6 text-investment' />
          </div>
          <span className='font-bold text-sm text-text-primary'>
            Backup Data
          </span>
        </button>
        <label className='flex-1 p-6 flex flex-col items-center justify-center gap-3 hover:bg-surface-hover transition-all cursor-pointer group'>
          <div className='w-14 h-14 bg-income/10 rounded-2xl flex items-center justify-center group-hover:-translate-y-1 transition-transform duration-300'>
            <Upload className='w-6 h-6 text-income' />
          </div>
          <span className='font-bold text-sm text-text-primary'>
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
      <h3 className='text-xs font-black text-text-secondary uppercase tracking-widest px-3 mb-3 flex items-center gap-2'>
        <Settings className='w-3.5 h-3.5' /> Preferensi & Bantuan
      </h3>
      <section className='bg-surface rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-border overflow-hidden mb-10'>
        <MenuLink
          onClick={() => setActiveMenuModal('about')}
          icon={Info}
          title='Tentang Aplikasi'
          bg='bg-primary/5'
          color='text-primary'
        />
        <MenuLink
          onClick={() => setActiveMenuModal('privacy')}
          icon={Shield}
          title='Kebijakan Privasi'
          bg='bg-bg-hover'
          color='text-text-secondary'
        />
        <MenuLink
          onClick={() => setActiveMenuModal('faq')}
          icon={HelpCircle}
          title='Bantuan & FAQ'
          bg='bg-primary/5'
          color='text-primary'
        />
        <MenuLink
          href='https://forms.gle/YOUR_FORM_LINK'
          icon={MessageSquare}
          title='Kirim Feedback'
          bg='bg-primary/5'
          color='text-primary'
        />
        <MenuLink
          onClick={() => setActiveMenuModal('developer')}
          icon={Code}
          title='Pengembang Aplikasi'
          bg='bg-primary'
          color='text-text-primary'
        />
        <MenuLink
          onClick={() => setActiveMenuModal('coffee')}
          icon={Coffee}
          title='Traktir Kopi ☕'
          bg='bg-income/5'
          color='text-income'
          isLast={true}
        />
      </section>

      {/* DANGER ZONE */}
      <button
        onClick={() => setIsDeleteModalOpen(true)}
        className='w-full bg-surface p-5 rounded-3xl border border-expense/30 shadow-sm flex items-center justify-center gap-3 hover:bg-surface-hover transition-all group'
      >
        <Trash2 className='w-5 h-5 text-expense group-hover:scale-110 transition-transform' />
        <span className='font-bold text-expense text-[15px]'>
          Hapus Data Aplikasi
        </span>
      </button>

      <div className='text-center mt-10'>
        <p className='text-text-secondary text-[10px] font-black uppercase tracking-widest'>
          Catat Dulu Ygy • v1.0.0
        </p>
      </div>

      {/* --- MODAL MULTIGUNA UNTUK MENU (DRAWER DI MOBILE, POPUP DI PC) --- */}
      {activeMenuModal && (
        <div
          className='fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in'
          onClick={() => setActiveMenuModal(null)}
        >
          <div
            className='bg-bg w-full max-w-md max-h-[85vh] flex flex-col rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 overflow-hidden border border-border'
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className='p-6 pb-4 border-b border-border flex justify-between items-center bg-transparent backdrop-blur-md'>
              <h3 className='font-black text-xl text-text-primary capitalize tracking-tight'>
                {activeMenuModal === 'about' && 'Tentang Aplikasi'}
                {activeMenuModal === 'privacy' && 'Kebijakan Privasi'}
                {activeMenuModal === 'faq' && 'Bantuan & FAQ'}
                {activeMenuModal === 'developer' && 'Pengembang'}
                {activeMenuModal === 'coffee' && 'Dukung Kami'}
              </h3>
              <button
                onClick={() => setActiveMenuModal(null)}
                className='p-2.5 bg-surface rounded-full hover:bg-surface-hover transition-colors'
              >
                <X className='w-5 h-5 text-text-primary' />
              </button>
            </div>

            {/* Modal Body */}
            <div className='p-6 overflow-y-auto'>
              {/* KONTEN: TENTANG APLIKASI */}
              {activeMenuModal === 'about' && (
                <div className='space-y-4 text-text-secondary text-[15px] leading-relaxed'>
                  <div className='w-20 h-20 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center mb-5 shadow-lg shadow-primary/5'>
                    <Database className='w-10 h-10 text-primary' />
                  </div>
                  <h4 className='font-black text-center text-xl text-text-primary'>
                    Catat Dulu Ygy
                  </h4>
                  <p className='text-center text-text-secondary/70 text-xs font-bold tracking-widest uppercase mb-6'>
                    Versi 1.0.0 (Local Build)
                  </p>
                  <div className='bg-bg p-5 rounded-3xl space-y-3'>
                    <p>
                      Aplikasi super ringan untuk menyederhanakan cara mahasiswa
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
                <div className='space-y-6 text-text-secondary text-sm leading-relaxed'>
                  <div className='bg-bg p-5 rounded-3xl'>
                    <h4 className='font-black text-text-primary mb-2 text-base flex items-center gap-2'>
                      <Database className='w-4 h-4 text-blue-500' /> Penyimpanan
                      Lokal
                    </h4>
                    <p>
                      Catatan keuanganmu{' '}
                      <strong>hanya tersimpan di browser perangkatmu</strong>.
                      Kami tidak mengumpulkan atau memiliki akses ke data
                      tersebut.
                    </p>
                  </div>
                  <div className='bg-bg p-5 rounded-3xl'>
                    <h4 className='font-black text-text-primary mb-2 text-base flex items-center gap-2'>
                      <Code className='w-4 h-4 text-purple-500' /> Fitur AI
                      Scanner
                    </h4>
                    <p>
                      Gambar bon / mutasi dikirim sementara ke API Google Gemini
                      murni untuk diekstrak teksnya dan tidak disimpan permanen
                      di server kami.
                    </p>
                  </div>
                  <div className='bg-bg p-5 rounded-3xl'>
                    <h4 className='font-black text-text-primary mb-2 text-base flex items-center gap-2'>
                      <Shield className='w-4 h-4 text-emerald-500' /> Tanggung
                      Jawab
                    </h4>
                    <p>
                      Pastikan kamu rajin menggunakan fitur{' '}
                      <strong>Backup Data</strong>. Membersihkan *cache* browser
                      akan menghapus data di aplikasi ini.
                    </p>
                  </div>
                </div>
              )}

              {/* KONTEN: PENGEMBANG (Premium UI) */}
              {activeMenuModal === 'developer' && (
                <div className='text-center'>
                  <div className='relative inline-block mb-4'>
                    <div className='absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full blur-md opacity-50'></div>
                    <div className='w-32 h-32 relative overflow-hidden rounded-full border-4 border-bg shadow-xl bg-bg-hover z-10'>
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

                  <h4 className='font-black text-2xl text-text-primary mb-1 tracking-tight'>
                    Nama Kamu
                  </h4>
                  <div className='inline-flex items-center gap-1.5 bg-primary/5 text-primary px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-6 border border-primary/20'>
                    S1 Rekayasa Perangkat Lunak
                  </div>

                  <p className='text-sm text-text-secondary leading-relaxed bg-bg p-5 rounded-3xl mb-6'>
                    Membangun aplikasi ini sepenuh hati buat bantu nyelesain
                    masalah anak kosan. Kalau nemu bug atau punya ide fitur
                    gila, sapa aku aja!
                  </p>

                  <div className='flex justify-center gap-4'>
                    <a
                      href='#'
                      className='w-12 h-12 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                    >
                      <Github className='w-5 h-5' />
                    </a>
                    <a
                      href='#'
                      className='w-12 h-12 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                    >
                      <Instagram className='w-5 h-5' />
                    </a>
                  </div>
                </div>
              )}

              {/* KONTEN: TRAKTIR KOPI (Premium UI) */}
              {activeMenuModal === 'coffee' && (
                <div className='text-center'>
                  <h4 className='font-black text-2xl text-text-primary mb-3 tracking-tight'>
                    Support Server... eh Perut! ☕
                  </h4>
                  <p className='text-sm text-text-secondary mb-8 leading-relaxed px-2'>
                    Walau app ini gratis & jalan lokal, ngodingnya tetep butuh
                    kalori. Scan QRIS di bawah buat support jajan developer! 🚀
                  </p>

                  <div className='bg-white p-5 rounded-[2.5rem] shadow-xl inline-block mb-8 border-[6px] border-bg-hover'>
                    <img
                      src='/qris-donasi.jpeg'
                      alt='QRIS Donasi'
                      className='w-56 h-auto rounded-2xl mx-auto'
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML =
                          '<div class="w-56 h-56 flex items-center justify-center text-sm font-bold text-text-secondary text-center">Gambar qris-donasi.jpeg<br/>belum ada di folder public</div>';
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
            </div>
          </div>
        </div>
      )}

      {/* MODAL HAPUS DATA DINAMIS */}
      {isDeleteModalOpen && (
        <div className='fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in'>
          <div className='bg-bg w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 border border-border'>
            <div className='flex justify-between items-center mb-6'>
              <h3 className='font-black text-xl text-text-primary flex items-center gap-2'>
                <AlertTriangle className='w-6 h-6 text-expense' /> Hapus Data
              </h3>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className='w-10 h-10 bg-surface rounded-full flex items-center justify-center text-text-secondary'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='space-y-4 mb-8'>
              <label
                className={`flex items-start gap-4 p-5 border-2 rounded-3xl cursor-pointer transition-all ${deleteType === 'all' ? 'border-expense bg-expense/10' : 'border-border bg-surface/50'}`}
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
                    className={`font-black text-[15px] mb-1 ${deleteType === 'all' ? 'text-expense' : 'text-text-primary'}`}
                  >
                    Hapus Data Keseluruhan
                  </div>
                  <div className='text-sm text-text-secondary leading-relaxed'>
                    Semua dompet, profil, dan history akan hilang selamanya.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-4 p-5 border-2 rounded-3xl cursor-pointer transition-all ${deleteType === 'transactions' ? 'border-warning bg-warning/10' : 'border-border bg-surface/50'}`}
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
                    className={`font-black text-[15px] mb-1 ${deleteType === 'transactions' ? 'text-warning' : 'text-text-primary'}`}
                  >
                    Hapus Data Transaksi Saja
                  </div>
                  <div className='text-sm text-text-secondary leading-relaxed mb-4'>
                    Saldo dompet aman, hanya history riwayat yang dibersihkan.
                  </div>

                  {deleteType === 'transactions' && (
                    <div className='bg-bg rounded-2xl border border-border p-3 text-sm'>
                      <select
                        value={deleteRange}
                        onChange={(e) => setDeleteRange(e.target.value)}
                        className='w-full bg-transparent outline-none font-bold text-text-primary mb-2 py-1 cursor-pointer'
                      >
                        <option value='all'>Bersihkan Semua Waktu</option>
                        <option value='month'>Pilih Bulan Tertentu</option>
                      </select>

                      {deleteRange === 'month' && (
                        <input
                          type='month'
                          value={deleteMonth}
                          onChange={(e) => setDeleteMonth(e.target.value)}
                          className='w-full bg-surface p-3 rounded-xl outline-none text-text-primary font-medium mt-2'
                        />
                      )}
                    </div>
                  )}
                </div>
              </label>
            </div>

            <button
              onClick={handleExecuteDelete}
              className='w-full py-4.5 bg-expense text-text-primary font-black text-[15px] rounded-2xl shadow-[0_8px_20px_rgb(220,38,38,0.25)] hover:opacity-90 transition-all active:scale-95'
            >
              Eksekusi Penghapusan
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
