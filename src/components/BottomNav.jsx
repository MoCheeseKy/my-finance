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
    <nav className='fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] bg-surface/70 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_40px_rgb(220,198,255,0.3)] dark:shadow-[0_20px_40px_rgb(0,0,0,0.6)] border border-primary/30 px-6 py-4 flex justify-between items-center z-50'>
      {navItems.map((item, index) => {
        if (item.isFab) {
          return (
            <div key='fab' className='relative -top-8 z-50'>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                onClick={() => router.push('/add')}
                className='w-16 h-16 bg-gradient-to-tr from-primary to-primary-hover text-surface rounded-full flex items-center justify-center shadow-[0_10px_25px_rgb(220,198,255,0.8)] dark:shadow-[0_10px_25px_rgb(155,126,222,0.5)] ring-[6px] ring-bg/80 backdrop-blur-sm'
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
            className='relative flex flex-col items-center justify-center w-12 h-12'
          >
            {/* Active Indicator Background */}
            {isActive && (
              <motion.div
                layoutId='active-pill'
                className='absolute inset-0 bg-primary/20 dark:bg-primary/30 rounded-2xl'
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
            )}
            <Icon
              className={`w-6 h-6 z-10 transition-colors duration-300 ${
                isActive
                  ? 'text-primary drop-shadow-md stroke-[2.5]'
                  : 'text-text-secondary hover:text-primary stroke-2'
              }`}
            />
            {/* Optional: Tiny dot indicator instead of full bg */}
            {isActive && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className='absolute -bottom-1 w-1 h-1 bg-primary rounded-full'
              />
            )}
          </motion.button>
        );
      })}
    </nav>
  );
}
