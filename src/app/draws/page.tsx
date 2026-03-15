'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, ExternalLink, Flame, Star, ShieldCheck, Zap, AlertTriangle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWallet } from '@/components/providers/wallet-provider';
import { PRIZE_POOL_CONTRACT, STACKS_NETWORK, HIRO_API_URL, IS_MAINNET, CLAIM_DEADLINE_BLOCKS } from '@/lib/stacks';
import { request } from '@stacks/connect';
import { fetchCallReadOnlyFunction, cvToJSON, uintCV, PostConditionMode } from '@stacks/transactions';

interface PastDraw {
  id: number;
  winner: string;
  prize: number;
  date: string;
  txId?: string;
  claimed: boolean;
  blockHeight: number;
  winnerTwab: number;
  totalTwab: number;
  drawStartBlock: number;
}

export default function DrawsPage() {
  const { stxAddress } = useWallet();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isClaiming, setIsClaiming] = useState<number | null>(null);
  const [isAutoClaimingId, setIsAutoClaimingId] = useState<number | null>(null);
  const [currentPrize, setCurrentPrize] = useState<number>(0);
  const [pastDraws, setPastDraws] = useState<PastDraw[]>([]);
  const [nextDrawBlock, setNextDrawBlock] = useState<number>(0);
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number>(0);
  const [isCountdownEstablished, setIsCountdownEstablished] = useState<boolean>(true);
  const [expandedDraw, setExpandedDraw] = useState<number | null>(null);

  const fetchDrawsData = useCallback(async () => {
    try {
      const [contractAddress, contractName] = PRIZE_POOL_CONTRACT.split('.');

      const infoResponse = await fetch(`${HIRO_API_URL}/v2/info`);
      if (infoResponse.ok) {
        const infoData = await infoResponse.json();
        setCurrentBlockHeight(infoData.stacks_tip_height);
      }

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
      setCurrentPrize(Number(yieldVal) / 1000000);

      const totalDeposits = Number(statsObj['total-deposits']?.value || 0);
      const drawCounter = Number(statsObj['draw-counter']?.value || 0);

      setIsCountdownEstablished(totalDeposits > 0 || drawCounter > 0);

      const nextDraw = Number(statsObj['next-draw-block']?.value || 0);
      setNextDrawBlock(nextDraw);

      // Fetch past draws with TWAB verification data
      const drawsList: PastDraw[] = [];
      const fetchCount = Math.min(10, drawCounter);

      for (let i = drawCounter; i > drawCounter - fetchCount; i--) {
        const drawResponse = await fetchCallReadOnlyFunction({
          network: STACKS_NETWORK,
          contractAddress,
          contractName,
          functionName: 'get-draw-info',
          functionArgs: [uintCV(i)],
          senderAddress: contractAddress,
        });
        const drawData = cvToJSON(drawResponse).value?.value;
        if (drawData) {
          drawsList.push({
            id: i,
            date: `Block #${drawData['block-height']?.value || '0'}`,
            winner: drawData.winner?.value || 'Unknown',
            prize: Number(drawData['prize-amount']?.value || 0) / 1000000,
            claimed: drawData.claimed?.value === true,
            blockHeight: Number(drawData['block-height']?.value || 0),
            winnerTwab: Number(drawData['winner-twab']?.value || 0),
            totalTwab: Number(drawData['total-twab']?.value || 0),
            drawStartBlock: Number(drawData['draw-start-block']?.value || 0),
          });
        }
      }
      setPastDraws(drawsList);
    } catch (error) {
      console.error('Error fetching draws data:', error);
    }
  }, []);

  useEffect(() => {
    fetchDrawsData();
    const interval = setInterval(fetchDrawsData, 60000);
    return () => clearInterval(interval);
  }, [fetchDrawsData]);

  // Derived: the draw target block has already passed without a draw being triggered
  const isDrawOverdue = useMemo(() => {
    return nextDrawBlock > 0 && currentBlockHeight > 0 && currentBlockHeight >= nextDrawBlock;
  }, [nextDrawBlock, currentBlockHeight]);

  useEffect(() => {
    // Skip countdown when draw is overdue -- the timer section will show an overdue message instead
    if (isDrawOverdue) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }
    if (nextDrawBlock > 0 && currentBlockHeight > 0 && isCountdownEstablished) {
      const blocksRemaining = Math.max(0, nextDrawBlock - currentBlockHeight);
      const estimatedSecondsRemaining = blocksRemaining * 10 * 60;
      const targetTime = new Date().getTime() + estimatedSecondsRemaining * 1000;

      const timer = setInterval(() => {
        const now = new Date().getTime();
        const distance = targetTime - now;
        if (distance < 0) {
          clearInterval(timer);
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          return;
        }
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [nextDrawBlock, currentBlockHeight, isCountdownEstablished, isDrawOverdue]);

  // Self-claim: only the winner can call this
  const handleClaim = async (drawId: number) => {
    setIsClaiming(drawId);
    const toastId = toast.loading(`Claiming prize for Draw #${drawId}...`, { style: { borderRadius: '10px', background: '#333', color: '#fff' } });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // @ts-expect-error: type mismatch between stacks/connect and our payload
      const response = await request('stx_callContract', {
        network: IS_MAINNET ? 'mainnet' : 'testnet',
        contract: PRIZE_POOL_CONTRACT,
        functionName: 'claim-prize',
        functionArgs: [uintCV(drawId)],
        postConditionMode: PostConditionMode.Allow,
      });
      if (response?.txid) {
        toast.dismiss(toastId);
        toast.success(`Claim broadcasted! TXID: ${response.txid.substring(0, 8)}...`, { duration: 5000, style: { borderRadius: '10px', background: '#333', color: '#fff' } });
        setPastDraws(prev => prev.map(d => d.id === drawId ? { ...d, claimed: true, txId: response.txid } : d));
      } else {
        toast.dismiss(toastId);
      }
    } catch (e: unknown) {
      toast.dismiss(toastId);
      const msg = e instanceof Error ? e.message : '';
      if (msg.toLowerCase().includes('cancel')) {
        toast.error('Transaction cancelled', { style: { borderRadius: '10px', background: '#333', color: '#fff' } });
      } else {
        console.error(e);
        toast.error('Error claiming prize', { style: { borderRadius: '10px', background: '#333', color: '#fff' } });
      }
    } finally {
      setIsClaiming(null);
    }
  };

  // Auto-claim: anyone can claim for the winner and earn 1% fee
  const handleAutoClaim = async (drawId: number) => {
    setIsAutoClaimingId(drawId);
    const toastId = toast.loading(`Auto-claiming Draw #${drawId} (you earn 1% fee)...`, { style: { borderRadius: '10px', background: '#333', color: '#fff' } });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // @ts-expect-error: type mismatch between stacks/connect and our payload
      const response = await request('stx_callContract', {
        network: IS_MAINNET ? 'mainnet' : 'testnet',
        contract: PRIZE_POOL_CONTRACT,
        functionName: 'claim-prize-for',
        functionArgs: [uintCV(drawId)],
        postConditionMode: PostConditionMode.Allow,
      });
      if (response?.txid) {
        toast.dismiss(toastId);
        toast.success(`Auto-claim broadcasted! You earned 1% of the prize. TXID: ${response.txid.substring(0, 8)}...`, { duration: 5000, style: { borderRadius: '10px', background: '#333', color: '#fff' } });
        setPastDraws(prev => prev.map(d => d.id === drawId ? { ...d, claimed: true, txId: response.txid } : d));
      } else {
        toast.dismiss(toastId);
      }
    } catch (e: unknown) {
      toast.dismiss(toastId);
      const msg = e instanceof Error ? e.message : '';
      if (msg.toLowerCase().includes('cancel')) {
        toast.error('Transaction cancelled', { style: { borderRadius: '10px', background: '#333', color: '#fff' } });
      } else {
        console.error(e);
        toast.error('Error auto-claiming prize', { style: { borderRadius: '10px', background: '#333', color: '#fff' } });
      }
    } finally {
      setIsAutoClaimingId(null);
    }
  };

  const handleRequestDraw = async () => {
    toast.error('Draws are triggered automatically by the LuckyHive Crank bot with commit-reveal randomness to ensure provably fair TWAB-weighted selection.', { duration: 6000, style: { borderRadius: '10px', background: '#333', color: '#fff' } });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const truncateAddress = (addr: string) => {
    if (!addr || addr === 'Unknown') return addr;
    if (addr.length < 12) return addr;
    return `${addr.substring(0, 5)}...${addr.substring(addr.length - 4)}`;
  };

  const getClaimExpiryBlock = (draw: PastDraw) => draw.blockHeight + CLAIM_DEADLINE_BLOCKS;

  const isDrawExpired = (draw: PastDraw) =>
    currentBlockHeight > 0 && currentBlockHeight > getClaimExpiryBlock(draw);

  const getExpiryCountdown = (draw: PastDraw) => {
    if (currentBlockHeight <= 0) return '';
    const blocksLeft = Math.max(0, getClaimExpiryBlock(draw) - currentBlockHeight);
    if (blocksLeft === 0) return 'Expired';
    const hours = Math.floor((blocksLeft * 10) / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h left`;
    return `${hours}h left`;
  };

  const getWinProbability = (draw: PastDraw) => {
    if (draw.totalTwab === 0) return '0';
    return ((draw.winnerTwab / draw.totalTwab) * 100).toFixed(2);
  };

  return (
    <motion.div
      className="max-w-5xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex flex-col md:flex-row gap-8 mb-12">
        {/* Next Draw Card */}
        <motion.div variants={itemVariants} className="flex-1 glass-panel p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-lucky-orange/5 rounded-full blur-3xl -mt-20 -mr-20"></div>

          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-8 h-8 text-lucky-orange" />
            <h2 className="text-3xl font-display font-bold text-white">Next Draw</h2>
            <div className="ml-auto px-3 py-1 bg-white/5 rounded-full border border-white/10 text-xs font-mono text-gray-300">
              {isCountdownEstablished ? `Target Block #${nextDrawBlock}` : 'TBD'}
            </div>
          </div>

          <div className="mb-8">
            <p className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">Estimated Prize</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-white text-glow">{currentPrize.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <span className="text-xl text-lucky-orange font-medium">STX</span>
            </div>
          </div>

          {isDrawOverdue && isCountdownEstablished && currentPrize === 0 ? (
            <div className="bg-lucky-dark/50 rounded-xl p-6 border border-dashed border-lucky-orange/30 text-center mb-8">
              <p className="text-lucky-orange font-semibold text-lg mb-2">Draw round complete — awaiting yield.</p>
              <p className="text-gray-400 text-sm mb-4">The next draw triggers once yield has accumulated in the pool. Deposit STX now to lock in your position for the next round.</p>
              <Link href="/hive">
                <Button size="sm" className="gap-2 group">
                  Deposit STX Now
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          ) : isDrawOverdue && isCountdownEstablished && currentPrize > 0 ? (
            <div className="bg-lucky-dark/50 rounded-xl p-6 border border-dashed border-green-500/30 text-center mb-8">
              <p className="text-green-400 font-semibold text-lg mb-2">Draw is Imminent!</p>
              <p className="text-gray-400 text-sm mb-4">The target block has been reached and yield is secured. The Crank Bot is preparing to trigger the draw. Good luck!</p>
            </div>
          ) : isCountdownEstablished ? (
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Days', value: timeLeft.days },
                { label: 'Hours', value: timeLeft.hours },
                { label: 'Mins', value: timeLeft.minutes },
                { label: 'Secs', value: timeLeft.seconds }
              ].map((unit, i) => (
                <div key={i} className="bg-lucky-dark rounded-xl p-3 border border-lucky-border/30 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white font-mono">{unit.value.toString().padStart(2, '0')}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase mt-1">{unit.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-lucky-dark/50 rounded-xl p-6 border border-dashed border-lucky-border/50 text-center mb-8">
              <p className="text-gray-400 font-medium tracking-wide">Awaiting first deposit to begin the countdown...</p>
            </div>
          )}

          <Button onClick={handleRequestDraw} disabled={!isCountdownEstablished} className="w-full gap-2">
            <Flame className="w-4 h-4" />
            Trigger Draw (Bounty: 5 STX)
          </Button>
        </motion.div>

        {/* Info Cards */}
        <motion.div variants={itemVariants} className="md:w-1/3 space-y-4">
          <div className="glass-panel p-6 border-l-4 border-l-lucky-accent">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-lucky-accent" />
              Provably Fair
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Winners are verified on-chain using TWAB data. Every draw logs the winner&apos;s time-weighted balance, total pool TWAB, and the verifiable random seed. Anyone can audit.
            </p>
          </div>

          <div className="glass-panel p-6 border-l-4 border-l-lucky-orange">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-lucky-orange" />
              Claim Window
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Winners have ~7 days (1008 blocks) to claim prizes. After expiry, unclaimed prizes return to the yield pool for future draws.
            </p>
          </div>

          <div className="glass-panel p-6 border-l-4 border-l-blue-400">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-400" />
              Auto-Claim
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Anyone can claim a prize on behalf of the winner and earn a 1% fee. Help the swarm and earn rewards.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Past Draws */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Past Draws</h2>
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => {
            window.open(`https://explorer.hiro.so/address/${PRIZE_POOL_CONTRACT}?chain=${IS_MAINNET ? 'mainnet' : 'testnet'}`, '_blank');
          }}>
            View Contract On Explorer <ExternalLink className="w-4 h-4" />
          </Button>
        </div>

        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            {pastDraws.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No past draws found on the network. The Hive is waiting for its first Queen Bee!
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-lucky-dark/80 border-b border-lucky-border/30 text-sm font-medium text-gray-400">
                    <th className="p-4 pl-6">Draw</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Prize</th>
                    <th className="p-4">Winner</th>
                    <th className="p-4">Win Odds</th>
                    <th className="p-4 text-right pr-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pastDraws.map((draw) => {
                    const isUserWinner = stxAddress && draw.winner === stxAddress;
                    const expired = !draw.claimed && isDrawExpired(draw);
                    return (
                      <tr
                        key={draw.id}
                        className={`hover:bg-white/[0.02] transition-colors cursor-pointer ${
                          isUserWinner ? 'bg-lucky-orange/5 border-l-2 border-l-lucky-orange' : ''
                        }`}
                        onClick={() => setExpandedDraw(expandedDraw === draw.id ? null : draw.id)}
                      >
                        <td className="p-4 pl-6">
                          <span className="font-mono text-gray-300">#{draw.id}</span>
                        </td>
                        <td className="p-4 text-sm text-gray-400">{draw.date}</td>
                        <td className="p-4">
                          <span className="text-white font-medium">{draw.prize.toLocaleString(undefined, { maximumFractionDigits: 2 })} STX</span>
                        </td>
                        <td className="p-4">
                          {isUserWinner ? (
                            <span className="inline-flex items-center gap-1.5 text-lucky-orange text-sm font-bold bg-lucky-orange/20 px-3 py-1 rounded-full border border-lucky-orange/30">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              You Won!
                            </span>
                          ) : (
                            <span className="text-lucky-orange text-sm font-mono bg-lucky-orange/10 px-2 py-1 rounded" title={draw.winner}>
                              {truncateAddress(draw.winner)}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-gray-400 font-mono">{getWinProbability(draw)}%</span>
                        </td>
                        <td className="p-4 text-right pr-6">
                          {draw.claimed ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                              Claimed
                            </span>
                          ) : expired ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                              <AlertTriangle className="w-3 h-3" />
                              Expired
                            </span>
                          ) : isUserWinner ? (
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-xs text-yellow-400/70">{getExpiryCountdown(draw)}</span>
                              <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleClaim(draw.id); }}
                                disabled={isClaiming === draw.id}
                                className="h-8 text-xs bg-lucky-orange hover:bg-lucky-orange/90 text-white font-bold shadow-lg shadow-lucky-orange/20"
                              >
                                {isClaiming === draw.id ? 'Claiming...' : 'Claim Prize'}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-xs text-yellow-400/70">{getExpiryCountdown(draw)}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => { e.stopPropagation(); handleAutoClaim(draw.id); }}
                                disabled={isAutoClaimingId === draw.id}
                                className="h-8 text-xs border-blue-400/30 text-blue-400 hover:bg-blue-400/10"
                              >
                                <Zap className="w-3 h-3 mr-1" />
                                {isAutoClaimingId === draw.id ? 'Claiming...' : 'Auto-Claim (1% fee)'}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Expanded Draw Verification Details */}
        {expandedDraw && (() => {
          const draw = pastDraws.find(d => d.id === expandedDraw);
          if (!draw) return null;
          return (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 glass-panel p-6 border-l-4 border-l-lucky-accent"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-lucky-accent" />
                Draw #{draw.id} Verification Data
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Winner TWAB</p>
                  <p className="text-sm font-mono text-white">{(draw.winnerTwab / 1000000).toLocaleString()} STX</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total TWAB</p>
                  <p className="text-sm font-mono text-white">{(draw.totalTwab / 1000000).toLocaleString()} STX</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Draw Period</p>
                  <p className="text-sm font-mono text-white">#{draw.drawStartBlock} - #{draw.blockHeight}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Claim Deadline</p>
                  <p className={`text-sm font-mono ${isDrawExpired(draw) ? 'text-red-400' : 'text-white'}`}>
                    Block #{getClaimExpiryBlock(draw)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-4 pt-3 border-t border-lucky-border/30">
                All verification data is stored on-chain and can be independently verified by anyone. The winner&apos;s TWAB was {getWinProbability(draw)}% of the total pool during the draw period.
              </p>
            </motion.div>
          );
        })()}
      </motion.div>
    </motion.div>
  );
}
