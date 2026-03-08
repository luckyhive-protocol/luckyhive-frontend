'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/components/providers/wallet-provider';
import { Button } from '@/components/ui/button';
import { Coins, ArrowDownCircle, ArrowUpCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HiveDashboard() {
  const { isLoggedIn, connect } = useWallet();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock data for frontend build out
  const balance = 1050.50;
  const twab = 840.25;
  const poolYield = 45000;

  const handleTransaction = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    
    // Simulate transaction delay
    setTimeout(() => {
      setIsProcessing(false);
      toast.success(`Successfully ${activeTab === 'deposit' ? 'deposited to' : 'withdrawn from'} the Hive!`);
      setAmount('');
    }, 2000);
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
              <span className="text-xs px-2 py-1 rounded bg-lucky-dark border border-lucky-border/50 text-gray-300 cursor-help" title="Time-Weighted Average Balance dictates your odds of winning">What&apos;s this?</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white text-glow">{twab.toLocaleString()}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-lucky-border/30 flex justify-between text-sm">
              <span className="text-gray-500">Win Probability</span>
              <span className="text-lucky-accent font-medium">{((twab / poolYield) * 100).toFixed(2)}%</span>
            </div>
          </div>
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
                          Balance: {activeTab === 'deposit' ? '10,000.00' : balance.toLocaleString()}
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
                            onClick={() => setAmount(activeTab === 'deposit' ? '10000' : balance.toString())}
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
    </motion.div>
  );
}
