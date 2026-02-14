import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Sora, Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AppQueryProvider } from '@/components/providers/query-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ErrorBoundary } from '@/components/error-boundary';
import { ConfigStatusBanner } from '@/components/config-status-banner';

const headingFont = Sora({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap'
});

const bodyFont = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-body',
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
  title: 'BabyBoomerTrips | the fun starts now',
  description: 'The world\'s first travel portal for baby boomers. Find hand-selected travel deals with discounts on vacations, hotels, resorts, cruises, airfare, escorted tours and more.',
  openGraph: {
    title: 'BabyBoomerTrips',
    description: 'The world\'s first travel portal for baby boomers.',
    type: 'website',
    url: '/'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BabyBoomerTrips',
    description: 'The world\'s first travel portal for baby boomers.'
  },
  alternates: {
    canonical: '/'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${headingFont.variable} ${bodyFont.variable} font-sans`}>
        <ThemeProvider>
          <ErrorBoundary>
            <AppQueryProvider>
              <Suspense fallback={null}>
                <Header />
              </Suspense>
              {children}
              <Suspense fallback={null}>
                <Footer />
              </Suspense>
              <ConfigStatusBanner />
            </AppQueryProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
