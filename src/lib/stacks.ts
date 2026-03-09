import { STACKS_TESTNET } from '@stacks/network';

// Use a fallback address for local development, or environment variables in production
export const CONTRACT_DEPLOYER = process.env.NEXT_PUBLIC_CONTRACT_DEPLOYER || 'STKSZF15YGAE6X0M2H1JC09CRVPCK4YBHW083EJ9'; 

export const STACKS_NETWORK = STACKS_TESTNET;

export const GET_HIVE_STATS_FUNCTION = 'get-hive-stats';
export const GET_USER_DEPOSIT_FUNCTION = 'get-user-deposit';
export const STORE_IN_HIVE_FUNCTION = 'store-in-hive';
export const LEAVE_HIVE_FUNCTION = 'leave-hive';

export const PRIZE_POOL_CONTRACT = `${CONTRACT_DEPLOYER}.prize-pool`;
export const HONEYCOMB_TOKEN_CONTRACT = `${CONTRACT_DEPLOYER}.honeycomb-token`;
export const TWAB_CONTROLLER_CONTRACT = `${CONTRACT_DEPLOYER}.twab-controller`;
export const VAULT_FACTORY_CONTRACT = `${CONTRACT_DEPLOYER}.vault-factory`;
export const AUCTION_MANAGER_CONTRACT = `${CONTRACT_DEPLOYER}.auction-manager`;
export const GOVERNANCE_CONTRACT = `${CONTRACT_DEPLOYER}.governance`;
export const AUTH_PROVIDER_CONTRACT = `${CONTRACT_DEPLOYER}.auth-provider`;

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
