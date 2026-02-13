import type { Metadata } from 'next';
import { Sora, Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AppQueryProvider } from '@/components/providers/query-provider';

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
  title: 'TravelForge OTA',
  description: 'Fast, transparent hotel booking powered by LiteAPI.',
  openGraph: {
    title: 'TravelForge OTA',
    description: 'Fast, transparent hotel booking powered by LiteAPI.',
    type: 'website',
    url: '/'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TravelForge OTA',
    description: 'Fast, transparent hotel booking powered by LiteAPI.'
  },
  alternates: {
    canonical: '/'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <ThemeProvider>
          <AppQueryProvider>{children}</AppQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
