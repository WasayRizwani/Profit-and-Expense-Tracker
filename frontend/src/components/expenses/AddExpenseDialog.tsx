import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

export function AddExpenseDialog({ trigger }: { trigger?: React.ReactNode }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    // Form State
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [paidBy, setPaidBy] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

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
            setOpen(false);
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button><Plus className="mr-2 h-4 w-4" /> Add Expense</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Expense</DialogTitle>
                    <DialogDescription>
                        Record a new business expense.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g., Facebook Ads, Office Supplies"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount (£)</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={category} onValueChange={setCategory} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Ads">Ads</SelectItem>
                                <SelectItem value="Software">Software</SelectItem>
                                <SelectItem value="Freelancers">Freelancers</SelectItem>
                                <SelectItem value="Office">Office</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="paidBy">Paid By (Optional)</Label>
                        <Select value={paidBy} onValueChange={setPaidBy}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select owner" />
                            </SelectTrigger>
                            <SelectContent>
                                {owners.map((owner: any) => (
                                    <SelectItem key={owner.id} value={owner.id.toString()}>
                                        {owner.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" className="w-full" disabled={createExpenseMutation.isPending}>
                        {createExpenseMutation.isPending ? "Adding..." : "Add Expense"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
