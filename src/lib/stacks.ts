import { STACKS_TESTNET } from '@stacks/network';

// Use a fallback address for local development, or environment variables in production
export const CONTRACT_DEPLOYER = process.env.NEXT_PUBLIC_CONTRACT_DEPLOYER || 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE'; 

export const STACKS_NETWORK = STACKS_TESTNET;

export const GET_HIVE_STATS_FUNCTION = 'get-hive-stats';
export const GET_USER_DEPOSIT_FUNCTION = 'get-user-deposit';
export const STORE_IN_HIVE_FUNCTION = 'store-in-hive';
export const LEAVE_HIVE_FUNCTION = 'leave-hive';

export const PRIZE_POOL_CONTRACT = `${CONTRACT_DEPLOYER}.prize-pool`;
