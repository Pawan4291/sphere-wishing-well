import type { Metadata } from 'next';
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
        {children}
      </body>
    </html>
  );
}
