import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Product } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ViewProductDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product | null;
}

export const ViewProductDialog = ({ open, onOpenChange, product }: ViewProductDialogProps) => {
    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{product.name}</DialogTitle>
                    <DialogDescription className="space-y-1">
                        <div>SKU: {product.sku}</div>
                        {product.product_url && (
                            <a
                                href={product.product_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                View Product Page
                            </a>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-secondary/10 rounded-lg border border-border/50 text-center">
                            <div className="text-sm text-muted-foreground">Current Stock</div>
                            <div className="text-2xl font-bold">{product.current_stock}</div>
                        </div>
                        <div className="p-4 bg-secondary/10 rounded-lg border border-border/50 text-center">
                            <div className="text-sm text-muted-foreground">Cost Price</div>
                            <div className="text-2xl font-bold">£{product.cost_price?.toFixed(2)}</div>
                        </div>
                    </div>

                    {/* Equity Table */}
                    <div>
                        <h4 className="mb-4 text-sm font-medium leading-none">Equity Distribution</h4>
                        <div className="rounded-md border border-border/50">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Owner</TableHead>
                                        <TableHead className="text-right">Equity Share</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {product.equities && product.equities.length > 0 ? (
                                        product.equities.map((eq) => (
                                            <TableRow key={eq.owner_id}>
                                                <TableCell className="font-medium">
                                                    {eq.owner?.name || `Owner ID: ${eq.owner_id}`}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="secondary" className="font-mono">
                                                        {eq.equity_percentage}%
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                                                No specific equity distribution set.
                                                <br />
                                                <span className="text-xs">
                                                    (Profits will follow global company equity)
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
