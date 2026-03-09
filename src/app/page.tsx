'use client';

import { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/components/providers/wallet-provider';
import { ArrowRight, ShieldCheck, Coins, Trophy } from 'lucide-react';
import { fetchCallReadOnlyFunction, cvToJSON } from '@stacks/transactions';
import { PRIZE_POOL_CONTRACT, STACKS_NETWORK } from '@/lib/stacks';

export default function Home() {
  const { connect, isLoggedIn } = useWallet();
  const [totalYield, setTotalYield] = useState<number>(0);

  useEffect(() => {
    async function fetchTotalYield() {
      try {
        const [contractAddress, contractName] = PRIZE_POOL_CONTRACT.split('.');
        const statsResponse = await fetchCallReadOnlyFunction({
          network: STACKS_NETWORK,
          contractAddress,
          contractName,
          functionName: 'get-hive-stats',
          functionArgs: [],
          senderAddress: contractAddress,
        });
        const statsObj = cvToJSON(statsResponse).value?.value || {};
        const yieldVal = statsObj['total-yield']?.value || 0;
        setTotalYield(Number(yieldVal) / 1000000);
      } catch (e) {
        console.error("Failed to fetch total yield", e);
      }
    }
    fetchTotalYield();
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 },
    },
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-180px)]">
      <motion.div
        className="text-center max-w-4xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-lucky-orange/30 bg-lucky-orange/10 text-lucky-orange text-sm mb-8 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lucky-orange opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-lucky-orange"></span>
          </span>
          Live on Stacks Testnet
        </motion.div>

        <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-lucky-orange to-yellow-400">Stop Risking</span> Your Bitcoin.
          <br /> Start Putting It To Work.
        </motion.h1>

        <motion.p variants={itemVariants} className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          LuckyHive is a prize-linked savings protocol. Deposit <span className="text-white font-medium">STX</span> or <span className="text-white font-medium">sBTC</span>, keep 100% of your principal, and maintain a chance to win the weekly Bitcoin yield.
        </motion.p>
        
        {totalYield > 0 && (
          <motion.div variants={itemVariants} className="mb-10 inline-flex flex-col items-center justify-center bg-lucky-dark/50 border border-lucky-border/50 rounded-2xl px-6 py-4">
            <span className="text-sm text-gray-400 uppercase tracking-wider mb-1">The Swarm has generated</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-mono font-bold text-white text-glow">{totalYield.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <span className="text-lucky-orange font-bold">STX</span>
            </div>
            <span className="text-sm text-gray-400 mt-1">in total yield so far</span>
          </motion.div>
        )}

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
          {isLoggedIn ? (
            <Link href="/hive">
              <Button size="lg" className="w-full sm:w-auto gap-2 group">
                Enter The Hive
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          ) : (
            <Button size="lg" onClick={connect} className="w-full sm:w-auto gap-2 group">
              Connect Wallet to Join
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          )}
          <Link href="/docs">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Read the Whitepaper
            </Button>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left">
          <div className="glass-panel p-6">
            <div className="w-12 h-12 rounded-full bg-lucky-orange/20 flex items-center justify-center mb-4 text-lucky-orange">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white">No-Loss Savings</h3>
            <p className="text-sm text-gray-400">Your principal deposit is 100% safe. Only the yield generated by the pool is awarded as prizes. Withdraw anytime.</p>
          </div>
          
          <div className="glass-panel p-6">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
              <Coins className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white">Bitcoin Native Yield</h3>
            <p className="text-sm text-gray-400">Yield is generated through Stacks Proof-of-Transfer (PoX) and sBTC stacking, bringing real Bitcoin yield to the prize pool.</p>
          </div>
          
          <div className="glass-panel p-6">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4 text-green-400">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white">Provably Fair</h3>
            <p className="text-sm text-gray-400">Powered by the TWAB (Time-Weighted Average Balance) controller and verifiable randomness. No house edge.</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
