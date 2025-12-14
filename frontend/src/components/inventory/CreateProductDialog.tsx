import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { PackagePlus } from "lucide-react";

export function CreateProductDialog() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [sku, setSku] = useState("");

    // Equity State: { ownerId: percentage }
    const [equityMap, setEquityMap] = useState<Record<number, number>>({});

    const { data: owners = [] } = useQuery({
        queryKey: ['owners'],
        queryFn: () => api.getOwners(),
    });

    const createProductMutation = useMutation({
        mutationFn: api.createProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast({ title: "Product Created", description: "Product has been added to inventory." });
            setOpen(false);
            // Reset
            setName("");
            setSku("");
            setEquityMap({});
        },
        onError: (error: any) => {
            // Handle duplicate SKU or other errors
            const msg = error.message.includes("400") ? "SKU might already exist." : "Failed to create product.";
            toast({ title: "Error", description: msg, variant: "destructive" });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Construct equities list
        const equities = Object.entries(equityMap).map(([ownerId, pct]) => ({
            owner_id: parseInt(ownerId),
            equity_percentage: pct
        })).filter(e => e.equity_percentage > 0);

        createProductMutation.mutate({
            name,
            sku,
            equities,
            // Backend handles defaults for price/cost_price
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300">
                    <PackagePlus className="mr-2 h-4 w-4" /> New Product
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Product</DialogTitle>
                    <DialogDescription>
                        Define product details and initial equity distribution.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Product Name</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. T-Shirt" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sku">SKU</Label>
                                <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} required placeholder="e.g. TSH-001" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 border-t pt-4">
                        <Label>Initial Equity Share</Label>
                        <p className="text-xs text-muted-foreground pb-2">Assign profit share for this product (Default is user's global equity if left 0)</p>
                        <div className="rounded-md border max-h-[200px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="h-8">
                                        <TableHead className="py-2">Owner</TableHead>
                                        <TableHead className="py-2 text-right">Share %</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {owners.map((owner: any) => (
                                        <TableRow key={owner.id} className="h-10">
                                            <TableCell className="py-2">{owner.name}</TableCell>
                                            <TableCell className="py-2 text-right flex justify-end items-center gap-1">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    className="w-16 h-7 text-right"
                                                    value={equityMap[owner.id] || ""}
                                                    placeholder={owner.equity_percentage.toString()}
                                                    onChange={(e) => setEquityMap({
                                                        ...equityMap,
                                                        [owner.id]: parseFloat(e.target.value) || 0
                                                    })}
                                                />
                                                <span className="text-xs text-muted-foreground">%</span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={createProductMutation.isPending}>
                        {createProductMutation.isPending ? "Creating..." : "Create Product"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
