'use client';

import { X } from 'lucide-react';

/**
 * DarkDrawer — premium dark-mode-aware modal/drawer.
 *
 * This is the richer variant of BottomSheet used on pages that support dark
 * mode (User, Investment). It:
 *  - Slides up from the bottom on mobile, centers on desktop (md:items-center)
 *  - Supports dark mode via Tailwind dark: classes
 *  - Supports scrollable body (max-h-[90vh])
 *  - Accepts optional footer slot for action buttons
 *
 * @param {boolean}         isOpen       - Controls visibility
 * @param {() => void}      onClose      - Called when backdrop or X is clicked
 * @param {string}          title        - Drawer header title
 * @param {React.ReactNode} children     - Scrollable body content
 * @param {React.ReactNode} footer       - Optional fixed footer (action buttons)
 * @param {React.ReactNode} headerRight  - Optional extra element next to X button
 */
export default function DarkDrawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  headerRight,
}) {
  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-stone-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in'
      onClick={onClose}
    >
      <div
        className='bg-white dark:bg-[#1A1A1A] w-full max-w-md max-h-[90vh] flex flex-col rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 overflow-hidden border border-stone-100 dark:border-stone-800'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='p-6 pb-4 border-b border-stone-100 dark:border-stone-800 flex justify-between items-center bg-white/50 dark:bg-transparent backdrop-blur-md flex-shrink-0'>
          <h3 className='font-black text-xl text-stone-800 dark:text-white tracking-tight'>
            {title}
          </h3>
          <div className='flex items-center gap-2'>
            {headerRight}
            <button
              onClick={onClose}
              className='p-2.5 bg-stone-100 dark:bg-stone-800 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors'
              aria-label='Tutup'
            >
              <X className='w-5 h-5 text-stone-600 dark:text-stone-300' />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className='p-6 overflow-y-auto flex-1 space-y-5'>{children}</div>

        {/* Optional Fixed Footer */}
        {footer && (
          <div className='p-6 pt-2 bg-white dark:bg-[#1A1A1A] border-t border-stone-100 dark:border-stone-800 flex-shrink-0'>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
