import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AppQueryProvider } from '@/components/providers/query-provider';

export const metadata: Metadata = {
  title: 'TravelForge OTA',
  description: 'Fast, transparent hotel booking powered by LiteAPI.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AppQueryProvider>{children}</AppQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
