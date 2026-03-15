'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/components/providers/wallet-provider';
import { Button } from '@/components/ui/button';
import { Coins, ArrowDownCircle, ArrowUpCircle, AlertCircle, Copy, Check, Clock, Users, PauseCircle, ShieldCheck, ShieldAlert, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchCallReadOnlyFunction, cvToJSON, uintCV, noneCV, someCV, standardPrincipalCV } from '@stacks/transactions';
import { request } from '@stacks/connect';
import { useSearchParams } from 'next/navigation';
import { PRIZE_POOL_CONTRACT, TWAB_CONTROLLER_CONTRACT, STACKS_NETWORK, HIRO_API_URL, IS_MAINNET, GET_HIVE_STATS_FUNCTION, GET_USER_DEPOSIT_FUNCTION, STORE_IN_HIVE_FUNCTION, LEAVE_HIVE_FUNCTION, CHECK_SOLVENCY_FUNCTION, GET_REFERRAL_INFO_FUNCTION } from '@/lib/stacks';

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
  const { isLoggedIn, connect, stxAddress } = useWallet();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const MIN_DEPOSIT_STX = 1; // Matches contract min-deposit of u1000000 microSTX
  
  const [balance, setBalance] = useState<number>(0);
  const [twab, setTwab] = useState<number>(0);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [totalPoolDeposits, setTotalPoolDeposits] = useState<number>(0);
  const [totalBees, setTotalBees] = useState<number>(0);
  const [nextDrawBlock, setNextDrawBlock] = useState<number>(0);
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isSolvent, setIsSolvent] = useState<boolean>(true);
  const [referrer, setReferrer] = useState<string | null>(null);
  const [referralBoost, setReferralBoost] = useState<number>(0);
  
  interface Transaction {
    id: string;
    status: string;
    type: string;
    timestamp: string;
  }
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [copied, setCopied] = useState(false);

  // Estimate time remaining until next draw (~10 min per block on Stacks)
  const blocksUntilDraw = Math.max(0, nextDrawBlock - currentBlockHeight);
  const minutesUntilDraw = blocksUntilDraw * 10;
  const hoursUntilDraw = Math.floor(minutesUntilDraw / 60);
  const remainingMinutes = minutesUntilDraw % 60;

  const fetchStats = useCallback(async () => {
    if (!stxAddress) return;
    try {
      const [contractAddress, contractName] = PRIZE_POOL_CONTRACT.split('.');
      const [twabContractAddress, twabContractName] = TWAB_CONTROLLER_CONTRACT.split('.');
      const userAddress = stxAddress;

      // Fetch user deposit from prize pool contract
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
      setBalance(Number(depositVal) / 1000000);

      // Fetch real TWAB from twab-controller contract
      try {
        const twabResponse = await fetchCallReadOnlyFunction({
          network: STACKS_NETWORK,
          contractAddress: twabContractAddress,
          contractName: twabContractName,
          functionName: 'get-current-balance',
          functionArgs: [standardPrincipalCV(userAddress)],
          senderAddress: userAddress,
        });
        const twabVal = cvToJSON(twabResponse)?.value?.value || 0;
        setTwab(Number(twabVal) / 1000000);
      } catch {
        // Fallback to deposit value if TWAB call fails
        setTwab(Number(depositVal) / 1000000);
      }

      // Fetch pool-wide stats from get-hive-stats
      const statsResponse = await fetchCallReadOnlyFunction({
        network: STACKS_NETWORK,
        contractAddress,
        contractName,
        functionName: GET_HIVE_STATS_FUNCTION,
        functionArgs: [],
        senderAddress: userAddress,
      });
      const statsObj = cvToJSON(statsResponse)?.value?.value || cvToJSON(statsResponse)?.value || {};
      setTotalPoolDeposits(Number(statsObj['total-deposits']?.value || 0) / 1000000);
      setTotalBees(Number(statsObj['total-bees']?.value || 0));
      setNextDrawBlock(Number(statsObj['next-draw-block']?.value || 0));
      setIsPaused(statsObj['is-paused']?.value === true);

      // Fetch solvency status
      try {
        const solvencyResponse = await fetchCallReadOnlyFunction({
          network: STACKS_NETWORK,
          contractAddress,
          contractName,
          functionName: CHECK_SOLVENCY_FUNCTION,
          functionArgs: [],
          senderAddress: userAddress,
        });
        const solvencyObj = cvToJSON(solvencyResponse)?.value?.value || {};
        setIsSolvent(solvencyObj['is-solvent']?.value !== false);
      } catch {
        // Default to solvent if check fails
      }

      // Fetch referral info for this user
      try {
        const refResponse = await fetchCallReadOnlyFunction({
          network: STACKS_NETWORK,
          contractAddress,
          contractName,
          functionName: GET_REFERRAL_INFO_FUNCTION,
          functionArgs: [standardPrincipalCV(userAddress)],
          senderAddress: userAddress,
        });
        const refData = cvToJSON(refResponse)?.value?.value;
        if (refData) {
          setReferrer(refData.referrer?.value || null);
          setReferralBoost(Number(refData.boost?.value || 0) / 1000000);
        }
      } catch {
        // No referral for this user
      }

      // Fetch current block height from Hiro API
      const infoResponse = await fetch(`${HIRO_API_URL}/v2/info`);
      if (infoResponse.ok) {
        const infoData = await infoResponse.json();
        setCurrentBlockHeight(infoData.stacks_tip_height || 0);
      }

      // Fetch wallet STX balance from Hiro API
      const balanceResponse = await fetch(`${HIRO_API_URL}/extended/v1/address/${userAddress}/balances`);
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        const availableStx = balanceData?.stx?.balance || '0';
        setWalletBalance(Number(availableStx) / 1000000);
      }
      
      // Fetch transaction history from Hiro API
      const txsResponse = await fetch(`${HIRO_API_URL}/extended/v1/address/${userAddress}/transactions?limit=20`);
      if (txsResponse.ok) {
        const txsData = await txsResponse.json();
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
  }, [stxAddress]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchStats();
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, fetchStats]);

  const handleTransaction = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (activeTab === 'deposit' && Number(amount) < MIN_DEPOSIT_STX) {
      toast.error(`Minimum deposit is ${MIN_DEPOSIT_STX} STX`, { style: { borderRadius: '10px', background: '#333', color: '#fff' }});
      return;
    }

    if (activeTab === 'withdraw' && Number(amount) > balance) {
      toast.error(`Insufficient balance. Your deposit is ${balance.toLocaleString()} STX`, { style: { borderRadius: '10px', background: '#333', color: '#fff' }});
      return;
    }

    const microStxAmount = Math.floor(Number(amount) * 1000000);
    
    // Parse referral from URL if present
    const refParam = searchParams.get('ref');
    
    let functionArgs;
    
    if (activeTab === 'deposit') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let referrerCV: any = noneCV();
      if (refParam && refParam.startsWith('ST')) {
        try {
          referrerCV = someCV(standardPrincipalCV(refParam));
        } catch (e) {
          console.warn('Invalid referrer address format', e);
        }
      }
      functionArgs = [uintCV(microStxAmount), referrerCV];
    } else {
      functionArgs = [uintCV(microStxAmount)];
    }
    
    setIsProcessing(true);
    const toastId = toast.loading('Waiting for wallet approval...', { style: { borderRadius: '10px', background: '#333', color: '#fff' } });
    try {
      const response = await request('stx_callContract', {
        network: IS_MAINNET ? 'mainnet' : 'testnet',
        contract: PRIZE_POOL_CONTRACT,
        functionName: activeTab === 'deposit' ? STORE_IN_HIVE_FUNCTION : LEAVE_HIVE_FUNCTION,
        functionArgs,
        postConditionMode: 'allow',
      });

      if (response && response.txid) {
        toast.dismiss(toastId);
        toast.success(`Transaction Broadcasted! TXID: ${response.txid.substring(0, 8)}...`, { duration: 5000, style: { borderRadius: '10px', background: '#333', color: '#fff' }});
        
        // Optimistically update the UI to reflect the pending transaction
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
          id: response.txid,
          status: 'pending',
          type: activeTab === 'deposit' ? 'Deposit' : 'Withdraw',
          timestamp: new Date().toISOString()
        };
        setTransactions(prev => [newTx, ...prev.slice(0, 9)]);
        
        setAmount('');
        setTimeout(fetchStats, 10000); // Re-fetch after a short pause to ensure network sync
      } else {
        toast.dismiss(toastId);
        // User cancelled popup via the new api returns no txid or throws
      }
    } catch (e: unknown) {
      toast.dismiss(toastId);
      const msg = e instanceof Error ? e.message : '';
      if (msg.toLowerCase().includes('cancel')) {
        toast.error('Transaction cancelled by user', { style: { borderRadius: '10px', background: '#333', color: '#fff' }});
      } else {
        console.error(e);
        toast.error('Error opening contract call', { style: { borderRadius: '10px', background: '#333', color: '#fff' }});
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const copyReferralLink = () => {
    if (!stxAddress) return;
    const link = `${window.location.origin}/hive?ref=${stxAddress}`;
    
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
      {/* Paused Banner */}
      {isPaused && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl flex items-center gap-3">
          <PauseCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-300 font-semibold">Contract Paused</p>
            <p className="text-red-400/70 text-sm">Deposits and withdrawals are temporarily disabled. Your funds are safe.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-display font-bold text-white">Your Hive</h1>
        <div className="flex items-center gap-2 px-4 py-2 glass-panel !rounded-full">
          <div className="w-2 h-2 rounded-full bg-lucky-accent animate-pulse"></div>
          <span className="text-sm font-medium text-lucky-accent">Live</span>
        </div>
      </div>

      {/* Pool-wide Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-panel p-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Pool</p>
          <p className="text-lg font-bold text-white">{totalPoolDeposits.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-lucky-orange text-sm">STX</span></p>
        </div>
        <div className="glass-panel p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-3 h-3 text-gray-500" />
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Bees</p>
          </div>
          <p className="text-lg font-bold text-white">{totalBees.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="glass-panel p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-gray-500" />
            <p className="text-xs text-gray-500 uppercase tracking-wider">Next Draw</p>
          </div>
          <p className="text-lg font-bold text-white">
            {blocksUntilDraw > 0 ? `${hoursUntilDraw}h ${remainingMinutes}m` : 'Imminent'}
          </p>
        </div>
        <div className="glass-panel p-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Your Share</p>
          <p className="text-lg font-bold text-white">
            {totalPoolDeposits > 0 ? `${((balance / totalPoolDeposits) * 100).toFixed(2)}%` : '0%'}
          </p>
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
            {referrer && (
              <div className="mb-3 p-2.5 bg-lucky-accent/10 border border-lucky-accent/20 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-lucky-accent">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Referred by <span className="font-mono">{referrer.substring(0, 5)}...{referrer.substring(referrer.length - 4)}</span></span>
                </div>
                {referralBoost > 0 && (
                  <p className="text-xs text-lucky-accent/70 mt-1 pl-5">+{referralBoost.toLocaleString()} TWAB boost applied</p>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500 mb-4">
              Invite friends to the hive. Both you and your friend get a 5% boost to your TWAB points on every deposit.
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

          {/* Solvency Indicator */}
          <div className="glass-panel p-4">
            <div className="flex items-center gap-3">
              {isSolvent ? (
                <ShieldCheck className="w-5 h-5 text-green-400" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-red-400" />
              )}
              <div>
                <p className="text-sm font-medium text-white">Protocol Health</p>
                <p className={`text-xs ${isSolvent ? 'text-green-400' : 'text-red-400'}`}>
                  {isSolvent ? 'Solvent - All funds backed' : 'Warning - Check solvency'}
                </p>
              </div>
            </div>
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
                      {activeTab === 'deposit' && (
                        <p className="text-xs text-gray-500 mt-1.5 pl-1">Minimum deposit: {MIN_DEPOSIT_STX} STX</p>
                      )}
                    </div>

                    <Button 
                      onClick={handleTransaction} 
                      disabled={isProcessing || isPaused}
                      className={`w-full py-6 text-lg group ${activeTab === 'withdraw' ? 'variant-outline' : ''}`}
                      variant={activeTab === 'withdraw' ? 'outline' : 'default'}
                    >
                      {isPaused ? (
                        <>
                          <PauseCircle className="mr-2 w-5 h-5" />
                          Contract Paused
                        </>
                      ) : activeTab === 'deposit' ? (
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
                          window.open(`https://explorer.hiro.so/txid/${tx.id}?chain=${IS_MAINNET ? 'mainnet' : 'testnet'}`, '_blank');
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

      {/* Solvency Warning */}
      {!isSolvent && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-300 font-semibold">Solvency Warning</p>
            <p className="text-red-400/70 text-sm">Contract balance is below expected obligations. Contact the team.</p>
          </div>
        </div>
      )}
      </div>
    </motion.div>
  );
}
