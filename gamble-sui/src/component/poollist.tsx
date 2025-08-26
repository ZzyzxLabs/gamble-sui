'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { graphQLFetcher } from '../utils/GQLcli';

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
  
  const formatEndTime = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleStopPool = () => {
    setIsStopped(true);
    console.log(`Stopping pool: ${pool.address}`);
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
    objects(filter: {type: "0x70d3045213d0ff5858539b77932bdd6aea5e044b9fb9408f8e3085b3c8b52288::suipredict::pool"}) {
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
  useMockData = false
}: PoolListProps) {
  const { data, isLoading, error } = useQuery<PoolsResponse>({
    queryKey: ['pools'],
    queryFn: () => graphQLFetcher({ query: POOLS_QUERY }),
    enabled: !useMockData, // Only fetch when not using mock data
  });

  if (!useMockData && isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading pools...</div>
      </div>
    );
  }

  if (!useMockData && error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">
          Error loading pools: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  const pools = useMockData ? mockPools : (data?.objects?.nodes || []);

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
      
      {!useMockData && data?.objects?.pageInfo?.hasNextPage && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            More pools available (pagination not implemented)
          </p>
        </div>
      )}
    </div>
  );
}