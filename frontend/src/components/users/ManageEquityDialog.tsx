import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api, Product, ProductEquity } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Settings2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
    owner: { id: number; name: string; product_equities?: any[] };
}

export function ManageEquityDialog({ owner }: Props) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    // Fetch products to list them
    const { data: products = [] } = useQuery({
        queryKey: ['products'],
        queryFn: () => api.getProducts(),
    });

    // Local state for equity values map: { productId: percentage }
    const [equityMap, setEquityMap] = useState<Record<number, number>>({});

    // Initialize map when dialog opens or data loads
    const initializeMap = () => {
        const map: Record<number, number> = {};
        // Populate from owner's existing equities
        if (owner.product_equities) {
            owner.product_equities.forEach((eq: any) => {
                map[eq.product_id] = eq.equity_percentage;
            });
        }
        setEquityMap(map);
    };

    const mutation = useMutation({
        mutationFn: async (data: { product_id: number; equity_percentage: number }) => {
            return api.setOwnerProductEquity(owner.id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['owners'] });
            toast({ title: "Equity Updated", description: "Product equity settings saved." });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to update equity", variant: "destructive" });
        }
    });

    const handleSave = async () => {
        // Save all changes
        // In a real app, we might want to only save changed ones, but iterating is fine for small N
        try {
            for (const product of products) {
                const val = equityMap[product.id];
                if (val !== undefined) {
                    await mutation.mutateAsync({ product_id: product.id, equity_percentage: val });
                }
            }
            setOpen(false);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (val) initializeMap();
            setOpen(val);
        }}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Settings2 className="h-4 w-4 mr-2" /> Manage Equity
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Manage Equity for {owner.name}</DialogTitle>
                    <DialogDescription>
                        Set profit share percentage for specific products.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[300px] w-full pr-4">
                    <div className="space-y-4">
                        {products.map((product: Product) => (
                            <div key={product.id} className="flex items-center justify-between space-x-4 border-b pb-2">
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm">{product.name}</span>
                                    <span className="text-xs text-muted-foreground">{product.sku}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        className="w-20 text-right"
                                        value={equityMap[product.id] ?? 0}
                                        onChange={(e) => setEquityMap({
                                            ...equityMap,
                                            [product.id]: parseFloat(e.target.value) || 0
                                        })}
                                    />
                                    <span className="text-sm">%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <div className="flex justify-end pt-4">
                    <Button onClick={handleSave} disabled={mutation.isPending}>
                        {mutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
