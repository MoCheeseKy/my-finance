'use client';

import { CheckCircle2, AlertTriangle } from 'lucide-react';

/**
 * Toast — floating feedback notification pill.
 * Appears at the top-center of the screen.
 *
 * @param {'success'|'error'} type   - Controls color and icon
 * @param {string}            text   - Message to display
 */
export default function Toast({ type, text }) {
  if (!text) return null;

  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-2.5 animate-in slide-in-from-top-10 font-bold text-sm backdrop-blur-md pointer-events-none ${
        type === 'success'
          ? 'bg-stone-800/95 text-white'
          : 'bg-red-500/95 text-white'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle2 className='w-5 h-5 text-green-400 flex-shrink-0' />
      ) : (
        <AlertTriangle className='w-5 h-5 text-white flex-shrink-0' />
      )}
      {text}
    </div>
  );
}
