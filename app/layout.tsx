import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wishing Well — Sphere',
  description: 'Cast wishes on Unicity Sphere. Community votes with UCT. Fulfilled or not — the chain decides.',
  icons: { icon: '/icon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-white antialiased">
        <Script id="sphere-error-handler" strategy="beforeInteractive">{`
          window.addEventListener('error', function(e) {
            if (e && e.message && e.message.includes('startsWith')) {
              e.preventDefault();
              e.stopPropagation();
              console.warn('Sphere SDK internal error suppressed:', e.message);
              return false;
            }
          }, true);
          window.addEventListener('unhandledrejection', function(e) {
            if (e && e.reason && e.reason.message && e.reason.message.includes('startsWith')) {
              e.preventDefault();
              console.warn('Sphere SDK rejection suppressed');
            }
          });
        `}</Script>
        {children}
      </body>
    </html>
  );
}