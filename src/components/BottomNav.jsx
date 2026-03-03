'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, PieChart, Plus, CreditCard, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const mainPages = ['/', '/insight', '/balance-accounts', '/user'];
  if (!mainPages.includes(pathname)) return null;

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/insight', icon: PieChart, label: 'Insight' },
    { isFab: true }, // Spacer & identifier untuk Center FAB
    { path: '/balance-accounts', icon: CreditCard, label: 'Accounts' },
    { path: '/user', icon: User, label: 'Profile' },
  ];

  return (
    <nav
      className='fixed z-50 flex items-center justify-between transition-all duration-500
      bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] flex-row px-6 py-4
      md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:left-8 md:translate-x-0 md:w-[76px] md:h-auto md:min-h-[450px] md:flex-col md:py-8 md:px-0
      bg-surface/70 backdrop-blur-2xl rounded-[2.5rem] md:rounded-[2.5rem] shadow-[0_20px_40px_rgb(220,198,255,0.3)] dark:shadow-[0_20px_40px_rgb(0,0,0,0.6)] border border-primary/30'
    >
      {navItems.map((item, index) => {
        if (item.isFab) {
          return (
            <div
              key='fab'
              className='relative -top-8 md:top-0 md:-right-6 z-50 md:my-4 transition-all duration-500'
            >
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                onClick={() => router.push('/add')}
                className='w-16 h-16 bg-gradient-to-tr from-primary to-primary-hover text-surface rounded-[1.5rem] md:rounded-[1.2rem] flex items-center justify-center shadow-[0_10px_25px_rgb(220,198,255,0.8)] dark:shadow-[0_10px_25px_rgb(155,126,222,0.5)] ring-[6px] ring-bg/80 backdrop-blur-sm'
              >
                <Plus className='w-8 h-8 text-bg stroke-[3]' />
              </motion.button>
            </div>
          );
        }

        const isActive = pathname === item.path;
        const Icon = item.icon;

        return (
          <motion.button
            key={item.path}
            whileTap={{ scale: 0.85 }}
            onClick={() => router.push(item.path)}
            className='relative flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 group'
          >
            {/* Active Indicator Background */}
            {isActive && (
              <motion.div
                layoutId='active-pill'
                className='absolute inset-0 bg-primary/20 dark:bg-primary/30 rounded-2xl md:rounded-[1.2rem]'
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
            )}

            <Icon
              className={`w-6 h-6 md:w-7 md:h-7 z-10 transition-colors duration-300 ${
                isActive
                  ? 'text-primary drop-shadow-md stroke-[2.5]'
                  : 'text-text-secondary group-hover:text-primary stroke-2'
              }`}
            />

            {/* Tooltip Hover for Desktop Only */}
            <span className='absolute left-20 bg-surface border border-border text-text-primary px-3 py-1.5 rounded-xl text-xs font-bold opacity-0 md:group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg whitespace-nowrap'>
              {item.label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
