import type { Metadata } from 'next';
import './globals.css';
import { LangProvider } from '@/lib/i18n/context';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'PCBS2 3DMark Calculator',
  description: 'Calculate estimated 3DMark scores for PCBS2 builds',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <LangProvider>{children}</LangProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
