import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api, Product } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

export function AddInventoryDialog() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    // Form State
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [quantity, setQuantity] = useState("");
    const [landingPrice, setLandingPrice] = useState("");

    const { data: products = [] } = useQuery({
        queryKey: ['products'],
        queryFn: () => api.getProducts(),
    });

    const { data: owners = [] } = useQuery({
        queryKey: ['owners'],
        queryFn: () => api.getOwners(),
    });

    const selectedProduct = products.find((p: any) => p.id.toString() === selectedProductId);

    const createBatchMutation = useMutation({
        mutationFn: api.createInventoryBatch,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast({ title: "Inventory Added", description: "Batch added successfully." });
            setOpen(false);
            setQuantity("");
            setLandingPrice("");
            setSelectedProductId("");
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to add inventory", variant: "destructive" });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProductId) return;

        createBatchMutation.mutate({
            product_id: parseInt(selectedProductId),
            quantity: parseInt(quantity),
            landing_price: parseFloat(landingPrice)
        });
    };

    // Helper to get equity from product.equities list
    const getProductEquity = (ownerId: number) => {
        if (!selectedProduct || !selectedProduct.equities) return null;
        const equity = selectedProduct.equities.find((e: any) => e.owner_id === ownerId);
        return equity ? equity.equity_percentage : null;
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" /> Add Inventory
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Add Inventory Batch</DialogTitle>
                    <DialogDescription>
                        Add stock to existing products and view equity distribution.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="product">Product</Label>
                            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map((p: Product) => (
                                        <SelectItem key={p.id} value={p.id.toString()}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedProduct && (
                            <div className="text-sm text-muted-foreground">
                                Current Price: <span className="font-medium text-foreground">£{selectedProduct.price}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Landing Price (Cost)</Label>
                            <Input
                                id="price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={landingPrice}
                                onChange={(e) => setLandingPrice(e.target.value)}
                                placeholder="Cost per unit"
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={createBatchMutation.isPending || !selectedProduct}>
                            {createBatchMutation.isPending ? "Adding..." : "Add Batch"}
                        </Button>
                    </form>

                    {/* Right: Info / Equity */}
                    <div className="space-y-4 border-l pl-6">
                        <h4 className="font-semibold text-sm">Equity Distribution</h4>
                        {!selectedProduct ? (
                            <p className="text-sm text-muted-foreground">Select a product to view equity details.</p>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="h-8">Owner</TableHead>
                                            <TableHead className="h-8 text-right">%</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {owners.map((owner: any) => {
                                            const specificEquity = getProductEquity(owner.id);
                                            // Determine if using specific or global
                                            const isSpecific = specificEquity !== null;
                                            const displayEquity = isSpecific ? specificEquity : owner.equity_percentage;

                                            // Only show those with equity > 0 or specific setting? 
                                            // User likely wants to see everyone involved.

                                            return (
                                                <TableRow key={owner.id} className="h-8">
                                                    <TableCell className="py-1">{owner.name}</TableCell>
                                                    <TableCell className={`py-1 text-right ${isSpecific ? "font-bold text-primary" : "text-muted-foreground"}`}>
                                                        {displayEquity}% {isSpecific ? "(Product)" : "(Global)"}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {selectedProduct && (
                            <div className="mt-4 p-3 bg-muted rounded-md text-xs space-y-1">
                                <p><span className="font-semibold">SKU:</span> {selectedProduct.sku}</p>
                                <p><span className="font-semibold">Current Stock:</span> {selectedProduct.stock_quantity}</p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
