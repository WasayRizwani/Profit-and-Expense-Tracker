import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Package, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, Product } from "@/lib/api";
import { AddInventoryDialog } from "@/components/inventory/AddInventoryDialog";
import { CreateProductDialog } from "@/components/inventory/CreateProductDialog";
import { ViewProductDialog } from "@/components/inventory/ViewProductDialog";

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // View Product State
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const { data: products = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.getProducts(),
  });

  const filteredInventory = products.filter((item: Product) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatus = (quantity: number) => {
    if (quantity === 0) return "Out of Stock";
    if (quantity < 20) return "Low Stock"; // Arbitrary threshold
    return "In Stock";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Stock": return "bg-green-500/10 text-green-500 hover:bg-green-500/20 box-shadow-none border-green-500/20";
      case "Low Stock": return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 box-shadow-none border-yellow-500/20";
      case "Out of Stock": return "bg-red-500/10 text-red-500 hover:bg-red-500/20 box-shadow-none border-red-500/20";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <DashboardLayout title="Inventory">
      <div className="space-y-6 animate-fade-in">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-10 bg-background/50 border-input/50 focus:bg-background transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <AddInventoryDialog />
            <CreateProductDialog />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : products.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
              <div className="text-xs text-muted-foreground font-mono">£</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : `£${products.reduce((acc: number, item: Product) => acc + (item.cost_price * item.current_stock), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Items</CardTitle>
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : products.filter((i: Product) => i.current_stock < 20).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Table */}
        <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading products...</div>
            ) : isError ? (
              <div className="p-8 text-center text-red-500">Failed to load products.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-muted/50 border-border/50">
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        No products found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map((item: Product) => (
                      <TableRow
                        key={item.id}
                        className="hover:bg-muted/50 border-border/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setViewProduct(item);
                          setIsViewOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">{item.sku}</TableCell>
                        <TableCell className="text-right font-medium">{item.total_sold || 0}</TableCell>
                        <TableCell className="text-right">£{item.price?.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${item.current_stock > 20 ? 'bg-green-500' : item.current_stock > 0 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min((item.current_stock / 100) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{item.current_stock}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={getStatusColor(getStatus(item.current_stock))}>
                            {getStatus(item.current_stock)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        {/* Dialogs */}
        <ViewProductDialog
          open={isViewOpen}
          onOpenChange={setIsViewOpen}
          product={viewProduct}
        />
      </div>
    </DashboardLayout>
  );
};

export default Inventory;
