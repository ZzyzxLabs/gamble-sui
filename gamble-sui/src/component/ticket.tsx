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
      <div className="pointer-events-none fixed inset-0 -z-10">
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
            <Card className="bg-zinc-900/60 relative -z-0 backdrop-blur border-zinc-800 h-197">
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
          <section className="space-y-4">
            <Card className="bg-zinc-900/60 backdrop-blur border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg text-white">Buy Ticket</CardTitle>
                <CardDescription className="text-zinc-400">Enter your price for the chosen round. At settlement, the closest player wins.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-zinc-300">
                <Tabs defaultValue="manual" className="w-full"    >
                  <TabsList className="bg-zinc-900 border border-zinc-800">
                    <TabsTrigger value="manual" className="text-zinc-400 data-[state=active]:text-black">Manual Quote</TabsTrigger>
                    <TabsTrigger value="quick" className="text-zinc-400 data-[state=active]:text-black">Quick Presets</TabsTrigger>
                  </TabsList>

                  {/* 手動報價 */}
                  <TabsContent value="manual" className="space-y-4">
                    <div className="grid gap-3">
                      <Label>Select Round</Label>
                      <Select value={round} onValueChange={setRound}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                          <SelectValue placeholder="Current Round" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                          <SelectItem value="current">Current Round</SelectItem>
                          <SelectItem value="next">Next Round (+30m)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-3">
                      <Label>Your Quote (SUI/USD)</Label>
                      <Input
                        value={quote}
                        onChange={(e) => setQuote(e.target.value)}
                        placeholder="Enter your price"
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
                        <span>Round</span>
                        <span>{round === "current" ? "Current Round" : "Next Round"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Switch checked={fastMode} onCheckedChange={setFastMode} id="fast" className="data-[state=checked]:bg-emerald-600" />
                        <Label htmlFor="fast" className="cursor-pointer">Fast Mode</Label>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button disabled={cost <= 0} className="bg-indigo-600 hover:bg-indigo-500 text-white">Place Order</Button>
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                          <DialogHeader>
                            <DialogTitle>Confirm Order</DialogTitle>
                            <DialogDescription className="text-zinc-400">Please confirm your quote and cost. Submitting will call the contract to mint your ticket.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between"><span>Round</span><span className="font-medium">{round === "current" ? "Current Round" : "Next Round"}</span></div>
                            <div className="flex items-center justify-between"><span>Quote</span><span className="font-medium">{formatPrice(Number(quote) || 0)}</span></div>
                            <div className="flex items-center justify-between"><span>Quantity</span><span className="font-medium">{qty}</span></div>
                            <div className="flex items-center justify-between"><span>Price per Ticket</span><span className="font-medium">{formatSui(pricePer)}</span></div>
                            <Separator className="my-2 bg-zinc-800" />
                            <div className="flex items-center justify-between text-base"><span>Total</span><span className="font-semibold">{formatSui(cost)}</span></div>
                          </div>
                          <DialogFooter>
                            <Button variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300">Cancel</Button>
                            <Button onClick={mockPlaceOrder} className="bg-emerald-600 hover:bg-emerald-500 text-white">Confirm</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TabsContent>

                  {/* 快速預設報價（僅作示範） */}
                  <TabsContent value="quick" className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { label: "+0.5%", val: 1.005 },
                        { label: "+1%", val: 1.01 },
                        { label: "+2%", val: 1.02 },
                        { label: "-0.5%", val: 0.995 },
                        { label: "-1%", val: 0.99 },
                        { label: "-2%", val: 0.98 },
                      ].map((p) => (
                        <Button
                          key={p.label}
                          variant="secondary"
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                          onClick={() => {
                            const base = Number(quote) || 4.7;
                            setQuote((base * p.val).toFixed(4));
                          }}
                        >
                          {p.label}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-400">Tip: These buttons adjust based on your current quote as a percentage.</p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* 額外資訊卡：規則/風險提示 */}
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm text-zinc-400">Rules & Risks</CardTitle>
                <CardDescription className="">Note: Blockchain transactions are irreversible. Contract rules are determined by on-chain code.</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400 space-y-2">
                <p>• Quote precision and settlement are determined by the contract implementation (e.g., closest to actual price wins).</p>
                <p>• You must have sufficient SUI balance to cover ticket cost and gas fees.</p>
                <p>• This page currently uses demo data; once connected, always rely on on-chain state.</p>
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
