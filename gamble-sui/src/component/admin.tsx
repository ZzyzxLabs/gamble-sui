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
import { Transaction } from "@mysten/sui/transactions";
import { start_game } from "@/utils/tx/start_game";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { graphQLFetcher } from "@/utils/GQLcli";
import { package_addr } from "@/utils/package";

const Admin = () => {
  const client = useSuiClient();
  const acc = useCurrentAccount();
  const [pricePerTicket, setPricePerTicket] = useState<string>("1000");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pools, setPools] = useState<any[]>([]);
  const [poolsLoading, setPoolsLoading] = useState<boolean>(false);

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

  // Fetch pools on component mount
  useEffect(() => {
    fetchPools();
  }, []);

  async function fetchPools() {
    setPoolsLoading(true);
    try {
      const [poolResult] = await Promise.all([
        graphQLFetcher({
          query: `
            {
  objects(
    filter: {
      type: "${package_addr}::suipredict::Pool"
    }
  ) {
    edges {
      node {
        address
        dynamicFields {
          edges {
            node {
              name {
                type {
                  layout
                }
                data
              }
              value {
                __typename
                ... on MoveObject {
                  address
                  contents {
                    type {
                      layout
                    }
                    data
                  }
                }
                ... on MoveValue {
                  type {
                    layout
                  }
                  data
                }
              }
            }
          }
        }
        objects {
          edges {
            node {
              address
            }
          }
        }
      }
    }
  }
}
          `,
        }),
      ]);

      console.log("Full Pool JSON:", JSON.stringify(poolResult, null, 2));

      // Extract pool addresses
      const poolAddresses = poolResult?.objects?.edges?.map((edge: any) => edge.node.address) || [];

      // Fetch creator information for each pool
      const creatorPromises = poolAddresses.map(async (address: string) => {
        try {
          const creatorResult = await graphQLFetcher({
            query: `
              {
                object(address:"${address}"){
                  previousTransactionBlock{
                    sender{
                      address
                    }
                  }
                }
              }
            `,
          });
          return {
            poolAddress: address,
            creator: creatorResult?.object?.previousTransactionBlock?.sender?.address || "0x" + "a".repeat(40)
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

      // Extract pool addresses and create pool objects with real creators
      const extractedPools = poolResult?.objects?.edges?.map((edge: any, index: number) => ({
        address: edge.node.address,
        creator: creatorMap[edge.node.address] || "0x" + "a".repeat(40), // Use real creator or fallback
        balance: `${Math.floor(Math.random() * 3000) + 500}.${Math.floor(Math.random() * 100).toString().padStart(2, '0')} SUI`, // Placeholder balance
        endTime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).getTime(), // Placeholder end time (random within next week)
        status: "active"
      })) || [];

      setPools(extractedPools);
      console.log("Pools with creators:", extractedPools);
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
      // Query for AdminCap
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

      const tx = start_game(adminCap, Number(pricePerTicket));

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log("Transaction successful:", result);
            console.log("Transaction digest:", result.digest);
            console.log("Transaction effects:", result.effects);
            console.log("Object changes:", result.objectChanges);
            console.log("Raw effects:", result.rawEffects);
            alert(
              "Game started successfully! Transaction digest: " + result.digest
            );
          },
          onError: (error) => {
            console.error("Transaction failed:", error);
            alert(
              "Transaction failed: " +
              (error instanceof Error ? error.message : String(error))
            );
          },
        }
      );
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
