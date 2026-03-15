import { STACKS_TESTNET } from '@stacks/network';

// Use a fallback address for local development, or environment variables in production
export const CONTRACT_DEPLOYER = process.env.NEXT_PUBLIC_CONTRACT_DEPLOYER || 'ST1P9GBWSRSXMNTEVG4J03W282928MEPHJKE81NQP'; 

export const STACKS_NETWORK = STACKS_TESTNET;

// Reliable API URL - @stacks/network v7 stores it at client.baseUrl, not baseUrl
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const HIRO_API_URL = (STACKS_NETWORK as any).client?.baseUrl || 'https://api.testnet.hiro.so';

// Mainnet check - v7 uses transactionVersion (0 = mainnet, 128 = testnet)
export const IS_MAINNET = STACKS_NETWORK.transactionVersion === 0;

export const GET_HIVE_STATS_FUNCTION = 'get-hive-stats';
export const GET_USER_DEPOSIT_FUNCTION = 'get-user-deposit';
export const STORE_IN_HIVE_FUNCTION = 'store-in-hive';
export const LEAVE_HIVE_FUNCTION = 'leave-hive';
export const GET_DRAW_INFO_FUNCTION = 'get-draw-info';
export const CLAIM_PRIZE_FUNCTION = 'claim-prize';
export const CLAIM_PRIZE_FOR_FUNCTION = 'claim-prize-for';
export const CHECK_SOLVENCY_FUNCTION = 'check-solvency';
export const GET_REFERRAL_INFO_FUNCTION = 'get-referral-info';
export const RECLAIM_EXPIRED_FUNCTION = 'reclaim-expired-prize';

// Claim deadline in blocks (~7 days at ~10 min/block)
export const CLAIM_DEADLINE_BLOCKS = 1008;

export const PRIZE_POOL_CONTRACT = `${CONTRACT_DEPLOYER}.luckyhive-prize-pool` as `${string}.${string}`;
export const HONEYCOMB_TOKEN_CONTRACT = `${CONTRACT_DEPLOYER}.luckyhive-honeycomb` as `${string}.${string}`;
export const TWAB_CONTROLLER_CONTRACT = `${CONTRACT_DEPLOYER}.luckyhive-twab-controller` as `${string}.${string}`;
export const VAULT_FACTORY_CONTRACT = `${CONTRACT_DEPLOYER}.luckyhive-vault` as `${string}.${string}`;
export const AUCTION_MANAGER_CONTRACT = `${CONTRACT_DEPLOYER}.luckyhive-auction-manager` as `${string}.${string}`;
export const GOVERNANCE_CONTRACT = `${CONTRACT_DEPLOYER}.luckyhive-governance` as `${string}.${string}`;
export const AUTH_PROVIDER_CONTRACT = `${CONTRACT_DEPLOYER}.luckyhive-auth-provider` as `${string}.${string}`;

export interface BeeHolder {
  address: string;
  balance: string;
}

interface HiroHolderResponse {
  address: string;
  balance: string;
}

export async function getTopBees(): Promise<BeeHolder[]> {
  try {
    const response = await fetch(
      `https://api.testnet.hiro.so/extended/v1/tokens/ft/${HONEYCOMB_TOKEN_CONTRACT}/holders?limit=10`
    );
    const data = await response.json();
    return data.results.map((holder: HiroHolderResponse) => ({
      address: holder.address,
      balance: holder.balance,
    }));
  } catch (error) {
    console.error('Error fetching top bees:', error);
    return [];
  }
}
