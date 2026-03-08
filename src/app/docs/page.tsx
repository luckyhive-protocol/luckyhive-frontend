'use client';

import { motion } from 'framer-motion';
import { BookOpen, ShieldCheck, Zap, Coins } from 'lucide-react';

export default function DocsPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      className="max-w-4xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center gap-4 mb-8">
        <BookOpen className="w-10 h-10 text-lucky-orange" />
        <h1 className="text-4xl font-display font-bold text-white">How LuckyHive Works</h1>
      </div>

      <motion.p variants={itemVariants} className="text-xl text-gray-400 mb-12 leading-relaxed">
        LuckyHive is a decentralized, no-loss prize savings protocol built natively on the Stacks blockchain. 
        By combining Bitcoin&apos;s fundamental security with Stacks&apos; smart contracts and native yield generation (PoX/sBTC), 
        LuckyHive creates a sustainable, risk-free prize pool game.
      </motion.p>

      <div className="space-y-8">
        <motion.div variants={itemVariants} className="glass-panel p-8">
          <div className="flex items-start gap-4">
            <ShieldCheck className="w-8 h-8 text-lucky-accent flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-2xl font-bold text-white mb-3">1. No-Loss Savings (100% Principal Protection)</h3>
              <p className="text-gray-400 leading-relaxed">
                When you deposit STX or sBTC into LuckyHive, your funds are secured by audited Clarity smart contracts. 
                Unlike a lottery where tickets cost money, in LuckyHive you never lose your initial deposit. 
                You can withdraw your exact principal at any time, with no hidden fees or lockups.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-panel p-8">
          <div className="flex items-start gap-4">
            <Coins className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-2xl font-bold text-white mb-3">2. Bitcoin Native Yield Generation</h3>
              <p className="text-gray-400 leading-relaxed">
                The protocol aggregates all deposited STX and sBTC, routing them to &quot;Yield Vaults.&quot; 
                These vaults participate in Stacks Proof-of-Transfer (PoX) and sBTC DeFi strategies to generate secure, underlying yield. 
                Instead of distributing this yield equally to all depositors, the protocol pools it together.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-panel p-8">
          <div className="flex items-start gap-4">
            <Zap className="w-8 h-8 text-lucky-orange flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-2xl font-bold text-white mb-3">3. Provably Fair Weekly Draws</h3>
              <p className="text-gray-400 leading-relaxed mb-4">
                Periodically (roughly every week, based on Stacks block headers), the pooled yield is awarded to a randomly selected winner.
                The process is 100% transparent and runs completely on-chain via the <code>prize-pool.clar</code> and <code>auction-manager.clar</code> contracts.
              </p>
              <div className="bg-lucky-dark/50 rounded-xl p-4 border border-lucky-border/30">
                <h4 className="text-white font-medium mb-2">How are the odds calculated?</h4>
                <p className="text-sm text-gray-400">
                  Winning odds are determined by your <strong>Time-Weighted Average Balance (TWAB)</strong>. 
                  The longer you keep your funds deposited, and the higher the amount, the higher your TWAB. 
                  This ring-buffer pattern ensures fair odds that cannot be manipulated by depositing right before a draw and withdrawing immediately after.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="mt-16 text-center pb-12">
        <h2 className="text-2xl font-display font-bold text-white mb-4">Ready to start earning?</h2>
        <a href="/hive" className="inline-block glass-button px-8 py-4 text-lg">
          Deposit into The Hive
        </a>
      </motion.div>
    </motion.div>
  );
}
