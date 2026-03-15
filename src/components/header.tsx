'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useWallet } from './providers/wallet-provider';
import { Button } from './ui/button';

export function Header() {
  const { isLoggedIn, stxAddress, connect, disconnect } = useWallet();

  const truncateAddress = (address: string) => {
    return `${address.substring(0, 4)}...${address.substring(address.length - 5)}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-panel !rounded-none !border-t-0 !border-x-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center group">
              <div className="relative h-10 w-auto flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                <Image src="/logo.svg" alt="LuckyHive Logo" width={150} height={40} className="drop-shadow-[0_0_8px_rgba(247,147,26,0.3)] w-auto h-full" priority />
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex space-x-8">
            <Link href="/hive" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
              The Hive
            </Link>
            <Link href="/draws" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
              Prize Draws
            </Link>
            <Link href="/docs" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
              How it Works
            </Link>
            <Link href="/about" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
              Manifesto
            </Link>
          </nav>

          <div className="flex items-center">
            {isLoggedIn && stxAddress ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-lucky-dark/50 rounded-lg border border-lucky-border shadow-inner">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-semibold text-green-500 uppercase tracking-wide pr-2 border-r border-lucky-border/50">Connected</span>
                  <span className="text-sm font-mono text-lucky-orange pl-1">
                    {truncateAddress(stxAddress)}
                  </span>
                </div>
                <Button variant="outline" onClick={disconnect} className="text-sm">
                  Disconnect
                </Button>
              </div>
            ) : isLoggedIn ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-lucky-dark/50 rounded-lg border border-lucky-border shadow-inner">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-semibold text-green-500 uppercase tracking-wide">Connected</span>
                </div>
                <Button variant="outline" onClick={disconnect} className="text-sm">
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={connect} className="glass-button px-6 py-2">
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
