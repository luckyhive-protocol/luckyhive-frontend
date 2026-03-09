'use client';

import { useEffect, useState } from 'react';
import { Trophy, Medal, Crown, User } from 'lucide-react';
import { getTopBees, BeeHolder } from '@/lib/stacks';
import { motion } from 'framer-motion';

export default function Leaderboard() {
  const [topBees, setTopBees] = useState<BeeHolder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBees = async () => {
      const bees = await getTopBees();
      setTopBees(bees);
      setLoading(false);
    };
    fetchBees();
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2: return <Medal className="w-5 h-5 text-gray-300" />;
      case 3: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    const stx = parseInt(balance) / 1000000;
    return stx.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  if (loading) {
    return (
      <div className="glass-panel p-6 animate-pulse">
        <div className="h-8 bg-gray-700/50 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-700/30 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 overflow-hidden relative">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-lucky-orange" />
        <h3 className="text-xl font-display font-bold text-white">Top Bees</h3>
      </div>

      <div className="space-y-3">
        {topBees.length > 0 ? (
          topBees.map((bee, index) => (
            <motion.div
              key={bee.address}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center justify-between p-3 rounded-xl border ${
                index === 0 
                  ? 'bg-lucky-orange/10 border-lucky-orange/30' 
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 flex justify-center">
                  {getRankIcon(index + 1)}
                </div>
                <span className={`font-mono text-sm ${index === 0 ? 'text-white font-bold' : 'text-gray-400'}`}>
                  {formatAddress(bee.address)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-white font-bold">{formatBalance(bee.balance)}</span>
                <span className="text-xs text-lucky-orange ml-1">STX</span>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500 italic">
            No honey gathered yet...
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-white/5">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest text-center">
          Powered by Satoshi Swarm & Hiro API
        </p>
      </div>
    </div>
  );
}
