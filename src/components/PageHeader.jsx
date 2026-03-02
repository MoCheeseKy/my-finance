'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

/**
 * Reusable page header with a back button and title.
 * Optionally accepts a right-side action button.
 *
 * @param {string} title - Page title text.
 * @param {React.ReactNode} rightAction - Optional element on the right side.
 * @param {string} className - Extra classes for the header element.
 */
export default function PageHeader({ title, rightAction, className = '' }) {
  const router = useRouter();

  return (
    <header
      className={`flex items-center justify-between mb-8 pt-2 ${className}`}
    >
      <div className='flex items-center gap-4'>
        <button
          onClick={() => router.back()}
          className='w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-stone-200 hover:bg-stone-50 transition-colors'
          aria-label='Kembali'
        >
          <ArrowLeft className='w-5 h-5 text-stone-800' />
        </button>
        <h1 className='text-xl font-black text-stone-800'>{title}</h1>
      </div>
      {rightAction && <div>{rightAction}</div>}
    </header>
  );
}
