'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/components/providers/wallet-provider';
import { Button } from '@/components/ui/button';
import { Coins, ArrowDownCircle, ArrowUpCircle, AlertCircle, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchCallReadOnlyFunction, cvToJSON, uintCV, noneCV, someCV, standardPrincipalCV, principalCV } from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import { useSearchParams } from 'next/navigation';
import { PRIZE_POOL_CONTRACT, STACKS_NETWORK, GET_HIVE_STATS_FUNCTION, GET_USER_DEPOSIT_FUNCTION, STORE_IN_HIVE_FUNCTION, LEAVE_HIVE_FUNCTION } from '@/lib/stacks';

import { ExternalLink } from 'lucide-react';
import Leaderboard from '@/components/hive/leaderboard';

export default function HiveDashboard() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lucky-orange"></div>
      </div>
    }>
      <HiveDashboardContent />
    </Suspense>
  );
}

function HiveDashboardContent() {
  const { isLoggedIn, connect, userData } = useWallet();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [balance, setBalance] = useState<number>(0);
  const [twab, setTwab] = useState<number>(0);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  
  interface Transaction {
    id: string;
    status: string;
    type: string;
    timestamp: string;
  }
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [copied, setCopied] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!userData) return;
    try {
      const [contractAddress, contractName] = PRIZE_POOL_CONTRACT.split('.');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isMainnet = (STACKS_NETWORK as any).chainId === 1;
      const userAddress = isMainnet ? userData.profile.stxAddress.mainnet : userData.profile.stxAddress.testnet;

      // Fetch user deposit
      const userDepositResponse = await fetchCallReadOnlyFunction({
        network: STACKS_NETWORK,
        contractAddress,
        contractName,
        functionName: GET_USER_DEPOSIT_FUNCTION,
        functionArgs: [standardPrincipalCV(userAddress)],
        senderAddress: userAddress,
      });
      const parsedDeposit = cvToJSON(userDepositResponse);
      const depositVal = parsedDeposit?.value?.value?.amount?.value || parsedDeposit?.value?.amount?.value || 0;
      setBalance(Number(depositVal) / 1000000); // MicroSTX to STX

      // Fetch total stats (Keep the call to verify it's working if needed, but not assigning to unused variables)
      await fetchCallReadOnlyFunction({
        network: STACKS_NETWORK,
        contractAddress,
        contractName,
        functionName: GET_HIVE_STATS_FUNCTION,
        functionArgs: [],
        senderAddress: userAddress,
      });
      
      // We will use user deposit as an approximation for TWAB for now for the frontend
      setTwab(Number(depositVal) / 1000000);

      // Fetch actual wallet STX balance from Hiro API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiUrl = (STACKS_NETWORK as any).baseUrl;
      const balanceResponse = await fetch(`${apiUrl}/extended/v1/address/${userAddress}/balances`);
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        const availableStx = balanceData?.stx?.balance || '0';
        setWalletBalance(Number(availableStx) / 1000000);
      }
      
      // Fetch transaction history
      const txsResponse = await fetch(`${apiUrl}/extended/v1/address/${userAddress}/transactions?limit=10`);
      if (txsResponse.ok) {
        const txsData = await txsResponse.json();
        // Filter out for our specific contract calls if we want to, 
        // but here we just show their general activity focused on our contract.
        const relevantTxs = txsData.results
          .filter((tx: { tx_type: string; contract_call?: { contract_id: string } }) => 
            tx.tx_type === 'contract_call' && tx.contract_call?.contract_id === PRIZE_POOL_CONTRACT
          )
          .map((tx: { tx_id: string; tx_status: string; contract_call: { function_name: string }; burn_block_time_iso?: string }) => ({
            id: tx.tx_id,
            status: tx.tx_status,
            type: tx.contract_call.function_name === STORE_IN_HIVE_FUNCTION ? 'Deposit' : 
                  tx.contract_call.function_name === LEAVE_HIVE_FUNCTION ? 'Withdraw' : 'Other',
            timestamp: tx.burn_block_time_iso || new Date().toISOString()
          }));
        setTransactions(relevantTxs);
      }
      
    } catch (error) {
      console.error('Error fetching hive stats:', error);
    }
  }, [userData]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchStats();
    }
  }, [isLoggedIn, fetchStats]);

  const handleTransaction = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const microStxAmount = Math.floor(Number(amount) * 1000000);
    const [contractAddress, contractName] = PRIZE_POOL_CONTRACT.split('.');
    
    // Parse referral from URL if present
    const refParam = searchParams.get('ref');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let referrerCV: any = noneCV();
    
    if (activeTab === 'deposit' && refParam && refParam.startsWith('ST')) {
      // Basic validation for Stacks address to prevent UI crash
      try {
        referrerCV = someCV(principalCV(refParam));
      } catch (e) {
        console.warn('Invalid referrer address format', e);
      }
    }
    
    setIsProcessing(true);
    try {
      await openContractCall({
        network: STACKS_NETWORK,
        contractAddress,
        contractName,
        functionName: activeTab === 'deposit' ? STORE_IN_HIVE_FUNCTION : LEAVE_HIVE_FUNCTION,
        functionArgs: activeTab === 'deposit' 
          ? [uintCV(microStxAmount), referrerCV] 
          : [uintCV(microStxAmount)],
        onFinish: (data) => {
          toast.success(`Transaction submitted! TXID: ${data.txId.substring(0, 8)}...`);
          
          // Optimistically update the UI to reflect the pending/successful transaction
          const numAmount = Number(amount);
          if (activeTab === 'deposit') {
            setBalance(prev => prev + numAmount);
            setTwab(prev => prev + numAmount);
            setWalletBalance(prev => Math.max(0, prev - numAmount));
          } else {
            setBalance(prev => Math.max(0, prev - numAmount));
            setTwab(prev => Math.max(0, prev - numAmount));
            setWalletBalance(prev => prev + numAmount);
          }
          
          // Optimistically show the tx in the list
          const newTx = {
            id: data.txId,
            status: 'pending',
            type: activeTab === 'deposit' ? 'Deposit' : 'Withdraw',
            timestamp: new Date().toISOString()
          };
          setTransactions(prev => [newTx, ...prev.slice(0, 9)]);
          
          setAmount('');
          setTimeout(fetchStats, 10000); // Re-fetch after a short pause to ensure network sync
        },
        onCancel: () => {
          toast.error('Transaction cancelled');
        }
      });
    } catch (e) {
      console.error(e);
      toast.error('Error opening contract call');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyReferralLink = () => {
    if (!userData) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isMainnet = (STACKS_NETWORK as any).chainId === 1;
    const userAddress = isMainnet ? userData.profile.stxAddress.mainnet : userData.profile.stxAddress.testnet;
    const link = `${window.location.origin}/hive?ref=${userAddress}`;
    
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertCircle className="w-16 h-16 text-lucky-orange mb-6" />
        <h2 className="text-2xl font-display font-bold mb-4">Wallet Disconnected</h2>
        <p className="text-gray-400 mb-8 text-center max-w-md">
          You need to connect your Stacks wallet to view your Hive dashboard and manage your deposits.
        </p>
        <Button onClick={connect} size="lg" className="w-full max-w-xs">
          Connect Wallet
        </Button>
      </div>
    );
  }

  return (
    <motion.div 
      className="max-w-5xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-display font-bold text-white">Your Hive</h1>
        <div className="flex items-center gap-2 px-4 py-2 glass-panel !rounded-full">
          <div className="w-2 h-2 rounded-full bg-lucky-accent animate-pulse"></div>
          <span className="text-sm font-medium text-lucky-accent">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-lucky-orange/10 rounded-full blur-2xl -mt-10 -mr-10 group-hover:bg-lucky-orange/20 transition-colors"></div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Total Deposit</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white">{balance.toLocaleString()}</span>
              <span className="text-lucky-orange font-medium">STX</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">100% Principal Protected</p>
          </div>

          <div className="glass-panel p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-lucky-accent/10 rounded-full blur-2xl -mt-10 -mr-10 group-hover:bg-lucky-accent/20 transition-colors"></div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">Your TWAB</h3>
              <span className="text-xs px-2 py-1 rounded bg-lucky-dark border border-lucky-border/50 text-gray-300 cursor-help" title="Time-Weighted Average Balance determines how many tickets you get for the draw">What&apos;s this?</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white text-glow">{twab.toLocaleString()}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-lucky-border/30">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Draw Tickets</span>
                <span className="text-lucky-accent font-medium">{Math.floor(twab).toLocaleString()} Tickets</span>
              </div>
              <p className="text-xs text-gray-600">You hold {Math.floor(twab).toLocaleString()} tickets for the next draw</p>
            </div>
          </div>

          <div className="glass-panel p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-lucky-orange/5 rounded-full blur-2xl -mt-10 -mr-10 group-hover:bg-lucky-orange/10 transition-colors"></div>
            <h3 className="text-gray-400 text-sm font-medium mb-4">Hive Invites</h3>
            <p className="text-xs text-gray-500 mb-4">
              Invite friends to the hive. Both you and your friend get a **5% boost** to your TWAB points on every deposit.
            </p>
            <Button 
              onClick={copyReferralLink}
              disabled={!isLoggedIn}
              variant="outline" 
              size="sm"
              className={`w-full flex items-center justify-center gap-2 py-5 transition-all duration-300 ${
                copied 
                  ? 'border-green-500/50 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]' 
                  : 'border-lucky-border/50 hover:bg-white/5 hover:border-lucky-orange/30'
              }`}
            >
              <AnimatePresence mode="wait">
                {!isLoggedIn ? (
                  <motion.div 
                    key="login"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-gray-500"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Login to Invite</span>
                  </motion.div>
                ) : copied ? (
                  <motion.div 
                    key="copied"
                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.1, y: -5 }}
                    className="flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-medium">Copied to Clipboard!</span>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="copy"
                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.1, y: -5 }}
                    className="flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4 text-lucky-orange" />
                    <span>Copy Invite Link</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>

          <Leaderboard />
        </div>

        {/* Right Column - Actions */}
        <div className="lg:col-span-2">
          <div className="glass-panel p-1">
            <div className="flex p-1 bg-lucky-dark/50 rounded-xl mb-6">
              <button
                onClick={() => setActiveTab('deposit')}
                className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'deposit' 
                    ? 'bg-lucky-orange text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Deposit
              </button>
              <button
                onClick={() => setActiveTab('withdraw')}
                className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'withdraw' 
                    ? 'bg-lucky-dark border border-lucky-border text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Withdraw
              </button>
            </div>

            <div className="p-5 md:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {activeTab === 'deposit' ? 'Add to the Hive' : 'Leave the Hive'}
                    </h2>
                    <p className="text-gray-400 text-sm">
                      {activeTab === 'deposit' 
                        ? 'Deposit STX to earn yield and increase your chances of winning the weekly prize.' 
                        : 'Withdraw your principal STX at any time. You will lose your current TWAB progress.'}
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <label className="text-gray-300 font-medium">Amount (STX)</label>
                        <span className="text-gray-500">
                          Balance: {activeTab === 'deposit' ? walletBalance.toLocaleString() : balance.toLocaleString()}
                        </span>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Coins className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-12 pr-20 py-4 bg-lucky-dark/80 border border-lucky-border/50 rounded-xl text-white text-lg focus:ring-2 focus:ring-lucky-orange focus:border-transparent outline-none transition-all"
                        />
                        <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                          <button 
                            onClick={() => setAmount(activeTab === 'deposit' ? walletBalance.toString() : balance.toString())}
                            className="bg-lucky-orange/20 text-lucky-orange hover:bg-lucky-orange/30 px-3 py-1 rounded-md text-xs font-bold uppercase transition-colors"
                          >
                            Max
                          </button>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleTransaction} 
                      disabled={isProcessing}
                      className={`w-full py-6 text-lg group ${activeTab === 'withdraw' ? 'variant-outline' : ''}`}
                      variant={activeTab === 'withdraw' ? 'outline' : 'default'}
                    >
                      {activeTab === 'deposit' ? (
                        <>
                          Deposit STX
                          <ArrowDownCircle className="ml-2 w-5 h-5 group-hover:translate-y-1 transition-transform" />
                        </>
                      ) : (
                        <>
                          Withdraw STX
                          <ArrowUpCircle className="ml-2 w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      
      {/* Transaction History */}
      <div className="mt-12 glass-panel p-6">
        <h2 className="text-xl font-bold text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-lucky-orange to-lucky-accent">Your Transaction History</h2>
        
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-lucky-dark/50 border-b border-lucky-border/30 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <th className="p-4 rounded-tl-lg">Type</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 rounded-tr-lg text-right">Explorer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lucky-border/20">
                {transactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <span className={`inline-flex py-1 px-3 rounded-md text-xs font-semibold ${
                        tx.type === 'Deposit' ? 'bg-lucky-orange/10 text-lucky-orange' : 
                        tx.type === 'Withdraw' ? 'bg-lucky-accent/10 text-lucky-accent' : 
                        'bg-gray-500/10 text-gray-400'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      {new Date(tx.timestamp).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
                      })}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 text-sm ${
                        tx.status === 'success' ? 'text-green-400' :
                        tx.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {tx.status === 'success' ? (
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        ) : tx.status === 'pending' ? (
                          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        )}
                        <span className="capitalize">{tx.status}</span>
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const isMainnet = (STACKS_NETWORK as any).chainId === 1;
                          window.open(`https://explorer.hiro.so/txid/${tx.id}?chain=${isMainnet ? 'mainnet' : 'testnet'}`, '_blank');
                        }}
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400 hover:text-white" />
                        <span className="sr-only">View on Explorer</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-gray-500 border border-dashed border-lucky-border/50 rounded-xl">
            <Coins className="w-10 h-10 mb-3 opacity-20" />
            <p>No previous hive interactions found.</p>
            <p className="text-sm mt-1 opacity-70">Deposit STX to start earning and increasing your winning odds.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
