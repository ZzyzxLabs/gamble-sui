"use client";

import { DAppKitProvider } from '@mysten/dapp-kit-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createDAppKitInstance, type DAppKitInstance } from '@/utils/dapp-kit';
import { useEffect, useState } from 'react';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const [dAppKit, setDAppKit] = useState<DAppKitInstance | null>(null);

  useEffect(() => {
    setDAppKit(createDAppKitInstance());
  }, []);

  if (!dAppKit) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DAppKitProvider dAppKit={dAppKit}>
        {children}
      </DAppKitProvider>
    </QueryClientProvider>
  );
}
