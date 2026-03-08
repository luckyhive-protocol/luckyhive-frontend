'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, ExternalLink, Flame } from 'lucide-react';
import toast from 'react-hot-toast';

// Mock data
const NEXT_DRAW_TIME = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000); // 3 days, 5 hours
const CURRENT_PRIZE = 1250.75;

const PAST_DRAWS = [
  { id: 42, date: 'Mar 1, 2026', winner: 'ST1PQ...SRTP', prize: 1100.50, claimed: true },
  { id: 41, date: 'Feb 22, 2026', winner: 'ST2RE...9MLK', prize: 1050.25, claimed: true },
  { id: 40, date: 'Feb 15, 2026', winner: 'ST3WX...5QZA', prize: 980.00, claimed: true },
  { id: 39, date: 'Feb 8, 2026', winner: 'ST4YD...2PBN', prize: 1120.80, claimed: false },
];

export default function DrawsPage() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isClaiming, setIsClaiming] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = NEXT_DRAW_TIME.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
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
  }, []);

  const handleClaim = (drawId: number) => {
    setIsClaiming(drawId);
    setTimeout(() => {
      setIsClaiming(null);
      toast.success('Prize claimed successfully!');
    }, 2000);
  };

  const handleRequestDraw = () => {
    toast.loading('Requesting draw via VRF...', { duration: 2000 });
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
              Draw #43
            </div>
          </div>

          <div className="mb-8">
            <p className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">Estimated Prize</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-white text-glow">{CURRENT_PRIZE.toLocaleString()}</span>
              <span className="text-xl text-lucky-orange font-medium">STX</span>
            </div>
          </div>

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

          <Button onClick={handleRequestDraw} className="w-full gap-2">
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
          <Button variant="ghost" size="sm" className="gap-2">
            View All On Explorer <ExternalLink className="w-4 h-4" />
          </Button>
        </div>

        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
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
                {PAST_DRAWS.map((draw) => (
                  <tr key={draw.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 pl-6">
                      <span className="font-mono text-gray-300">#{draw.id}</span>
                    </td>
                    <td className="p-4 text-sm text-gray-400">{draw.date}</td>
                    <td className="p-4">
                      <span className="text-white font-medium">{draw.prize.toFixed(2)} STX</span>
                    </td>
                    <td className="p-4">
                      <span className="text-lucky-orange text-sm font-mono bg-lucky-orange/10 px-2 py-1 rounded">
                        {draw.winner}
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
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
