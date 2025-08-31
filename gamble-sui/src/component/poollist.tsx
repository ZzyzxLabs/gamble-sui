'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { graphQLFetcher } from '../utils/GQLcli';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { fixed_price } from '@/utils/tx/fixed_price';
import { package_addr } from '@/utils/package';
import { redeem_setting } from '@/utils/tx/redeem_setting';
interface Pool {
  address: string;
  creator?: string;
  balance?: string;
  endTime?: number;
  status?: string;
}

interface PoolsResponse {
  objects: {
    nodes: Pool[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}

interface PoolListProps {
  mode?: 'default' | 'admin';
  showControls?: boolean;
  className?: string;
  useMockData?: boolean;
  poolsData?: Pool[];
}

// Mock data for pools (when useMockData is true)
const mockPools: Pool[] = [
  {
    address: "0x1234567890abcdef1234567890abcdef12345678",
    creator: "0xabcdef1234567890abcdef1234567890abcdef12",
    balance: "1,250.50 SUI",
    endTime: new Date("2025-09-15T14:30:00").getTime(),
    status: "active"
  },
  {
    address: "0x9876543210fedcba9876543210fedcba98765432",
    creator: "0x567890abcdef1234567890abcdef1234567890ab",
    balance: "750.25 SUI",
    endTime: new Date("2025-09-20T10:00:00").getTime(),
    status: "active"
  },
  {
    address: "0x5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a",
    creator: "0x3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c",
    balance: "2,100.00 SUI",
    endTime: new Date("2025-08-30T18:45:00").getTime(),
    status: "active"
  },
  {
    address: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    creator: "0xcafebabecafebabecafebabecafebabecafebabe",
    balance: "450.75 SUI",
    endTime: new Date("2025-09-10T12:15:00").getTime(),
    status: "active"
  }
];

const PoolCard = ({
  pool,
  index,
  showControls = false
}: {
  pool: Pool;
  index: number;
  showControls?: boolean;
}) => {
  const [isStopped, setIsStopped] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const client = useSuiClient();
  const acc = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showObjectChanges: true,
        },
      }),
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatEndTime = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    if (!isClient) {
      // During SSR, return a consistent placeholder
      return 'Loading...';
    }
    const date = new Date(timestamp);
    // Only format on client side to avoid hydration mismatches
    return date.toLocaleString();
  };

  async function handleStopPool() {
    try {
      const [adminCapResult] = await Promise.all([
        graphQLFetcher({
          query: `
                  query {
                    owner(address:"${acc.address}"){
                      objects(filter:{type:"${package_addr}::suipredict::AdminCap"}){
                        nodes{
                          address
                        }
                      }
                    }
                  }
                `,
        }),
      ]);

      console.log("AdminCap:", adminCapResult);
      // console.log("Existing Pools:", poolResult);
      if (!adminCapResult?.owner?.objects?.nodes?.length) {
        alert("No AdminCap found for your address");
      }
      const adminCap = adminCapResult.owner.objects.nodes[0].address;
      const oracleHolder = "0x87ef65b543ecb192e89d1e6afeaf38feeb13c3a20c20ce413b29a9cbfbebd570"; // Replace with actual oracle holder address
      // Create the transaction with appropriate parameters
      // const tx = fixed_price(adminCap, oracleHolder, pool.address); // Adjust parameters as needed
      const transaction = redeem_setting(adminCap, pool.address);
      signAndExecuteTransaction({
        transaction: transaction
      });
      setIsStopped(true);
      console.log(`Stopping pool: ${pool.address}`);
    } catch (error) {
      console.error('Error stopping pool:', error);
    }
  };

  return (
    <div className="bg-zinc-900/60 backdrop-blur border border-zinc-800 rounded-lg shadow-lg p-6 mb-4 hover:bg-zinc-900/80 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-zinc-100 mb-3">Pool #{index + 1}</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-zinc-400">Address:</span>
              <p className="text-sm text-zinc-200 font-mono break-all mt-1">{pool.address}</p>
            </div>
            {pool.creator && (
              <div>
                <span className="text-sm font-medium text-zinc-400">Creator:</span>
                <p className="text-sm text-zinc-200 font-mono break-all mt-1">{pool.creator}</p>
              </div>
            )}
            {pool.balance && (
              <div>
                <span className="text-sm font-medium text-zinc-400">Balance:</span>
                <p className="text-sm text-zinc-100 font-semibold mt-1">{pool.balance}</p>
              </div>
            )}
            {pool.endTime && (
              <div>
                <span className="text-sm font-medium text-zinc-400">End Time:</span>
                <p className="text-sm text-zinc-200 mt-1">{formatEndTime(pool.endTime)}</p>
              </div>
            )}
          </div>
        </div>
        {showControls && (
          <div className="ml-4">
            <button
              onClick={handleStopPool}
              disabled={isStopped}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${isStopped
                  ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                  : "bg-red-500 text-white hover:bg-red-600"
                }`}
            >
              {isStopped ? "Stopped" : "Stop"}
            </button>
          </div>
        )}
      </div>
      {(showControls || pool.status) && (
        <div className="flex items-center">
          <div
            className={`w-2 h-2 rounded-full mr-2 ${isStopped ? "bg-red-500" : "bg-emerald-500"
              }`}
          />
          <span className="text-sm text-zinc-400">
            Status: {isStopped ? "Stopped" : (pool.status || "Active")}
          </span>
        </div>
      )}
    </div>
  );
};

const POOLS_QUERY = `
  query {
    objects(filter: {type: "${package_addr}::suipredict::pool"}) {
      nodes {
        address
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export default function PoolList({
  mode = 'default',
  showControls = false,
  className = '',
  useMockData = false,
  poolsData = []
}: PoolListProps) {
  const { data, isLoading, error } = useQuery<PoolsResponse>({
    queryKey: ['pools'],
    queryFn: () => graphQLFetcher({ query: POOLS_QUERY }),
    enabled: !useMockData && poolsData.length === 0, // Only fetch when not using mock data or poolsData
  });

  if (!useMockData && poolsData.length === 0 && isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#0b0b0f] text-zinc-100">
        <div className="flex items-center justify-center p-8">
          <div className="text-lg text-zinc-200">Loading pools...</div>
        </div>
      </div>
    );
  }

  if (!useMockData && poolsData.length === 0 && error) {
    return (
      <div className="min-h-screen w-full bg-[#0b0b0f] text-zinc-100">
        <div className="flex items-center justify-center p-8">
          <div className="text-red-400">
            Error loading pools: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </div>
      </div>
    );
  }

  // Priority: poolsData > mock data > fetched data
  let pools: Pool[];
  if (poolsData.length > 0) {
    pools = poolsData;
  } else if (useMockData) {
    pools = mockPools;
  } else {
    pools = data?.objects?.nodes || [];
  }

  if (mode === 'admin') {
    return (
      <div className={`space-y-4 ${className}`}>
        {pools.length === 0 ? (
          <div className="text-center p-8">
            <div className="text-zinc-500">No pools found</div>
          </div>
        ) : (
          pools.map((pool, index) => (
            <PoolCard
              key={pool.address}
              pool={pool}
              index={index}
              showControls={showControls}
            />
          ))
        )}
      </div>
    );
  }

  // Default mode
  return (
    <div className={`min-h-screen w-full bg-[#0b0b0f] text-zinc-100 ${className}`}>
      {/* Background decoration similar to ticket page */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full blur-3xl opacity-30 bg-indigo-600" />
        <div className="absolute top-1/2 -right-32 h-80 w-80 rounded-full blur-3xl opacity-20 bg-fuchsia-600" />
      </div>

      <main className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100">Pool List</h1>
          <p className="text-sm text-zinc-400">Active prediction pools</p>
        </div>

        {pools.length === 0 ? (
          <div className="text-center p-8">
            <div className="text-zinc-500">No pools found</div>
          </div>
        ) : (
          <div className="grid gap-4">
            {pools.map((pool, index) => (
              <PoolCard
                key={pool.address}
                pool={pool}
                index={index}
                showControls={showControls}
              />
            ))}
          </div>
        )}

        {!useMockData && poolsData.length === 0 && data?.objects?.pageInfo?.hasNextPage && (
          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-500">
              More pools available (pagination not implemented)
            </p>
          </div>
        )}
      </main>
    </div>
  );
}