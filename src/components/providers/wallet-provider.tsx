'use client';

import { ReactNode, useState, useEffect, createContext, useContext } from 'react';
import { AppConfig, UserSession, authenticate, UserData } from '@stacks/connect';

const appConfig = typeof window !== 'undefined' ? new AppConfig(['store_write', 'publish_data']) : null;
export const userSession = typeof window !== 'undefined' ? new UserSession({ appConfig: appConfig as AppConfig }) : null as unknown as UserSession;

type WalletContextType = {
  isLoggedIn: boolean;
  userData: UserData | null;
  userSession: UserSession;
  connect: () => void;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    if (!userSession) return;
    
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((data) => {
        setUserData(data);
        setIsLoggedIn(true);
      });
    } else if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
      setIsLoggedIn(true);
    }
  }, []);

  const connect = () => {
    authenticate({
      appDetails: {
        name: 'LuckyHive',
        icon: window.location.origin + '/logo.png',
      },
      onFinish: (payload) => {
        // Explicitly set UserData from the payload's userSession, bypassing the singleton
        if (payload && payload.userSession) {
          setUserData(payload.userSession.loadUserData());
          setIsLoggedIn(true);
        }
      },
      userSession,
    });
  };

  const disconnect = () => {
    if (userSession) {
      userSession.signUserOut('/');
    }
    setUserData(null);
    setIsLoggedIn(false);
  };

  return (
    <WalletContext.Provider value={{ isLoggedIn, userData, userSession, connect, disconnect }}>
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
