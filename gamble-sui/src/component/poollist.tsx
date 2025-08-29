'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { graphQLFetcher } from '../utils/GQLcli';
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { fixed_price } from '@/utils/tx/fixed_price';
import { package_addr } from '@/utils/package';
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
      // Create the transaction with appropriate parameters
      const transaction = fixed_price(pool.address); // Adjust parameters as needed
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
    <div className="bg-white rounded-lg shadow-md p-6 mb-4 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Pool #{index + 1}</h3>
          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium text-gray-600">Address:</span>
              <p className="text-sm text-gray-800 font-mono break-all">{pool.address}</p>
            </div>
            {pool.creator && (
              <div>
                <span className="text-sm font-medium text-gray-600">Creator:</span>
                <p className="text-sm text-gray-800 font-mono break-all">{pool.creator}</p>
              </div>
            )}
            {pool.balance && (
              <div>
                <span className="text-sm font-medium text-gray-600">Balance:</span>
                <p className="text-sm text-gray-800 font-semibold">{pool.balance}</p>
              </div>
            )}
            {pool.endTime && (
              <div>
                <span className="text-sm font-medium text-gray-600">End Time:</span>
                <p className="text-sm text-gray-800">{formatEndTime(pool.endTime)}</p>
              </div>
            )}
          </div>
        </div>
        {showControls && (
          <div className="ml-4">
            <button
              onClick={handleStopPool}
              disabled={isStopped}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isStopped
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
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
            className={`w-2 h-2 rounded-full mr-2 ${
              isStopped ? "bg-red-500" : "bg-green-500"
            }`}
          />
          <span className="text-sm text-gray-600">
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
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading pools...</div>
      </div>
    );
  }

  if (!useMockData && poolsData.length === 0 && error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">
          Error loading pools: {error instanceof Error ? error.message : 'Unknown error'}
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
            <div className="text-gray-500">No pools found</div>
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
    <div className={`container mx-auto p-4 ${className}`}>
      <h1 className="text-2xl font-bold mb-6">Pool List</h1>
      
      {pools.length === 0 ? (
        <div className="text-center p-8">
          <div className="text-gray-500">No pools found</div>
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
          <p className="text-sm text-gray-500">
            More pools available (pagination not implemented)
          </p>
        </div>
      )}
    </div>
  );
}