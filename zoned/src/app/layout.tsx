import type { Metadata } from 'next';
import { Outfit, Fraunces } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Zoned — AI Focus Coach',
  description:
    'Real-time AI accountability app that monitors your focus using camera, microphone, and browser activity.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full antialiased ${outfit.variable} ${fraunces.variable}`}
    >
      <body
        className={`min-h-full flex flex-col bg-background text-foreground ${outfit.className}`}
      >
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
