import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { SalesTrendsChart } from "@/components/dashboard/SalesTrendsChart";
import { RecentExpenses } from "@/components/dashboard/RecentExpenses";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const Index = () => {
  const today = new Date().toISOString().split('T')[0];

  const { data: statsData } = useQuery({
    queryKey: ['dashboardStats', 'lifetime'],
    queryFn: () => api.getDashboardStats(),
  });

  const { data: historyData = [] } = useQuery({
    queryKey: ['history'],
    queryFn: () => api.getHistory(30),
  });

  const stats = [
    {
      title: "Total Revenue",
      value: statsData ? `£${statsData.revenue.toLocaleString()}` : "£0",
      change: 0
    },
    {
      title: "Net Profit",
      value: statsData ? `£${statsData.net_profit.toLocaleString()}` : "£0",
      change: 0
    },
    {
      title: "Ad Spend",
      value: statsData ? `£${statsData.ad_spend.toLocaleString()}` : "£0",
      change: 0
    },
    {
      title: "Expenses",
      value: statsData ? `£${statsData.expenses.toLocaleString()}` : "£0",
      change: 0
    },
  ];

  return (
    <DashboardLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            delay={index * 50}
          />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesTrendsChart data={historyData} />
        </div>
        <div className="lg:col-span-1">
          <RecentExpenses />
          <TopPayersCard />
        </div>
      </div>
    </DashboardLayout>
  );
};

// Sub-component for Top Payers
const TopPayersCard = () => {
  const { data: topPayers = [], isLoading } = useQuery({
    queryKey: ['top-payers'],
    queryFn: () => api.getTopPayers(5),
  });

  return (
    <div className="mt-6 rounded-lg border border-border/50 bg-card/50 text-card-foreground shadow-sm backdrop-blur-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight">Top Payers</h3>
        <p className="text-sm text-muted-foreground">Users with highest expense contributions</p>
      </div>
      <div className="p-6 pt-0">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-4">
            {topPayers.map((payer: any, index: number) => (
              <div key={payer.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium leading-none">{payer.name}</span>
                </div>
                <span className="font-bold text-sm text-muted-foreground">£{payer.amount.toLocaleString()}</span>
              </div>
            ))}
            {topPayers.length === 0 && <div className="text-sm text-muted-foreground">No data available</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
