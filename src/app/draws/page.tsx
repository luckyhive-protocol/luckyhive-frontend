'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, ExternalLink, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchCallReadOnlyFunction, cvToJSON, uintCV } from '@stacks/transactions';
import { PRIZE_POOL_CONTRACT, STACKS_NETWORK } from '@/lib/stacks';

export default function DrawsPage() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isClaiming, setIsClaiming] = useState<number | null>(null);
  
  // Dynamic state replacing mock data
  const [currentPrize, setCurrentPrize] = useState<number>(0);
  
  interface PastDraw {
    id: number;
    winner: string;
    prize: number;
    date: string;
    txId?: string;
    claimed: boolean;
  }
  
  const [pastDraws, setPastDraws] = useState<PastDraw[]>([]);
  const [nextDrawBlock, setNextDrawBlock] = useState<number>(0);
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number>(0);
  const [isCountdownEstablished, setIsCountdownEstablished] = useState<boolean>(true);

  const fetchDrawsData = useCallback(async () => {
    try {
      const [contractAddress, contractName] = PRIZE_POOL_CONTRACT.split('.');

      // Default to picking a testnet API or mainnet API based on the STACKS_NETWORK
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiUrl = (STACKS_NETWORK as any).baseUrl;
      
      // Fetch current block height to estimate time
      const infoResponse = await fetch(`${apiUrl}/v2/info`);
      if (infoResponse.ok) {
        const infoData = await infoResponse.json();
        setCurrentBlockHeight(infoData.stacks_tip_height);
      }

      // Fetch total stats to get total-yield and draw-counter
      const statsResponse = await fetchCallReadOnlyFunction({
        network: STACKS_NETWORK,
        contractAddress,
        contractName,
        functionName: 'get-hive-stats',
        functionArgs: [],
        senderAddress: contractAddress, // using contract address as read-only sender
      });
      const statsObj = cvToJSON(statsResponse).value?.value || {};
      
      const yieldVal = statsObj['total-yield']?.value || 0;
      setCurrentPrize(Number(yieldVal) / 1000000);
      
      const totalDeposits = Number(statsObj['total-deposits']?.value || 0);
      const drawCounter = Number(statsObj['draw-counter']?.value || 0);
      
      setIsCountdownEstablished(totalDeposits > 0 || drawCounter > 0);
      
      const nextDraw = Number(statsObj['next-draw-block']?.value || 0);
      setNextDrawBlock(nextDraw);

      // Fetch past draws (up to 10 recent draws for display)
      const drawsList = [];
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
            date: `Block #${drawData['stacks-block-height']?.value}`, // Using block height since exact timestamp isn't stored
            winner: drawData.winner?.value || 'Unknown',
            prize: Number(drawData['prize-amount']?.value) / 1000000,
            claimed: drawData.claimed?.value === true,
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
    // Poll for updates every minute
    const interval = setInterval(fetchDrawsData, 60000);
    return () => clearInterval(interval);
  }, [fetchDrawsData]);

  useEffect(() => {
    if (nextDrawBlock > 0 && currentBlockHeight > 0 && isCountdownEstablished) {
      // Estimate time based on ~10 minutes per Stacks block
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
  }, [nextDrawBlock, currentBlockHeight, isCountdownEstablished]);

  const handleClaim = (drawId: number) => {
    setIsClaiming(drawId);
    // TODO: Implement actual contract call for claim-prize
    toast.error('Claim function requires smart contract interaction. Not fully implemented in UI yet.');
    setTimeout(() => {
      setIsClaiming(null);
    }, 2000);
  };

  const handleRequestDraw = () => {
    toast.loading('Requesting draw via VRF...', { duration: 2000 });
    // TODO: Implement actual contract call for award-queen-bee
    setTimeout(() => {
      toast.success('Draw requested! Waiting for reveal block.');
    }, 2500);
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

          {isCountdownEstablished ? (
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

        {/* Info Card */}
        <motion.div variants={itemVariants} className="md:w-1/3 space-y-4">
          <div className="glass-panel p-6 border-l-4 border-l-lucky-accent">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-lucky-accent" />
              Draw Mechanics
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Draws happen every ~7 days based on Stacks blocks. Anyone can trigger an eligible draw and claim an incentive bounty.
            </p>
          </div>
          
          <div className="glass-panel p-6 border-l-4 border-l-lucky-orange">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-lucky-orange" />
              Winning Odds
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your odds are directly proportional to your Time-Weighted Average Balance (TWAB) vs the total pool TWAB.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Past Draws */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Past Draws</h2>
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isMainnet = (STACKS_NETWORK as any).chainId === 1;
            window.open(`https://explorer.hiro.so/address/${PRIZE_POOL_CONTRACT}?chain=${isMainnet ? 'mainnet' : 'testnet'}`, '_blank');
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
                    <th className="p-4 text-right pr-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pastDraws.map((draw) => (
                    <tr key={draw.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 pl-6">
                        <span className="font-mono text-gray-300">#{draw.id}</span>
                      </td>
                      <td className="p-4 text-sm text-gray-400">{draw.date}</td>
                      <td className="p-4">
                        <span className="text-white font-medium">{draw.prize.toLocaleString(undefined, { maximumFractionDigits: 2 })} STX</span>
                      </td>
                      <td className="p-4">
                        <span className="text-lucky-orange text-sm font-mono bg-lucky-orange/10 px-2 py-1 rounded" title={draw.winner}>
                          {truncateAddress(draw.winner)}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-6">
                        {draw.claimed ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                            Claimed
                          </span>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleClaim(draw.id)}
                            disabled={isClaiming === draw.id}
                            className="h-8 text-xs border-lucky-accent text-lucky-accent hover:bg-lucky-accent hover:text-lucky-dark"
                          >
                            {isClaiming === draw.id ? 'Claiming...' : 'Claim For Winner'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

