import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, TrendingDown, DollarSign, CreditCard, Receipt, RefreshCw, Plus, Users as UsersIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Expense } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c'];

const Expenses = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Pagination State
  const [page, setPage] = useState(1);
  const limit = 10;

  // Query for Stats/Charts (Fetch larger dataset safely)
  const { data: statsExpenses = [], isLoading: isLoadingStats } = useQuery({
    queryKey: ['expenses', 'all'],
    queryFn: () => api.getExpenses(0, 1000), // Fetch up to 1000 for stats/charts
  });

  // Query for Paginated List
  const { data: paginatedExpenses = [], isLoading: isLoadingList, refetch } = useQuery({
    queryKey: ['expenses', 'paginated', page],
    queryFn: () => api.getExpenses((page - 1) * limit, limit),
  });

  const { data: owners = [] } = useQuery({
    queryKey: ['owners'],
    queryFn: () => api.getOwners(),
  });

  const createExpenseMutation = useMutation({
    mutationFn: api.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['top-payers'] });
      toast({ title: "Expense Added", description: "The expense has been recorded successfully." });
      setIsDialogOpen(false);
      // Reset form
      setDescription("");
      setAmount("");
      setCategory("");
      setPaidBy("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add expense", variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = owners.find((o: any) => o.id.toString() === paidBy);
    const finalDescription = user ? `${description} (Paid by ${user.name})` : description;

    createExpenseMutation.mutate({
      date,
      amount: parseFloat(amount),
      category,
      description: finalDescription,
      paid_by_id: user ? user.id : undefined
    });
  };

  // Calculate Aggregates (Use statsExpenses)
  const totalExpenses = statsExpenses.reduce((acc: number, curr: Expense) => acc + curr.amount, 0);

  // Category Breakdown
  const categoryMap = statsExpenses.reduce((acc: Record<string, number>, curr: Expense) => {
    const cat = curr.category || "Uncategorized";
    acc[cat] = (acc[cat] || 0) + curr.amount;
    return acc;
  }, {});

  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  // Monthly Breakdown (Simple approximation by parsing date string)
  const monthMap = statsExpenses.reduce((acc: Record<string, number>, curr: Expense) => {
    const date = new Date(curr.date);
    const month = date.toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + curr.amount;
    return acc;
  }, {});

  // Sort months chronologically if needed, but for now object iteration order might vary.
  // Ideally, use a fixed array of months and fill it.
  const expenseData = Object.entries(monthMap).map(([month, amount]) => ({ month, amount }));

  const largestCategory = categoryData.sort((a, b) => b.value - a.value)[0] || { name: 'N/A', value: 0 };
  const largestCategoryPercent = totalExpenses > 0 ? ((largestCategory.value / totalExpenses) * 100).toFixed(0) : 0;


  return (
    <DashboardLayout title="Expenses">
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoadingList}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingList ? 'animate-spin' : ''}`} /> Refresh
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
                <DialogDescription>Record a new expense and specify who paid for it.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input placeholder="e.g. Office Rent" value={description} onChange={(e) => setDescription(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount (£)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Rent">Rent</SelectItem>
                        <SelectItem value="Salaries">Salaries</SelectItem>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Supplies">Supplies</SelectItem>
                        <SelectItem value="Software">Software</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Paid By</Label>
                    <Select value={paidBy} onValueChange={setPaidBy} required>
                      <SelectTrigger><SelectValue placeholder="Select User" /></SelectTrigger>
                      <SelectContent>
                        {owners.map((owner: any) => (
                          <SelectItem key={owner.id} value={owner.id.toString()}>{owner.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createExpenseMutation.isPending}>
                  {createExpenseMutation.isPending ? "Saving..." : "Save Expense"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{totalExpenses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1 text-green-500 flex items-center">
                {/* Placeholder for trend */}
                <span className="text-muted-foreground">Lifetime Total</span>
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Transaction Count</CardTitle>
              <CreditCard className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsExpenses.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Total recorded transactions</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Largest Category</CardTitle>
              <Receipt className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{largestCategory.name}</div>
              <p className="text-xs text-muted-foreground mt-1">{largestCategoryPercent}% of total expenses</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Expense</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                £{statsExpenses.length > 0 ? (totalExpenses / statsExpenses.length).toFixed(2) : '0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
            </CardContent>
          </Card>
        </div>

        {isLoadingStats ? (
          <div className="text-center py-10 text-muted-foreground">Loading expenses data...</div>
        ) : (
          <>
            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4 bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle>Expense Overview</CardTitle>
                  <CardDescription>Expenses aggregated by month</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expenseData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey="month"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `£${value}`}
                        />
                        <Tooltip
                          cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-3 bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                  <CardDescription>Expenses by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    {categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-muted-foreground">No data for charts</div>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground mt-4">
                    {categoryData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        {entry.name}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Latest financial activity</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paginatedExpenses.map((transaction: Expense) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">{transaction.date} • {transaction.category || "Uncategorized"}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-bold text-sm">-£{transaction.amount.toFixed(2)}</span>
                        <Badge variant="secondary" className="text-[10px] h-5">Paid</Badge>
                      </div>
                    </div>
                  ))}
                  {paginatedExpenses.length === 0 && <div className="text-center text-muted-foreground py-4">No transactions found.</div>}
                </div>
                {/* Pagination Controls */}
                <div className="flex items-center justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-sm font-medium">Page {page}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={paginatedExpenses.length < limit}
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Expense Liability Section Removed */}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Expenses;
