'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ShieldCheck, Zap, Coins, BarChart3, Users, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DocsPage() {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      className="max-w-4xl mx-auto pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <BookOpen className="w-10 h-10 text-lucky-orange" />
          <h1 className="text-4xl font-display font-bold text-white">How LuckyHive Works</h1>
        </div>
        
        <Button 
          variant={showAdvanced ? "default" : "outline"} 
          className={showAdvanced ? "bg-lucky-orange text-white hover:bg-lucky-orange/80" : "border-lucky-orange/50 text-lucky-orange hover:bg-lucky-orange/10"}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? "View Simple Overview" : "View Technical Whitepaper"}
        </Button>
      </div>

      <motion.p variants={itemVariants} className="text-xl text-gray-400 mb-12 leading-relaxed">
        LuckyHive is a decentralized, no-loss prize savings protocol built natively on the Stacks blockchain. 
        By combining Bitcoin&apos;s fundamental security with Stacks&apos; smart contracts and native yield generation (PoX/sBTC), 
        LuckyHive creates a sustainable, risk-free prize pool game.
      </motion.p>

      <AnimatePresence mode="wait">
        {!showAdvanced ? (
          <motion.div
            key="simple"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-8"
          >
            <motion.div variants={itemVariants} className="glass-panel p-8">
              <div className="flex items-start gap-4">
                <ShieldCheck className="w-8 h-8 text-lucky-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-2xl font-bold text-white mb-3">1. No-Loss Savings (100% Principal Protection)</h3>
                  <p className="text-gray-400 leading-relaxed">
                    When you deposit STX or sBTC into LuckyHive, your funds are secured by audited Clarity smart contracts.
                    <strong className="text-lucky-accent block mt-2 mb-2">You NEVER lose your savings.</strong>
                    Unlike a lottery where tickets cost money, in LuckyHive you only pool the yield. 
                    You can withdraw your exact principal at any time, with no hidden fees or lockups. You lose nothing, but gain the opportunity to win the entire community&apos;s yield.
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
                    The process is 100% transparent and runs completely on-chain via the <code>luckyhive-prize-pool.clar</code> and <code>luckyhive-auction-manager.clar</code> contracts.
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
          </motion.div>
        ) : (
          <motion.div
            key="advanced"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-8"
          >
            <div className="mb-4">
              <h2 className="text-3xl font-display font-bold text-white mb-2">Technical Whitepaper: System Dynamics</h2>
              <p className="text-gray-400">Deep-dive into the game theory, economic sustainability, and architectural guarantees of the LuckyHive protocol.</p>
            </div>

            <motion.div variants={itemVariants} className="glass-panel p-8 border-lucky-orange/30">
              <div className="flex items-start gap-4">
                <BarChart3 className="w-8 h-8 text-lucky-orange flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-2xl font-bold text-white mb-3">The 3-Tiered Yield Distribution Strategy</h3>
                  <p className="text-gray-400 leading-relaxed mb-6">
                    A critical flaw in early No-Loss Lottery designs is the &quot;Whale vs. Swarm&quot; dilemma. If large capital providers (Whales) mathematically dominate the singular prize pool, smaller retail participants (Minnows/The Swarm) endure <i>probability fatigue</i> and inevitably churn, destabilizing the protocol&apos;s TVL.
                  </p>
                  <p className="text-gray-400 leading-relaxed mb-6">
                    LuckyHive solves this by transforming the traditional lottery into a gamified Stacks savings account. The ~5% APY generated by underlying PoX Stacking is divided into three distinct psychological and economic tranches:
                  </p>
                  
                  <div className="space-y-4">
                    <div className="bg-lucky-dark/60 rounded-xl p-5 border border-lucky-border/40">
                      <h4 className="text-lg font-bold text-white mb-1">1. The &quot;Queen Bee&quot; Grand Prize (1.5% Yield Allocation)</h4>
                      <p className="text-sm text-gray-400">
                        <strong>Mechanism:</strong> A single, high-magnitude weekly drawing.<br/>
                        <strong>Psychology:</strong> Leverages the Magnitude Effect. Large potential payouts create virality, social proof, and aspirational marketing logic. It operates as the protocol&apos;s core hook.
                      </p>
                    </div>
                    
                    <div className="bg-lucky-dark/60 rounded-xl p-5 border border-lucky-border/40">
                      <h4 className="text-lg font-bold text-white mb-1">2. &quot;Nectar Drops&quot; Micro-Prizes (1.5% Yield Allocation)</h4>
                      <p className="text-sm text-gray-400">
                        <strong>Mechanism:</strong> High-frequency, smaller-scale prizes awarded continuously, utilizing logarithmic ticket generation decay to prevent Whale soaking.<br/>
                        <strong>Psychology:</strong> Solves probability fatigue. By providing systematic dopamine hits to low-capital depositors, it prevents churn and validates protocol liveness.
                      </p>
                    </div>

                    <div className="bg-lucky-dark/60 rounded-xl p-5 border border-lucky-border/40">
                      <h4 className="text-lg font-bold text-white mb-1">3. &quot;Sticky Honey&quot; Baseline Drip (1.0% Yield Allocation)</h4>
                      <p className="text-sm text-gray-400">
                        <strong>Mechanism:</strong> A guaranteed, flat base yield mathematically accrued to all depositors simply for remaining in the Hive.<br/>
                        <strong>Psychology:</strong> Removes standard opportunity cost anxiety. Users are earning a baseline saving drip <i>plus</i> lottery tickets. It stabilizes ecosystem TVL by functioning as a legitimate DeFi savings standard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-panel p-8">
              <div className="flex items-start gap-4">
                <Network className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-2xl font-bold text-white mb-3">Time-Weighted Average Balance (TWAB) Security</h3>
                  <p className="text-gray-400 leading-relaxed mb-4">
                    The protocol implements a comprehensive ring-buffer data structure within the <code>luckyhive-twab-controller.clar</code> to record state snapshots of user balances over time. 
                    This guarantees flash-loan resistance. Malicious actors cannot deposit large sums of capital directly prior to a drawing block, as their time-locked weight will register near zero. The mathematical fairness protects both the Swarm and long-term Queen Bee liquidity providers.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-panel p-8">
              <div className="flex items-start gap-4">
                <Users className="w-8 h-8 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-2xl font-bold text-white mb-3">Decentralized Feeder Automation (The 1% Keepers)</h3>
                  <p className="text-gray-400 leading-relaxed mb-4">
                    LuckyHive operations are autonomous and trustless. The protocol retains a 1% protocol fee, half of which is utilized as a built-in MEV / Keeper incentive (<code>FEEDER_INCENTIVE_PERCENTAGE</code>).
                  </p>
                  <p className="text-gray-400 leading-relaxed">
                    Decentralized bot operators are financially incentivized by the smart contract to pay the gas necessary to trigger the <code>award-queen-bee</code> draws. This creates an autonomous crank, ensuring the protocol remains continuously operational without centralized reliance on the founding team&apos;s infrastructure.
                  </p>
                </div>
              </div>
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={itemVariants} className="mt-16 text-center">
        <h2 className="text-2xl font-display font-bold text-white mb-4">Ready to start earning?</h2>
        <a href="/hive" className="inline-block glass-button px-8 py-4 text-lg">
          Deposit into The Hive
        </a>
      </motion.div>
    </motion.div>
  );
}
