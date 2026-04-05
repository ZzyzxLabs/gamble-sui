import { createDAppKit } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';

const GRPC_URLS = {
  testnet: 'https://fullnode.testnet.sui.io:443',
  mainnet: 'https://fullnode.mainnet.sui.io:443',
} as const;

export const createDAppKitInstance = () =>
  createDAppKit({
    networks: ['testnet', 'mainnet'],
    defaultNetwork: 'testnet',
    createClient: (network) =>
      new SuiGrpcClient({
        network: network as keyof typeof GRPC_URLS,
        baseUrl: GRPC_URLS[network as keyof typeof GRPC_URLS],
      }),
    autoConnect: true,
  });

export type DAppKitInstance = ReturnType<typeof createDAppKitInstance>;

declare module '@mysten/dapp-kit-react' {
  interface Register {
    dAppKit: DAppKitInstance;
  }
}
