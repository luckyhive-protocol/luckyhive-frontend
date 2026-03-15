'use client';

import { ReactNode, useState, useEffect, createContext, useContext } from 'react';
import {
  connect as connectV8,
  disconnect as disconnectV8,
  isConnected,
  getLocalStorage,
} from '@stacks/connect';
import { toast } from 'react-hot-toast';

type WalletContextType = {
  isLoggedIn: boolean;
  stxAddress: string;
  connect: () => void;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

/**
 * Extracts the STX address from the @stacks/connect v8 local storage data.
 * Falls back to empty string if unavailable.
 */
function getStoredStxAddress(): string {
  const stored = getLocalStorage();
  if (stored?.addresses?.stx?.length) {
    return stored.addresses.stx[0].address;
  }
  return '';
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [stxAddress, setStxAddress] = useState('');

  // Restore session from local storage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isConnected()) {
      const addr = getStoredStxAddress();
      if (addr) {
        setStxAddress(addr);
        setIsLoggedIn(true);
      }
    }
  }, []);

  const connect = async () => {
    try {
      const appDetails = {
        name: 'LuckyHive',
        icon: typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : 'https://luckyhive.app/favicon.ico',
      };

      const result = await connectV8({
        appDetails,
        forceWalletSelect: false,
        persistWalletSelect: true,
        enableLocalStorage: true,
      });

      let address = '';
      if (result?.addresses?.length) {
        const stxEntry = result.addresses.find(
          (a) => a.symbol === 'STX' || a.address.startsWith('ST') || a.address.startsWith('SP')
        );
        address = stxEntry?.address || result.addresses[0]?.address || '';
      }

      // Fallback to local storage if address not in response
      if (!address) {
        address = getStoredStxAddress();
      }

      if (address) {
        setStxAddress(address);
        setIsLoggedIn(true);
        const shortAddress = `${address.substring(0, 4)}...${address.substring(address.length - 5)}`;
        toast.success(`Wallet Connected: ${shortAddress}`, {
          style: { borderRadius: '10px', background: '#333', color: '#fff' },
        });
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const disconnect = () => {
    disconnectV8();
    setStxAddress('');
    setIsLoggedIn(false);
    toast.success('Wallet Disconnected', {
      style: { borderRadius: '10px', background: '#333', color: '#fff' },
    });
  };

  return (
    <WalletContext.Provider value={{ isLoggedIn, stxAddress, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
