import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import { SessionProvider } from '@/features/auth';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Tulpa - Fondo de Ahorro y Crédito Comunal',
  description:
    'Plataforma digital para la gestión de fondos de ahorro comunal y créditos internos entre socios.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <TooltipProvider>
            <SessionProvider>{children}</SessionProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
