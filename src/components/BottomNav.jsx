'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, PieChart, Plus, CreditCard, MessageSquare } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // HANYA MUNCUL DI HALAMAN INDEX (/)
  if (pathname !== '/') return null;

  return (
    <nav className='fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-stone-100 px-6 py-4 flex justify-between items-center z-50'>
      <button
        onClick={() => router.push('/')}
        className={`flex flex-col items-center gap-1 transition-transform hover:-translate-y-1 ${pathname === '/' ? 'text-stone-800' : 'text-stone-400'}`}
      >
        <Home className='w-6 h-6' />
      </button>
      <button className='text-stone-400 hover:text-stone-800 flex flex-col items-center gap-1 transition-transform hover:-translate-y-1'>
        <PieChart className='w-6 h-6' />
      </button>

      {/* Center FAB */}
      <div className='relative -top-8'>
        <button
          onClick={() => router.push('/add')}
          className='w-14 h-14 bg-stone-800 text-white rounded-full flex items-center justify-center shadow-[0_8px_20px_rgb(0,0,0,0.2)] hover:scale-105 active:scale-95 transition-all ring-4 ring-[#FAFAF9]'
        >
          <Plus className='w-6 h-6' />
        </button>
      </div>

      <button
        onClick={() => router.push('/accounts')}
        className='text-stone-400 hover:text-stone-800 flex flex-col items-center gap-1 transition-transform hover:-translate-y-1'
      >
        <CreditCard className='w-6 h-6' />
      </button>
      <button className='text-stone-400 hover:text-stone-800 flex flex-col items-center gap-1 transition-transform hover:-translate-y-1 relative'>
        <MessageSquare className='w-6 h-6' />
        <span className='absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full border-2 border-white animate-pulse'></span>
      </button>
    </nav>
  );
}
