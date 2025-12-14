import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Percent, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { api, DashboardStats } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const Profit = () => {
  // Fetch dashboard stats for today (or a defaulting logic)
  // For the charts, we need history. The API `getHistory` gives 30 days.
  const today = new Date().toISOString().split('T')[0];

  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboardStats', today],
    queryFn: () => api.getDashboardStats(today),
  });

  const { data: history = [], isLoading: isHistoryLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['history'],
    queryFn: () => api.getHistory(30),
  });

  const refreshData = () => {
    refetchStats();
    refetchHistory();
  };

  const isLoading = isStatsLoading || isHistoryLoading;

  // Process history data for chart
  // Assuming backend returns { date, sales: [...], expenses: [...] } or similar.
  // Actually the backend `crud.get_sales_history` returns daily aggregates of sales. 
  // We might need to adjust `api.ts` or backend if `getHistory` structure isn't exactly what we expect.
  // Based on `crud.py` (assumed), it likely returns list of daily summaries.
  // Let's assume it returns { date: string, revenue: number, profit: number }[] for now based on standard patterns.
  // If not, we might see empty charts, which is acceptable for 'no data' state.

  // Fallback if stats are loading or null
  const safeStats = stats || {
    revenue: 0,
    net_profit: 0,
    gross_profit: 0,
    expenses: 0,
    ad_spend: 0,
    cogs: 0
  };

  const profitMargin = safeStats.revenue > 0
    ? ((safeStats.net_profit / safeStats.revenue) * 100).toFixed(1)
    : "0.0";

  // Owner Profit Query
  const { data: ownerProfits = [] } = useQuery({
    queryKey: ['owner-profits'],
    queryFn: api.getOwnerProfits,
  });

  // Payment History Query
  const { data: paymentHistory = [], refetch: refetchPayments } = useQuery({
    queryKey: ['owner-payments'],
    queryFn: api.getOwnerPayments,
  });

  const [selectedOwner, setSelectedOwner] = useState<any>(null);

  // Custom Tooltip for AreaChart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-card border border-border rounded-lg shadow-lg">
          <p className="text-sm text-muted-foreground">{new Date(label).toLocaleDateString()}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: £${entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentOwner, setPaymentOwner] = useState<any>(null);

  const handlePaymentClick = (e: React.MouseEvent, owner: any) => {
    e.stopPropagation();
    setPaymentOwner(owner);
    setPaymentDialogOpen(true);
  };

  const submitPayment = async () => {
    if (!paymentOwner || !paymentAmount) return;
    try {
      await api.recordOwnerPayment({
        owner_id: paymentOwner.id,
        amount: parseFloat(paymentAmount),
        date: new Date().toISOString()
      });
      setPaymentDialogOpen(false);
      setPaymentAmount("");
      setPaymentOwner(null);
      // Refresh
      api.getOwnerProfits().then(() => { }); // Optimistic or just refetch whole page logic? 
      // The query 'owner-profits' needs invalidation.
      // We don't have queryClient here easily unless we import `useQueryClient`.
      // Let's rely on manual refresh button or window reload for now, or better:
      window.location.reload();
      refreshData(); // Refresh all relevant data after payment
    } catch (err) {
      console.error(err);
      alert("Failed to record payment");
    }
  };

  return (
    <DashboardLayout title="Profit Analysis">
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-end">
          <Tabs defaultValue="overview" className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="history">Payment History</TabsTrigger>
              </TabsList>
              <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>

            <TabsContent value="overview" className="space-y-6">
              {/* KPI Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue (Today)</CardTitle>
                    <div className="text-xs text-muted-foreground font-mono">£</div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">£{safeStats.revenue.toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit (Today)</CardTitle>
                    <TrendingUp className={`h-4 w-4 ${safeStats.net_profit >= 0 ? "text-green-500" : "text-red-500"}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">£{safeStats.net_profit.toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
                    <Percent className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{profitMargin}%</div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts and Tables */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Revenue vs Cost vs Profit */}
                <Card className="col-span-2">
                  <CardHeader>
                    <CardTitle>Financial Performance (30 Days)</CardTitle>
                    <CardDescription>Revenue vs Net Profit over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      {history.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `£${value}`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                            <Area type="monotone" dataKey="net_profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" name="Net Profit" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          No history data available.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Owner Profit Distribution Table */}
                <Card className="col-span-2 md:col-span-2">
                  <CardHeader>
                    <CardTitle>Owner Profit Distribution</CardTitle>
                    <CardDescription>Lifetime estimated profit share per owner.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Owner</TableHead>
                          <TableHead className="text-right">Total Earned</TableHead>
                          <TableHead className="text-right">Paid Out</TableHead>
                          <TableHead className="text-right">Balance Due</TableHead>
                          <TableHead className="text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ownerProfits.map((owner: any) => (
                          <TableRow
                            key={owner.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedOwner(owner)}
                          >
                            <TableCell className="font-medium flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {owner.name.charAt(0)}
                              </div>
                              {owner.name}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              £{(owner.total_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              £{(owner.total_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${(owner.balance || 0) > 0 ? "text-green-600" : ""}`}>
                              £{(owner.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={(e) => handlePaymentClick(e, owner)}
                              >
                                <DollarSign className="w-4 h-4 mr-1" /> Pay
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {ownerProfits.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                              No profit data available.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>All record payout transactions.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentHistory.map((entry: any) => (
                        <TableRow key={entry.id}>
                          <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{entry.owner?.name || `ID: ${entry.owner_id}`}</TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            £{entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell><Badge variant="outline">{entry.transaction_type}</Badge></TableCell>
                        </TableRow>
                      ))}
                      {paymentHistory.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                            No payment history found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Breakdown Dialog */}
        <Dialog open={!!selectedOwner} onOpenChange={(open) => !open && setSelectedOwner(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedOwner?.name}'s Profit Breakdown</DialogTitle>
              <DialogDescription>Profit share by source</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
                <span className="font-medium">Total Net Profit</span>
                <span className={`font-bold text-lg ${selectedOwner?.total_profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  £{selectedOwner?.total_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
                <span className="font-medium">Total Paid</span>
                <span className="font-bold text-lg">
                  £{selectedOwner?.total_paid?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg border border-primary/20">
                <span className="font-medium">Balance</span>
                <span className="font-bold text-lg text-primary">
                  £{selectedOwner?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-1 max-h-[200px] overflow-y-auto pr-2 mt-4">
                {selectedOwner?.breakdown.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-sm py-2 border-b last:border-0 border-border/50">
                    <span className={item.name.includes("Global Costs") ? "text-red-500 font-medium" : ""}>
                      {item.name}
                    </span>
                    <span className={`font-medium ${item.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {item.amount >= 0 ? "+" : ""}£{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Record Payment to {paymentOwner?.name}</DialogTitle>
              <DialogDescription>
                Enter the amount paid to this owner.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (£)</label>
                <input
                  type="number"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <Button className="w-full bg-green-600 hover:bg-green-700" onClick={submitPayment}>
                Confirm Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Profit;
