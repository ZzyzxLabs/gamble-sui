"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings, Shield, Play, Clock } from "lucide-react";
import PoolList from "./poollist";
import { start_game } from "@/utils/tx/start_game";
import {
  useCurrentAccount,
  useDAppKit,
} from "@mysten/dapp-kit-react";
import { package_addr } from "@/utils/package";
import { fetchPoolsFromChain } from "@/utils/pool-ids";

const Admin = () => {
  const acc = useCurrentAccount();
  const dAppKit = useDAppKit();
  const [pricePerTicket, setPricePerTicket] = useState<string>("1000");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pools, setPools] = useState<any[]>([]);
  const [poolsLoading, setPoolsLoading] = useState<boolean>(false);

  // Fetch pools on component mount
  useEffect(() => {
    fetchPools();
  }, []);

  async function fetchPools() {
    setPoolsLoading(true);
    try {
      const client = dAppKit.getClient();
      const rawPools = await fetchPoolsFromChain();
      if (rawPools.length === 0) {
        setPools([]);
        return;
      }

      const poolData = rawPools.map((p) => ({
        address: p.objectId,
        contents: p.json,
        previousTransaction: p.previousTransaction,
      }));

      // Extract pool addresses for creator queries
      const poolAddresses = poolData.map((pool: any) => pool.address);

      // Fetch creator information for each pool
      const creatorPromises = poolAddresses.map(async (address: string) => {
        try {
          const poolInfo = poolData.find((pool) => pool.address === address);
          const previousTx = poolInfo?.previousTransaction;
          if (!previousTx) {
            return {
              poolAddress: address,
              creator: "0x" + "a".repeat(40),
            };
          }

          const creatorResult = await client.getTransaction({
            digest: previousTx,
            include: { transaction: true },
          });

          const tx = creatorResult.Transaction ?? creatorResult.FailedTransaction;
          const sender = tx?.transaction?.sender;
          return {
            poolAddress: address,
            creator: sender || "0x" + "a".repeat(40)
          };
        } catch (error) {
          console.error(`Error fetching creator for pool ${address}:`, error);
          return {
            poolAddress: address,
            creator: "0x" + "a".repeat(40) // Fallback placeholder
          };
        }
      });

      // Wait for all creator queries to complete
      const creatorResults = await Promise.all(creatorPromises);

      // Create a map for easy lookup
      const creatorMap = creatorResults.reduce((acc, result) => {
        acc[result.poolAddress] = result.creator;
        return acc;
      }, {} as Record<string, string>);
      console.log("Creator Map:", creatorResults);
      
      // Create pool objects with real creators and can_redeem field
      const extractedPools = poolData.map((pool: any, index: number) => {
        const contents = pool.contents || {};
        console.log(`Pool ${pool.address} contents:`, contents);
        
        // Extract can_redeem with more robust handling
        let canRedeem = false;
        if (contents.canRedeem !== undefined) {
          canRedeem = contents.canRedeem;
        } else if (contents.can_redeem !== undefined) {
          canRedeem = contents.can_redeem;
        } else if (contents.fields?.canRedeem !== undefined) {
          canRedeem = contents.fields.canRedeem;
        } else if (contents.fields?.can_redeem !== undefined) {
          canRedeem = contents.fields.can_redeem;
        }
        console.log(`Pool ${pool.address} canRedeem:`, canRedeem);
        
        const balanceMist = Number(contents.balance ?? 0);
        const endTimeMs = Number(contents.end_time ?? 0);

        return {
          address: pool.address,
          creator: creatorMap[pool.address] || "0x" + "a".repeat(40),
          balance: `${balanceMist.toLocaleString()} MIST · ${(balanceMist / 1e9).toFixed(6)} SUI`,
          endTime: endTimeMs,
          status: "active",
          can_redeem: canRedeem,
          price: contents.price ?? "0",
          fixed_price: contents.fixed_price ?? "0",
        };
      });

      setPools(extractedPools);
      console.log("Pools with creators and can_redeem:", extractedPools);
    } catch (error) {
      console.error("Error fetching pools:", error);
    } finally {
      setPoolsLoading(false);
    }
  }

  async function handleNew() {
    if (!acc?.address) {
      alert("Please connect your wallet first");
      return;
    }

    setIsLoading(true);

    try {
      const client = dAppKit.getClient();
      const adminCapResult = await client.listOwnedObjects({
        owner: acc.address,
        type: `${package_addr}::suipredict::AdminCap`,
      });

      console.log("AdminCap:", adminCapResult);
      if (!adminCapResult.objects.length) {
        alert("No AdminCap found for your address");
        return;
      }
      const adminCap = adminCapResult.objects[0].objectId;

      const tx = start_game(adminCap, Number(pricePerTicket));

      const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
      if (result.FailedTransaction) {
        throw new Error(result.FailedTransaction.status.error?.message ?? 'Transaction failed');
      }
      console.log("Transaction successful:", result.Transaction);
      console.log("Transaction digest:", result.Transaction.digest);
      alert("Game started successfully! Transaction digest: " + result.Transaction.digest);
    } catch (error) {
      console.error("Error starting game:", error);
      alert(
        "Failed to start game: " +
        (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#0b0b0f] text-zinc-100">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full blur-3xl opacity-30 bg-indigo-600" />
        <div className="absolute top-1/2 -right-32 h-80 w-80 rounded-full blur-3xl opacity-20 bg-fuchsia-600" />
      </div>

      <main className="mx-auto max-w-7xl p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Shield className="h-6 w-6" /> Admin Panel
            </h1>
            <p className="text-sm text-zinc-400">
              Manage GambleSUI system and pools
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={fetchPools}
              variant="outline"
              className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border-zinc-700"
            >
              Fetch Pools
            </Button>
            <Button
              variant="secondary"
              className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            >
              <Settings className="mr-2 h-4 w-4" /> Settings
            </Button>
          </div>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Pool Management */}
          <section className="space-y-4">
            <Card className="bg-zinc-900/60 backdrop-blur border-zinc-800">
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Clock className="h-5 w-5" /> Pool Management
                  </CardTitle>
                  <CardDescription className="text-zinc-300">
                    Manage active gambling pools
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {poolsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-zinc-400">Loading pools...</div>
                  </div>
                ) : (
                  <PoolList
                    mode="admin"
                    showControls={true}
                    useMockData={false}
                    poolsData={pools}
                    className="h-full"
                  />
                )}
              </CardContent>
            </Card>
          </section>

          {/* Right: Admin Controls */}
          <section className="space-y-4">
            <Card className="bg-zinc-900/60 backdrop-blur border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg text-white">
                  Start New Game
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Create a new prediction pool for players to participate in
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3">
                  <Label className="text-zinc-300">
                    Price per Ticket (Mist)
                  </Label>
                  <Input
                    value={pricePerTicket}
                    onChange={(e) => setPricePerTicket(e.target.value)}
                    placeholder="1000"
                    className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                  />
                  <p className="text-xs text-zinc-400">
                    Amount players need to pay per ticket in Mist
                  </p>
                </div>

                <div className="rounded-md border border-zinc-800 p-3 bg-zinc-950/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Ticket Price</span>
                    <span className="font-medium">
                      {Number(pricePerTicket) / 1e9} SUI
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 mt-1">
                    <span>Mist Amount</span>
                    <span>{pricePerTicket}</span>
                  </div>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      disabled={!pricePerTicket || isLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {isLoading ? "Starting Game..." : "Start New Game"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <DialogHeader>
                      <DialogTitle>Confirm New Game</DialogTitle>
                      <DialogDescription className="text-zinc-400">
                        This will create a new prediction pool with the
                        specified ticket price.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Ticket Price</span>
                        <span className="font-medium">
                          {Number(pricePerTicket) / 1e9} SUI
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Mist Amount</span>
                        <span className="font-medium">{pricePerTicket}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Duration</span>
                        <span className="font-medium">90 seconds</span>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="secondary"
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleNew}
                        disabled={isLoading}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        {isLoading ? "Starting..." : "Confirm"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* System Stats */}
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm text-zinc-400">
                  System Statistics
                </CardTitle>
                <CardDescription>Current system overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Active Pools</span>
                      <Settings className="h-4 w-4" />
                    </div>
                    <div className="mt-1 text-lg font-semibold">4</div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Total SUI</span>
                      <Shield className="h-4 w-4" />
                    </div>
                    <div className="mt-1 text-lg font-semibold">4,551</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Admin;
