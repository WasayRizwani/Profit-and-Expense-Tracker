import { ShoppingBag, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const transactions = [
  { id: 1, source: "Shopify", date: "Oct 25", amount: 120, icon: ShoppingBag },
  { id: 2, source: "Shopify", date: "Oct 25", amount: 140, icon: ShoppingBag },
  { id: 3, source: "Shopify", date: "Oct 25", amount: 120, icon: ShoppingBag },
  { id: 4, source: "Shopify", date: "Oct 25", amount: 120, icon: ShoppingBag },
  { id: 5, source: "Shopify", date: "Oct 25", amount: 130, icon: ShoppingCart },
  { id: 6, source: "Shopify", date: "Oct 25", amount: 120, icon: ShoppingBag },
];

export function RecentTransactions() {
  return (
    <Card className="animate-fade-in border-border bg-card" style={{ animationDelay: "300ms" }}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">Recent Transactions</CardTitle>
        <Select defaultValue="mele">
          <SelectTrigger className="h-8 w-20 border-border bg-card text-sm">
            <SelectValue placeholder="Mele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mele">Mele</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {transactions.map((transaction, index) => (
          <div
            key={transaction.id}
            className="animate-slide-in flex items-center justify-between"
            style={{ animationDelay: `${400 + index * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                <transaction.icon className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{transaction.date},</p>
                <p className="text-sm text-muted-foreground">{transaction.source}</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-foreground">£{transaction.amount}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
