import './globals.css';
import BottomNav from '@/components/BottomNav';

export const metadata = {
  title: 'GenZ Finance Tracker',
  description: 'Manage your cuan like a pro',
};

export default function RootLayout({ children }) {
  return (
    <html lang='id'>
      <body className='bg-[#FAFAF9] text-stone-800 antialiased relative min-h-screen'>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
