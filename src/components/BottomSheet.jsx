'use client';

import { X } from 'lucide-react';

/**
 * Reusable bottom-sheet (drawer) overlay component.
 *
 * @param {boolean} isOpen - Controls visibility.
 * @param {() => void} onClose - Callback when the sheet is closed.
 * @param {string} title - Header title of the sheet.
 * @param {React.ReactNode} children - Content inside the sheet.
 * @param {string} className - Extra classes for the inner panel.
 */
export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) {
  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-end justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200'
      onClick={onClose}
    >
      <div
        className={`bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-10 duration-300 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex justify-between items-center mb-6 p-6 pb-0'>
          <h3 className='font-black text-xl text-stone-800'>{title}</h3>
          <button
            onClick={onClose}
            className='w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors'
            aria-label='Tutup'
          >
            <X className='w-5 h-5' />
          </button>
        </div>
        <div className='px-6 pb-8'>{children}</div>
      </div>
    </div>
  );
}
