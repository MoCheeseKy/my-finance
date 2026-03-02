import './globals.css';
import BottomNav from '@/components/BottomNav';

export const metadata = {
  title: 'GenZ Finance Tracker',
  description: 'Manage your cuan like a pro',
};

export default function RootLayout({ children }) {
  return (
    <html lang='id'>
      <body className='bg-pastel-bg text-text-main antialiased relative min-h-screen selection:bg-pastel-pink selection:text-text-main'>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
