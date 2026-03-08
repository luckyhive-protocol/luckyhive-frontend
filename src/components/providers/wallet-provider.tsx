'use client';

import { ReactNode, useState, useEffect, createContext, useContext } from 'react';
import { AppConfig, UserSession, showConnect, UserData } from '@stacks/connect';

const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

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
    showConnect({
      appDetails: {
        name: 'LuckyHive',
        icon: window.location.origin + '/logo.png',
      },
      redirectTo: '/',
      onFinish: () => {
        setUserData(userSession.loadUserData());
        setIsLoggedIn(true);
      },
      userSession,
    });
  };

  const disconnect = () => {
    userSession.signUserOut('/');
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
