import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  delay?: number;
}

export function StatCard({ title, value, change, delay = 0 }: StatCardProps) {
  const isPositive = change >= 0;
  
  return (
    <Card 
      className="animate-fade-in border-border bg-card shadow-sm transition-shadow hover:shadow-md"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="flex items-center justify-between p-6">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            isPositive ? "bg-success/10" : "bg-warning/10"
          )}>
            {isPositive ? (
              <TrendingUp className="h-5 w-5 text-success" />
            ) : (
              <TrendingDown className="h-5 w-5 text-warning" />
            )}
          </div>
          <span className={cn(
            "text-sm font-medium",
            isPositive ? "text-success" : "text-warning"
          )}>
            ({isPositive ? "+" : ""}{change}%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
