
import React from "react";
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Ticket, Coins, Wallet, History, LineChart } from "lucide-react";
import { graphQLFetcher } from "@/utils/GQLcli";
import { package_addr } from "@/utils/package";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { buyTicket } from "@/utils/tx/buy_ticket";

// ---------------------------------------------
// GambleSUI — 單頁介面 (深色)
// 左：玩家持有的 Ticket 總覽 
// 右：購買區域（下單購票 + 報價）
// ---------------------------------------------

// 假資料型別
interface TicketItem {
  id: string;
  round: string; // 例如：2025-08-26 20:00 (Round 128)
  quote: number; // 玩家報價（例如 SUI/USD 價格）
  stake: number; // 下注的 SUI 數量
  status: "Active" | "Won" | "Lost" | "Settled";
  placedAt: number; // ms timestamp
}

// ---- Pools (mock) ----
interface PoolItem {
  id: string;          // e.g. "P-129"
  name: string;        // e.g. "Round 129"
  createdAt: number;   // start time (for progress bar)
  expiresAt: number;   // deadline
  potSui: number;      // current prize pot
  ticketPrice: number; // price per ticket (SUI)
}

function generateDemoPools(): PoolItem[] {
  const now = Date.now();
  return [
    {
      id: "P-129",
      name: "Round 129",
      createdAt: now - 1000 * 60 * 30,            // 開了 30 分鐘
      expiresAt: now + 1000 * 60 * 45,            // 再 45 分鐘到期
      potSui: 32.5,
      ticketPrice: 1,
    },
    {
      id: "P-130",
      name: "Round 130",
      createdAt: now - 1000 * 60 * 10,
      expiresAt: now + 1000 * 60 * 90,
      potSui: 12.0,
      ticketPrice: 1,
    },
    {
      id: "P-131",
      name: "Round 131",
      createdAt: now - 1000 * 60 * 5,
      expiresAt: now + 1000 * 60 * 150,
      potSui: 4.2,
      ticketPrice: 1,
    },
  ];
}

// format time left like "1h 12m 03s"
function formatDuration(ms: number) {
  if (ms <= 0) return "Expired";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}


function generateDemoTickets(): TicketItem[] {
  const now = Date.now();
  return [
    { id: "T-1001", round: "Round 128", quote: 4.62, stake: 3, status: "Active", placedAt: now - 1000 * 60 * 20 },
    { id: "T-1000", round: "Round 127", quote: 4.75, stake: 2, status: "Settled", placedAt: now - 1000 * 60 * 70 },
    { id: "T-0999", round: "Round 127", quote: 4.81, stake: 1, status: "Won", placedAt: now - 1000 * 60 * 75 },
    { id: "T-0998", round: "Round 126", quote: 4.55, stake: 4, status: "Lost", placedAt: now - 1000 * 60 * 180 },
  ];
}

const STATUS_COLOR: Record<TicketItem["status"], string> = {
  Active: "bg-blue-500/20 text-blue-300",
  Won: "bg-emerald-500/20 text-emerald-300",
  Lost: "bg-rose-500/20 text-rose-300",
  Settled: "bg-zinc-500/20 text-zinc-300",
};

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function formatSui(n: number) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 4 })} SUI`;
}

function formatPrice(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
}

export default function GambleSUIPage() {
  // 假資料
  const client = useSuiClient();
  const acc = useCurrentAccount();
  const [tickets, setTickets] = useState<TicketItem[]>(generateDemoTickets());
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // 右側下單狀態
  const [quote, setQuote] = useState<string>("4.7000"); // 報價（玩家預測價格）
  const [quantity, setQuantity] = useState<string>("1"); // 購買張數
  const [ticketPrice, setTicketPrice] = useState<string>("1"); // 每張票花費 SUI

  const [potDelta, setPotDelta] = useState<number | null>(null);
  const [flashPot, setFlashPot] = useState(false);

  // pools state
  const [pools, setPools] = useState<PoolItem[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [poolsLoading, setPoolsLoading] = useState<boolean>(false);
  const [poolsError, setPoolsError] = useState<string | null>(null);

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

  // const handleConfirm = async () => {
  //   let coin_result = await fetchCoin()
  //   console.log(coin_result)
  //   // 1) 寫入一張 demo ticket（沿用你原本的邏輯）
  //   const newTicket: TicketItem = {
  //     id: `T-${Math.floor(Math.random() * 9000 + 1000)}`,
  //     round: selectedPool.name,
  //     quote: Number(quote) || 0,
  //     stake: Number(ticketPrice) || 0,
  //     status: "Active",
  //     placedAt: Date.now(),
  //   };
  //   setTickets((prev) => [newTicket, ...prev]);

  //   // 2) 同步更新所選池子的獎池金額
  //   const delta = (Number(quantity) || 0) * (Number(ticketPrice) || 0);
  //   setPools((prev) =>
  //     prev.map((p) =>
  //       p.id === selectedPool.id ? { ...p, potSui: p.potSui + delta } : p
  //     )
  //   );

  //   // 3) 顯示 +X SUI 動畫
  //   setPotDelta(delta);
  //   setFlashPot(true);
  //   setTimeout(() => setFlashPot(false), 700);  // 0.7s 淡出
  //   setTimeout(() => setPotDelta(null), 1200);  // 動畫結束後清除數值
  // };

  const fetchCoin = async () => {
    setPoolsLoading(true);
    setPoolsError(null);
    try {
      const data: any = await graphQLFetcher({
        query: `
      {
        owner(
          address: "0x5a91d93d9982009e759681a5fa47645ae1454f792c87112038446993148e2193"
        ){
          coins{
            nodes{
              address
            }
          }
        }
      }
    `
      })
    }
    catch (err: any) {
      console.error(err);
      setPoolsError("Failed to fetch pools");
    }

    // GraphQL fetcher: load Pools from chain
    const fetchPools = React.useCallback(async () => {
      setPoolsLoading(true);
      setPoolsError(null);
      try {
        const data: any = await graphQLFetcher({
          query: `
          {
          objects(
            filter: { type: "${package_addr}::suipredict::Pool" }
          ) {
              edges {
                node {
                address
                  asMoveObject {
                    contents {
                    type { layout }
                    data
                  }
                }
              }
            }
          }
        }
          `,
        });

        const WINDOW_MS = 100000; // must match suipredict.create_pool window
        const toNum = (v: any): number => {
          if (v === null || v === undefined) return 0;
          if (typeof v === "string") return Number(v);
          if (typeof v === "number") return v;
          if (typeof v === "object") {
            if (v.value !== undefined) return toNum(v.value);
            if (v.fields?.value !== undefined) return toNum(v.fields.value);
          }
          return 0;
        };
        const toSui = (mist: number) => mist / 1e9;

        const edges: any[] = data?.objects?.edges ?? [];
        const mapped: PoolItem[] = edges
          .map((e) => {
            const node = e?.node ?? {};
            const addr: string | undefined = node.address;
            const contents = node?.asMoveObject?.contents;
            const rawData: any = contents?.data ?? {};
            const dataFieldMap = (Array.isArray(rawData.Struct) ? rawData.Struct : Object.values(rawData.Struct))
              .reduce((acc, field: any) => {
                acc[field.name] = field.value;
                return acc;
              }, {} as Record<string, any>);
            const endTime = dataFieldMap["end_time"]?.Number;
            if (!addr || !dataFieldMap) return null;
            const priceU64 = toNum(dataFieldMap.price ?? dataFieldMap?.fields?.price);
            // Balance<SUI> can be nested; try common shapes
            let balanceMist = 0;
            const bal = dataFieldMap.balance ?? dataFieldMap?.fields?.balance;
            if (bal) {
              balanceMist = toNum(bal);
            }
            console.log(rawData, rawData.Struct, dataFieldMap)
            const ticketPrice = toSui(priceU64);
            const potSui = toSui(balanceMist);
            const expiresAt = Number(endTime) || 0;
            const createdAt = expiresAt > 0 ? Math.max(expiresAt - WINDOW_MS, 0) : 0;

            return {
              id: addr,
              name: `Round ${addr.slice(2, 6).toUpperCase()}`,
              createdAt,
              expiresAt,
              potSui,
              ticketPrice,
            } as PoolItem;
          })
          .filter(Boolean) as PoolItem[];

        // Sort by soonest to expire first
        mapped.sort((a, b) => (a.expiresAt || 0) - (b.expiresAt || 0));
        setPools(mapped);
      let coin_result = await fetchCoin()
      console.log(coin_result)
        // Keep selection if still present; otherwise clear
        setSelectedPoolId((prev) => (mapped.some((p) => p.id === prev) ? prev : null));
      } catch (err: any) {
        console.error("fetchPools error", err);
        setPoolsError(err?.message || "Failed to load pools");
      } finally {
        setPoolsLoading(false);
      }

    }, []);

    // recompute selected pool when pools or selectedPoolId changes
    const selectedPool = useMemo(
      () => pools.find((p) => p.id === selectedPoolId) || null,
      [pools, selectedPoolId]
    );

    // tick every second so "time left" updates
    const [, forceTick] = useState(0);

    React.useEffect(() => {
      const t = setInterval(() => {
        forceTick((x) => x + 1);

        // 選取的池子過期就清掉
        if (selectedPoolId) {
          const p = pools.find(pp => pp.id === selectedPoolId);
          if (p && p.expiresAt - Date.now() <= 0) {
            setSelectedPoolId(null);
          }
        }
      }, 1000);
      return () => clearInterval(t);
    }, [pools, selectedPoolId]);

    // initial load
    React.useEffect(() => {
      fetchPools();
    }, [fetchPools]);

    React.useEffect(() => {
      if (selectedPool) {
        setTicketPrice(String(selectedPool.ticketPrice));
      }
    }, [selectedPool]);

    const isSelectedExpired = selectedPool ? (selectedPool.expiresAt - Date.now() <= 0) : true;


    const qty = Number(quantity) || 0;
    const pricePer = Number(ticketPrice) || 0;
    const cost = qty * pricePer;

    const filtered = useMemo(() => {
      if (statusFilter === "All") return tickets;
      return tickets.filter((t) => t.status === statusFilter);
    }, [tickets, statusFilter]);

    const totalStake = useMemo(() => tickets.reduce((acc, t) => acc + t.stake, 0), [tickets]);
    const activeCount = useMemo(() => tickets.filter((t) => t.status === "Active").length, [tickets]);

    return (
      <div className="min-h-screen w-full bg-[#0b0b0f] text-zinc-100 text-white" >
        {/* 背景裝飾 */}
        < div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" >
          <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full blur-3xl opacity-30 bg-indigo-600" />
          <div className="absolute top-1/2 -right-32 h-80 w-80 rounded-full blur-3xl opacity-20 bg-fuchsia-600" />
        </div >

        <main className="mx-auto max-w-7xl p-4 md:p-8">
          {/* 頁首 */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
                <Ticket className="h-6 w-6" /> GambleSUI
              </h1>
              <p className="text-sm text-zinc-400">Just a little Casino</p>
            </div>
          </div>

          {/* 兩欄布局 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* 左半：票券總覽 */}
            <section className="space-y-4">
              <Card className="bg-zinc-900/60 relative -z-0 backdrop-blur border-zinc-800 h-200 overflow-y-auto">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <LineChart className="h-5 w-5 text-white" /> Your Tickets
                    </CardTitle>
                    <CardDescription className="text-zinc-300">Tickets Overview</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-36 bg-zinc-900 border-zinc-800 text-zinc-100">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-100 text-zinc-100">
                        <SelectItem value="All">All</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Won">Won</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
                        <SelectItem value="Settled">Settled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="secondary" className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700" onClick={() => setTickets(generateDemoTickets())}>
                      Reset Demo Data
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-zinc-300">
                    <Stat title="Amount" value={tickets.length.toString()} icon={<Ticket className="h-4 w-4" />} />
                    <Stat title="Active" value={activeCount.toString()} icon={<LineChart className="h-4 w-4" />} />
                    <Stat title="Total Stake" value={formatSui(totalStake)} icon={<Coins className="h-4 w-4" />} />
                    <Stat title="Filtered" value={filtered.length.toString()} icon={<History className="h-4 w-4" />} />
                  </div>
                  <div className="rounded-md border border-zinc-800 overflow-hidden text-zinc-300">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-zinc-300">Ticket</TableHead>
                          <TableHead className="text-zinc-300">Round</TableHead>
                          <TableHead className="text-zinc-300">Quote</TableHead>
                          <TableHead className="text-zinc-300">Stake</TableHead>
                          <TableHead className="text-zinc-300">Status</TableHead>
                          <TableHead className="text-right text-zinc-300">Placed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((t) => (
                          <TableRow key={t.id} className="hover:bg-zinc-900/60">
                            <TableCell className="font-medium text-zinc-300">{t.id}</TableCell>
                            <TableCell>{t.round}</TableCell>
                            <TableCell>{formatPrice(t.quote)}</TableCell>
                            <TableCell>{formatSui(t.stake)}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${STATUS_COLOR[t.status]}`}>{t.status}</span>
                            </TableCell>
                            <TableCell className="text-right text-zinc-300">{formatTime(t.placedAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* 右半：購買區域 */}
            {/* Right: Selected Pool (top) + Pools list (scrollable, bottom) */}
            <section className="space-y-4">
              {/* Selected Pool card */}
              <Card className="bg-zinc-900/60 backdrop-blur border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Selected Pool</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Choose a pool below. Details of your selection appear here.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-zinc-300">
                  {!selectedPool ? (
                    <div className="text-sm text-zinc-500">No pool selected.</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                          <div className="text-xs text-zinc-400">Pool</div>
                          <div className="mt-1 text-base font-medium">{selectedPool.name}</div>
                          <div className="mt-1 text-xs text-zinc-500">ID: {selectedPool.id}</div>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                          <div className="text-xs text-zinc-400">Pot (SUI)</div>
                          <div className="mt-1 text-base font-medium flex items-baseline gap-2">
                            {selectedPool.potSui.toLocaleString(undefined, { maximumFractionDigits: 2 })} SUI
                            {potDelta && potDelta > 0 && (
                              <span
                                className={[
                                  "text-emerald-300 text-xs font-semibold transition-all duration-700",
                                  flashPot ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
                                ].join(" ")}
                              >
                                +{potDelta.toLocaleString(undefined, { maximumFractionDigits: 2 })} SUI
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">Ticket Price: {selectedPool.ticketPrice} SUI</div>

                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                          <div className="text-xs text-zinc-400">Expires</div>
                          <div className="mt-1 text-base font-medium">{new Date(selectedPool.expiresAt).toLocaleString()}</div>
                          <div className="mt-1 text-xs text-zinc-500">
                            Time Left: {formatDuration(selectedPool.expiresAt - Date.now())}
                          </div>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                          <div className="text-xs text-zinc-400">Opened</div>
                          <div className="mt-1 text-base font-medium">{new Date(selectedPool.createdAt).toLocaleString()}</div>
                          {/* progress bar (time elapsed / total window) */}
                          <div className="mt-2 h-2 w-full rounded bg-zinc-800 overflow-hidden">
                            {(() => {
                              const total = selectedPool.expiresAt - selectedPool.createdAt;
                              const done = Math.min(Math.max(Date.now() - selectedPool.createdAt, 0), total);
                              const pct = total > 0 ? (done / total) * 100 : 100;
                              return <div className="h-full bg-indigo-600" style={{ width: `${pct} % ` }} />;
                            })()}
                          </div>
                          <div className="mt-1 text-[10px] text-zinc-500">Time progress</div>
                        </div>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="lg"
                            disabled={!selectedPool || isSelectedExpired}
                            className="relative w-full sm:w-auto inline-flex items-center gap-2 rounded-lg
                                      bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold
                                      shadow-lg shadow-emerald-500/30 hover:shadow-emerald-400/40
                                      ring-2 ring-emerald-400/40 hover:ring-emerald-300/50
                                      hover:from-emerald-400 hover:to-teal-400
                                      transition active:scale-[0.98] focus-visible:outline-none
                                      focus-visible:ring-2 focus-visible:ring-emerald-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900
                                      disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Wallet className="h-4 w-4" />
                            {isSelectedExpired ? "Expired" : "Buy Ticket"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                          <DialogHeader>
                            <DialogTitle>Buy Ticket</DialogTitle>
                            <DialogDescription className="text-zinc-400">
                              You are entering {selectedPool.name}. Please confirm your quote and cost.
                            </DialogDescription>
                          </DialogHeader>

                          {/* Reuse your existing inputs (you可自行保留/加驗證) */}
                          <div className="space-y-4">
                            <div className="grid gap-3">
                              <Label>Your Quote (SUI/USD)</Label>
                              <Input
                                value={quote}
                                onChange={(e) => setQuote(e.target.value)}
                                placeholder="Enter your predicted price"
                                className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="grid gap-3">
                                <Label>Quantity</Label>
                                <Input
                                  inputMode="numeric"
                                  value={quantity}
                                  onChange={(e) => setQuantity(e.target.value)}
                                  placeholder="1"
                                  className="bg-zinc-900 border-zinc-700 text-zinc-100"
                                />
                              </div>
                              <div className="grid gap-3">
                                <Label>Price per Ticket (SUI)</Label>
                                <Input
                                  inputMode="decimal"
                                  value={ticketPrice}
                                  onChange={(e) => setTicketPrice(e.target.value)}
                                  placeholder={String(selectedPool.ticketPrice)}
                                  className="bg-zinc-900 border-zinc-700 text-zinc-100"
                                />
                              </div>
                            </div>

                            <div className="rounded-md border border-zinc-800 p-3 bg-zinc-950/50">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-400">Estimated Cost</span>
                                <span className="font-medium">{formatSui(cost)}</span>
                              </div>
                              <Separator className="my-3 bg-zinc-800" />
                              <div className="flex items-center justify-between text-xs text-zinc-400">
                                <span>Quote</span>
                                <span>{formatPrice(Number(quote) || 0)}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-zinc-400">
                                <span>Pool</span>
                                <span>{selectedPool.name}</span>
                              </div>
                            </div>
                          </div>

                          <DialogFooter>
                            <Button variant="secondary" className="bg-zinc-800 hover:bg-zinc-700">Cancel</Button>
                            <Button
                              disabled={cost <= 0}
                              onClick={() => console.log("ssr")}

                              className="bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                              Confirm
                            </Button>

                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Pools list (scrollable) */}
              <Card className="bg-zinc-900/60 backdrop-blur border-zinc-800 h-99 overflow-y-auto">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Available Pools</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Select a pool to view details and buy.
                  </CardDescription>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                      onClick={fetchPools}
                      disabled={poolsLoading}
                    >
                      {poolsLoading ? "Loading…" : "Refresh"}
                    </Button>
                    {poolsError && (
                      <span className="text-xs text-rose-400">{poolsError}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="text-zinc-300">
                  <div className="rounded-md border border-zinc-800 overflow-hidden">
                    <Table>
                      <TableHeader className="sticky top-0 bg-zinc-900/80 backdrop-blur">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-zinc-300">Pool</TableHead>
                          <TableHead className="text-zinc-300">Expires</TableHead>
                          <TableHead className="text-zinc-300">Time Left</TableHead>
                          <TableHead className="text-zinc-300">Pot (SUI)</TableHead>
                          <TableHead className="text-right text-zinc-300">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {poolsLoading && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-sm text-zinc-400">
                              Loading pools from chain…
                            </TableCell>
                          </TableRow>
                        )}
                        {!poolsLoading && pools.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-sm text-zinc-500">
                              No pools found.
                            </TableCell>
                          </TableRow>
                        )}
                        {pools.map((p) => {
                          const timeLeft = p.expiresAt - Date.now();
                          const expired = timeLeft <= 0;
                          const selected = selectedPoolId === p.id;

                          return (
                            <TableRow
                              key={p.id}
                              onClick={() => !expired && setSelectedPoolId(p.id)}
                              className={[
                                "transition-colors cursor-pointer",
                                expired ? "opacity-50" : "hover:bg-zinc-900/60",
                                // ★ 被選中：整列換色、左側加強邊、外圈 ring
                                selected && "bg-indigo-950/40 border-l-2 border-indigo-500 ring-1 ring-indigo-600/30"
                              ].filter(Boolean).join(" ")}
                            >
                              <TableCell className={selected ? "font-semibold text-white" : "font-medium"}>{p.name}</TableCell>
                              <TableCell className={selected ? "text-zinc-200" : undefined}>
                                {new Date(p.expiresAt).toLocaleString()}
                              </TableCell>
                              <TableCell className={selected ? "text-zinc-200" : undefined}>
                                {formatDuration(timeLeft)}
                              </TableCell>
                              <TableCell className={selected ? "text-zinc-100" : undefined}>
                                {p.potSui.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size={selected ? "default" : "sm"} // ★ 被選中：變大顆
                                  disabled={expired}
                                  className={[
                                    "text-white transition-all",
                                    expired && "disabled:opacity-50 disabled:cursor-not-allowed",
                                    // ★ 被選中：顏色、陰影、微放大
                                    selected
                                      ? "bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 scale-[1.03]"
                                      : "bg-indigo-600 hover:bg-indigo-500"
                                  ].filter(Boolean).join(" ")}
                                  onClick={(e) => {
                                    e.stopPropagation();               // 避免觸發 row onClick
                                    if (!expired) setSelectedPoolId(p.id);
                                  }}
                                >
                                  {expired ? "Expired" : selected ? "Selected" : "Select"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>

                    </Table>
                  </div>
                </CardContent>
              </Card>
            </section>

          </div>
        </main>
      </div >
    );
  }

  function Stat({ title, value, icon }: { title: string; value: string; icon?: React.ReactNode }) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>{title}</span>
          {icon}
        </div>
        <div className="mt-1 text-lg font-semibold">{value}</div>
      </div>
    );
  }
