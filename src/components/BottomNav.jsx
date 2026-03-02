'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, PieChart, Plus, CreditCard, MessageSquare } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // HANYA MUNCUL DI HALAMAN INDEX (/)
  if (pathname !== '/') return null;

  return (
    <nav className='fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] bg-white/90 backdrop-blur-xl rounded-full shadow-[0_8px_30px_rgb(255,182,193,0.3)] border-2 border-pastel-pink/50 px-6 py-4 flex justify-between items-center z-50'>
      <button
        onClick={() => router.push('/')}
        className={`flex flex-col items-center gap-1 transition-all hover:-translate-y-2 ${pathname === '/' ? 'text-pink-500 scale-110 drop-shadow-md' : 'text-text-muted hover:text-pink-400'}`}
      >
        <Home className='w-6 h-6' />
      </button>
      <button className='text-text-muted hover:text-purple-400 flex flex-col items-center gap-1 transition-all hover:-translate-y-2'>
        <PieChart className='w-6 h-6' />
      </button>

      {/* Center FAB */}
      <div className='relative -top-8'>
        <button
          onClick={() => router.push('/add')}
          className='w-16 h-16 bg-gradient-to-tr from-pink-400 to-purple-400 text-white rounded-full flex items-center justify-center shadow-[0_8px_20px_rgb(255,182,193,0.6)] hover:scale-110 hover:rotate-90 active:scale-95 transition-all ring-4 ring-white'
        >
          <Plus className='w-8 h-8' />
        </button>
      </div>

      <button
        onClick={() => router.push('/balance-accounts')}
        className='text-text-muted hover:text-blue-400 flex flex-col items-center gap-1 transition-all hover:-translate-y-2'
      >
        <CreditCard className='w-6 h-6' />
      </button>
      <button className='text-text-muted hover:text-green-400 flex flex-col items-center gap-1 transition-all hover:-translate-y-2 relative'>
        <MessageSquare className='w-6 h-6' />
        <span className='absolute -top-1 -right-1 w-3.5 h-3.5 bg-pastel-pink rounded-full border-2 border-white animate-bounce shadow-sm'></span>
      </button>
    </nav>
  );
}
