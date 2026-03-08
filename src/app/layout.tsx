import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/components/providers/wallet-provider';
import { Header } from '@/components/header';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'LuckyHive | Decentralized No-Loss Savings Protocol',
  description: 'Deposit Stacks (STX) or sBTC into LuckyHive to earn yield and get a chance to win the weekly prize pool with no risk to your principal.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <div className="honeycomb-pattern"></div>
        <WalletProvider>
          <Header />
          <main className="flex-1 pt-24 pb-12 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </main>
          <footer className="py-6 border-t border-lucky-border/30 mt-auto">
            <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
              <p>LuckyHive operates on the Stacks Blockchain.</p>
              <p className="mt-1">This is experimental software. Use at your own risk.</p>
            </div>
          </footer>
        </WalletProvider>
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#0F1626',
              color: '#F8FAFC',
              border: '1px solid rgba(247, 147, 26, 0.2)',
              borderRadius: '12px',
            },
            success: {
              iconTheme: {
                primary: '#2DDF8C',
                secondary: '#0F1626',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
