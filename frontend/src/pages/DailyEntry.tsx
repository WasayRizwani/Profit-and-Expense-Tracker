import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Trash2, Calendar as CalendarIcon, Info, Save, X, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Product } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface SaleEntry {
  id?: number;
  productId: string;
  quantity: number;
  unitPrice: number;
  type: "SALE" | "RETURN";
}

interface DailyReport {
  id: number;
  date: string;
  total_ad_spend: number;
  notes?: string;
  sales?: any[];
  net_profit?: number;
}

const DailyEntry = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [adSpend, setAdSpend] = useState<number>(0);
  const [entries, setEntries] = useState<SaleEntry[]>([]);
  const [editingReportId, setEditingReportId] = useState<number | null>(null);

  const [currentProduct, setCurrentProduct] = useState("");
  const [currentQty, setCurrentQty] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [currentType, setCurrentType] = useState<"SALE" | "RETURN">("SALE");

  const [exportOpen, setExportOpen] = useState(false);
  const [exportStart, setExportStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]); // First day of month
  const [exportEnd, setExportEnd] = useState(new Date().toISOString().split('T')[0]);

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.getProducts(),
  });

  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: recentReports = [], refetch: refetchReports } = useQuery({
    queryKey: ['reports', page],
    queryFn: () => api.getReports((page - 1) * limit, limit),
  });

  const createReportMutation = useMutation({
    mutationFn: api.createReport,
    onSuccess: () => {
      refetchReports();
    }
  });

  const createSaleMutation = useMutation({
    mutationFn: api.createSale,
  });

  const updateReportMutation = useMutation({
    mutationFn: (data: { id: number; payload: any }) => api.updateReport(data.id, data.payload),
    onSuccess: () => {
      toast({ title: "Success", description: "Report updated successfully" });
      resetForm();
      refetchReports();
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to update report", variant: "destructive" });
    }
  });

  const exportPdfMutation = useMutation({
    mutationFn: () => api.exportReportsPDF(exportStart, exportEnd),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reports_${exportStart}_to_${exportEnd}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setExportOpen(false);
      toast({ title: "Export Successful", description: "Your PDF report has been downloaded." });
    },
    onError: () => {
      toast({ title: "Export Failed", description: "Could not generate PDF report.", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setEntries([]);
    setAdSpend(0);
    setEditingReportId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setCurrentProduct("");
    setCurrentQty("");
    setCurrentPrice("");
    setCurrentType("SALE");
  };

  const handleProductChange = (productId: string) => {
    setCurrentProduct(productId);
    const product = products.find((p: Product) => p.id.toString() === productId);
    if (product) {
      setCurrentPrice(product.price.toString()); // Default to unit price * 1
      setCurrentQty("1");
    }
  };

  const handleAddEntry = () => {
    if (!currentProduct) {
      toast({ title: "Validation Error", description: "Please select a product.", variant: "destructive" });
      return;
    }

    const qty = parseInt(currentQty);
    const totalReceived = parseFloat(currentPrice);

    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Validation Error", description: "Quantity must be greater than 0.", variant: "destructive" });
      return;
    }
    if (isNaN(totalReceived) || totalReceived < 0) {
      toast({ title: "Validation Error", description: "Total received cannot be negative.", variant: "destructive" });
      return;
    }

    // Calculate Unit Price
    const unitPrice = totalReceived / qty;

    setEntries([
      ...entries,
      {
        productId: currentProduct,
        quantity: qty,
        unitPrice: unitPrice,
        type: currentType,
      },
    ]);

    setCurrentProduct("");
    setCurrentQty("");
    setCurrentPrice("");
    setCurrentType("SALE");
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const calculateGrossRevenue = () => {
    return entries.reduce((acc, entry) => {
      const amount = entry.unitPrice * entry.quantity;
      return entry.type === "SALE" ? acc + amount : acc - amount;
    }, 0);
  };

  const handleEditClick = (report: DailyReport) => {
    setEditingReportId(report.id);
    setDate(report.date);
    setAdSpend(report.total_ad_spend);

    if (report.sales) {
      const mappedEntries = report.sales.map((s: any) => ({
        id: s.id,
        productId: s.product_id.toString(),
        quantity: Math.abs(s.quantity),
        unitPrice: s.selling_price,
        type: (s.quantity < 0 ? "RETURN" : "SALE") as "SALE" | "RETURN"
      }));
      setEntries(mappedEntries);
    } else {
      setEntries([]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (entries.length === 0 && adSpend <= 0) {
      toast({ title: "Validation Error", description: "Please add at least one sale or ad spend", variant: "destructive" });
      return;
    }

    try {
      if (editingReportId) {
        // Update Mode
        const payload = {
          total_ad_spend: adSpend,
          sales: entries.map(e => ({
            id: e.id,
            product_id: parseInt(e.productId),
            quantity: e.quantity,
            selling_price: e.unitPrice,
          }))
        };
        updateReportMutation.mutate({ id: editingReportId, payload });
      } else {
        // Create Mode
        const report = await createReportMutation.mutateAsync({
          date,
          total_ad_spend: adSpend,
        });

        for (const entry of entries) {
          await createSaleMutation.mutateAsync({
            report_id: report.id,
            product_id: parseInt(entry.productId),
            quantity: entry.quantity,
            selling_price: entry.unitPrice,
          });
        }

        toast({ title: "Success", description: "Daily entry submitted successfully" });
        resetForm();
        queryClient.invalidateQueries({ queryKey: ['history'] });
        queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        refetchReports();
      }
    } catch (error: any) {
      if (error.message?.includes("already exists") || (error as any)?.response?.status === 400) {
        toast({ title: "Submission Failed", description: "A report for this date likely already exists. Please verify or use a different date.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to submit entry", variant: "destructive" });
      }
      console.error("Submit error:", error);
    }
  };

  const calculateEstimatedCOGS = () => {
    return entries.reduce((acc, entry) => {
      const product = products.find((p: Product) => p.id.toString() === entry.productId);
      const cost = product ? product.cost_price * entry.quantity : 0;
      return entry.type === "SALE" ? acc + cost : acc - cost;
    }, 0);
  };

  const grossRevenue = calculateGrossRevenue();
  const estimatedCOGS = calculateEstimatedCOGS();
  const estimatedNet = grossRevenue - adSpend - estimatedCOGS;

  return (
    <DashboardLayout title="Daily Entry">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Date & Ad Spend */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Details {editingReportId ? "(Editing Mode)" : ""}</CardTitle>
              {editingReportId && (
                <Button variant="ghost" size="sm" onClick={resetForm} className="h-8 px-2 text-muted-foreground">
                  <X className="mr-2 h-4 w-4" /> Cancel Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!!editingReportId} />
              </div>
              <div className="space-y-2">
                <Label>Daily Ad Spend (£)</Label>
                <Input
                  type="number"
                  min="0"
                  value={adSpend}
                  onChange={(e) => setAdSpend(parseFloat(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary Preview */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Summary Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Items Sold</span>
                <span className="font-bold">{entries.filter(e => e.type === "SALE").reduce((acc, e) => acc + e.quantity, 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Returns</span>
                <span className="font-bold text-red-500">{entries.filter(e => e.type === "RETURN").reduce((acc, e) => acc + e.quantity, 0)}</span>
              </div>
              <div className="pt-4 border-t border-primary/20 space-y-2">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-medium">Gross Revenue</span>
                  <span className="font-bold text-primary">£{grossRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>- Ad Spend</span>
                  <span>£{adSpend.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span>- Est. COGS</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Estimated Cost of Goods Sold</p>
                          <p className="text-xs text-muted-foreground">Calculated as: Quantity × Product's Current Cost Price</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span>£{estimatedCOGS.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-lg pt-2 border-t">
                  <span className="font-medium">Est. Net Profit</span>
                  <span className={`font-bold ${estimatedNet >= 0 ? "text-green-600" : "text-red-600"}`}>
                    £{estimatedNet.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Products Section */}
        <Card>
          <CardHeader>
            <CardTitle>Sales & Returns</CardTitle>
            <CardDescription>Add products sold or returned today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:w-1/3 space-y-2">
                <Label>Product</Label>
                <Select value={currentProduct} onValueChange={handleProductChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p: Product) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name} ({p.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-1/5 space-y-2">
                <Label>Total Received (£)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Total amount"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                />
              </div>
              <div className="w-full md:w-1/4 space-y-2">
                <Label>Type</Label>
                <Select value={currentType} onValueChange={(val: any) => setCurrentType(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SALE">Sale</SelectItem>
                    <SelectItem value="RETURN">Return</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-1/6 space-y-2">
                <Label>Quantity</Label>
                <Input type="number" min="1" value={currentQty} onChange={(e) => setCurrentQty(e.target.value)} />
              </div>
              <Button
                onClick={handleAddEntry}
                className="w-full md:w-auto"
                disabled={!currentProduct}
              >
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        No items added yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry, idx) => {
                      const product = products.find((p: Product) => p.id.toString() === entry.productId);
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{product?.name || "Unknown"}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${entry.type === "SALE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {entry.type}
                            </span>
                          </TableCell>
                          <TableCell>{entry.quantity}</TableCell>
                          <TableCell className="text-right">£{entry.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            £{(entry.unitPrice * entry.quantity).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => removeEntry(idx)}>
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90"
                onClick={handleSubmit}
                disabled={createReportMutation.isPending || createSaleMutation.isPending || updateReportMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {editingReportId ? "Update Report" : "Submit Daily Entry"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Reports Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>View and manage recent daily entries</CardDescription>
            </div>
            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileText className="mr-2 h-4 w-4" /> Export PDF
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Export Reports to PDF</DialogTitle>
                  <DialogDescription>Select the date range for the report.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={exportStart} onChange={(e) => setExportStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={exportEnd} onChange={(e) => setExportEnd(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={() => exportPdfMutation.mutate()} disabled={exportPdfMutation.isPending}>
                    {exportPdfMutation.isPending ? "Generating PDF..." : "Download PDF"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Ad Spend</TableHead>
                  <TableHead>Est. Net Profit</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentReports.map((report: DailyReport) => {
                  // Calculate metrics for this report (Revenue helps verification but Net Profit comes from API)
                  const revenue = (report.sales || []).reduce((acc: number, s: any) => {
                    return acc + (s.selling_price * s.quantity);
                  }, 0);

                  const netProfit = report.net_profit !== undefined ? report.net_profit : (revenue - report.total_ad_spend);

                  return (
                    <TableRow key={report.id}>
                      <TableCell>{new Date(report.date).toLocaleDateString()}</TableCell>
                      <TableCell>£{report.total_ad_spend.toFixed(2)}</TableCell>
                      <TableCell className={netProfit >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        £{netProfit.toFixed(2)}
                      </TableCell>
                      <TableCell>{report.notes || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(report)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {recentReports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      No reports found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-end space-x-2 py-4">
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
                disabled={recentReports.length < limit}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DailyEntry;
