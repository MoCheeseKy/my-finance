import './globals.css';
import BottomNav from '@/components/BottomNav';

export const metadata = {
  title: 'GenZ Finance Tracker',
  description: 'Manage your cuan like a pro',
};

export default function RootLayout({ children }) {
  return (
    <html lang='id' suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('app-theme') === 'dark' || (!('app-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className='bg-bg text-text-primary antialiased relative min-h-screen selection:bg-primary/30 selection:text-text-primary'>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
