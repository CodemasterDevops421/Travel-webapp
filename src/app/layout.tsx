import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter, Roboto_Slab } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AppQueryProvider } from '@/components/providers/query-provider';
import { Header } from '@/components/layout/header';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap'
});

const headingFont = Roboto_Slab({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap'
});

export const metadata: Metadata = {
  metadataBase: (() => {
    const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
    try {
      return new URL(raw && raw.length > 0 ? raw : 'http://localhost:3000');
    } catch {
      return new URL('http://localhost:3000');
    }
  })(),
  title: 'TravelApp OTA',
  description: 'Fast, transparent hotel booking with secure checkout.',
  openGraph: {
    title: 'TravelApp OTA',
    description: 'Fast, transparent hotel booking with secure checkout.',
    type: 'website',
    url: '/'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TravelApp OTA',
    description: 'Fast, transparent hotel booking with secure checkout.'
  },
  alternates: {
    canonical: '/'
  }
};

import { AIChatbot } from '@/features/ai/components/ai-chatbot';

// ... existing imports

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${headingFont.variable} ${inter.variable}`}>
        <ThemeProvider>
          <AppQueryProvider>
            <Suspense fallback={null}>
              <Header />
            </Suspense>
            {children}
            <AIChatbot />
          </AppQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
