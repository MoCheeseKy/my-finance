'use client';

import { formatRupiah } from '@/lib/utils';
import { format } from 'date-fns';

/**
 * TransactionCard — shared card for displaying a single transaction row.
 * Used on the Dashboard (recent transactions) and Insight (history list).
 *
 * @param {object}  txn          - Transaction object
 * @param {boolean} showDate     - Whether to show the date badge (default: false)
 * @param {string}  className    - Extra wrapper classes
 */
export default function TransactionCard({
  txn,
  showDate = false,
  className = '',
}) {
  const amountColor =
    txn.type === 'expense'
      ? 'text-red-500'
      : txn.type === 'income'
        ? 'text-green-500'
        : 'text-stone-800';

  const prefix =
    txn.type === 'expense' ? '-' : txn.type === 'income' ? '+' : '';

  return (
    <div
      className={`bg-white/90 backdrop-blur-sm p-3 rounded-[1.5rem] border-2 border-pastel-pink/30 shadow-sm flex justify-between items-center hover:border-pastel-pink hover:-translate-y-0.5 transition-all ${className}`}
    >
      <div className='flex-1 min-w-0 mr-3'>
        <p className='font-bold text-text-main text-sm mb-0.5 truncate'>
          {txn.title}
        </p>
        <div className='flex gap-2 text-[10px] font-bold text-text-muted'>
          <span className='capitalize'>{txn.category}</span>
          {showDate && txn.date && (
            <>
              <span>•</span>
              <span>{format(new Date(txn.date), 'dd MMM')}</span>
            </>
          )}
        </div>
      </div>
      <p className={`font-black text-sm whitespace-nowrap ${amountColor}`}>
        {prefix}
        {formatRupiah(txn.amount)}
      </p>
    </div>
  );
}
