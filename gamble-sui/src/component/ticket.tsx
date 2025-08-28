import React from "react";
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Ticket, Coins, Wallet, History, LineChart } from "lucide-react";

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
  id: string;
  name: string;      // e.g. "Round 129"
  expiresAt: number; // ms timestamp
  potSui: number;    // prize pool in SUI
}

function generateDemoPools(): PoolItem[] {
  const now = Date.now();
  return [
    { id: "P-129", name: "Round 129", expiresAt: now + 1000 * 60 * 45, potSui: 32.5 },
    { id: "P-130", name: "Round 130", expiresAt: now + 1000 * 60 * 90, potSui: 12.0 },
    { id: "P-131", name: "Round 131", expiresAt: now + 1000 * 60 * 150, potSui: 4.2 },
  ];
}

// time-left display helper
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
  const [tickets, setTickets] = useState<TicketItem[]>(generateDemoTickets());
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // 右側下單狀態
  const [round, setRound] = useState<string>("current");
  const [quote, setQuote] = useState<string>("4.7000"); // 報價（玩家預測價格）
  const [quantity, setQuantity] = useState<string>("1"); // 購買張數
  const [ticketPrice, setTicketPrice] = useState<string>("1"); // 每張票花費 SUI
  const [fastMode, setFastMode] = useState<boolean>(true); // 快速下單模式（跳過部分二次確認）

  // pools state
  const [pools, setPools] = useState<PoolItem[]>(generateDemoPools());
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);

  // recompute selected pool
  const selectedPool = useMemo(
    () => pools.find((p) => p.id === selectedPoolId) || null,
    [pools, selectedPoolId]
  );

  // tick every second so "time left" updates
  const [, forceTick] = useState(0);
  React.useEffect(() => {
    const t = setInterval(() => forceTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const qty = Number(quantity) || 0;
  const pricePer = Number(ticketPrice) || 0;
  const cost = qty * pricePer;

  const filtered = useMemo(() => {
    if (statusFilter === "All") return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const totalStake = useMemo(() => tickets.reduce((acc, t) => acc + t.stake, 0), [tickets]);
  const activeCount = useMemo(() => tickets.filter((t) => t.status === "Active").length, [tickets]);

  function mockPlaceOrder() {
    // 這裡改成你真正的鏈上呼叫：
    // 1) 連接 Sui 錢包 (例如 @mysten/wallet-kit)
    // 2) 調用你的合約 entry function (例如 create_ticket / bet / purchase)
    const newTicket: TicketItem = {
      id: `T-${Math.floor(Math.random() * 9000 + 1000)}`,
      round: round === "current" ? "Round 129" : "Round 130",
      quote: Number(quote) || 0,
      stake: Number(ticketPrice) || 0,
      status: "Active",
      placedAt: Date.now(),
    };
    setTickets((prev) => [newTicket, ...prev]);
  }

  return (
    <div className="min-h-screen w-full bg-[#0b0b0f] text-zinc-100 text-white">
      {/* 背景裝飾 */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full blur-3xl opacity-30 bg-indigo-600" />
        <div className="absolute top-1/2 -right-32 h-80 w-80 rounded-full blur-3xl opacity-20 bg-fuchsia-600" />
      </div>

      <main className="mx-auto max-w-7xl p-4 md:p-8">
        {/* 頁首 */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Ticket className="h-6 w-6" /> GambleSUI
            </h1>
            <p className="text-sm text-zinc-400">Just a little Casino</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700">
              <History className="mr-2 h-4 w-4" /> History
            </Button>
          </div>
        </div>

        {/* 兩欄布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* 左半：票券總覽 */}
          <section className="space-y-4">
            <Card className="bg-zinc-900/60 relative -z-0 backdrop-blur border-zinc-800 h-199 overflow-y-auto">
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
          {/* Right: Pools & Buy */}
          <section className="space-y-4">
            <Card className="bg-zinc-900/60 backdrop-blur border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg text-white">Available Pools</CardTitle>
                <CardDescription className="text-zinc-400">
                  Pick a pool to enter. Each pool has a deadline and prize pot.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 text-zinc-300">
                {/* Pools table */}
                <div className="rounded-md border border-zinc-800 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-zinc-300">Pool</TableHead>
                        <TableHead className="text-zinc-300">Expires</TableHead>
                        <TableHead className="text-zinc-300">Time Left</TableHead>
                        <TableHead className="text-zinc-300">Pot (SUI)</TableHead>
                        <TableHead className="text-right text-zinc-300">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pools.map((p) => {
                        const timeLeft = p.expiresAt - Date.now();
                        return (
                          <TableRow key={p.id} className="hover:bg-zinc-900/60">
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell>{new Date(p.expiresAt).toLocaleString()}</TableCell>
                            <TableCell>{formatDuration(timeLeft)}</TableCell>
                            <TableCell>{p.potSui.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-500 text-white"
                                onClick={() => setSelectedPoolId(p.id)}
                              >
                                Select
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Selected summary + Buy dialog */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <div className="text-zinc-400">Selected Pool</div>
                      <div className="mt-1 font-medium">
                        {selectedPool ? selectedPool.name : "None"}
                      </div>
                      {selectedPool && (
                        <div className="mt-1 text-xs text-zinc-400">
                          Expires: {new Date(selectedPool.expiresAt).toLocaleString()} • Time Left:{" "}
                          {formatDuration(selectedPool.expiresAt - Date.now())} • Pot:{" "}
                          {selectedPool.potSui.toLocaleString(undefined, { maximumFractionDigits: 2 })} SUI
                        </div>
                      )}
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          disabled={!selectedPool}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          {selectedPool ? "Buy Ticket" : "Select a Pool"}
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        <DialogHeader>
                          <DialogTitle>Buy Ticket</DialogTitle>
                          <DialogDescription className="text-zinc-400">
                            {selectedPool
                              ? `You are entering ${selectedPool.name}. Please confirm your quote and cost.`
                              : "Please select a pool first."}
                          </DialogDescription>
                        </DialogHeader>

                        {/* Reuse your existing inputs (with 4-decimal validation) */}
                        <div className="space-y-4">
                          <div className="grid gap-3">
                            <Label>Your Quote (SUI/USD)</Label>
                            <Input
                              value={quote}
                              onChange={(e) => {
                                const val = e.target.value;
                                const regex = /^\d*(\.\d{0,4})?$/;
                                if (regex.test(val)) setQuote(val);
                              }}
                              onBlur={() => {
                                if (quote) setQuote(Number(quote).toFixed(4));
                              }}
                              placeholder="e.g. 4.7000"
                              className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                            />
                            <p className="text-xs text-zinc-400">
                              Tip: Please enter 4 decimal places. Actual precision is determined by the contract.
                            </p>
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
                                placeholder="1"
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
                              <span>{selectedPool ? selectedPool.name : "-"}</span>
                            </div>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button variant="secondary" className="bg-zinc-800 hover:bg-zinc-700">
                            Cancel
                          </Button>
                          <Button
                            disabled={!selectedPool || cost <= 0}
                            onClick={() => {
                              // write a demo ticket that uses pool name as "round"
                              const roundName = selectedPool ? selectedPool.name : "N/A";
                              const newTicket: TicketItem = {
                                id: `T-${Math.floor(Math.random() * 9000 + 1000)}`,
                                round: roundName,
                                quote: Number(quote) || 0,
                                stake: Number(ticketPrice) || 0,
                                status: "Active",
                                placedAt: Date.now(),
                              };
                              setTickets((prev) => [newTicket, ...prev]);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                          >
                            Confirm
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* keep Fast Mode toggle if you still want it */}
                  <div className="flex items-center gap-2 text-sm text-zinc-400 pt-2">
                    <Switch
                      checked={fastMode}
                      onCheckedChange={setFastMode}
                      id="fast"
                      className="data-[state=checked]:bg-emerald-600"
                    />
                    <Label htmlFor="fast" className="cursor-pointer">Fast Mode</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
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
