import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Users as UsersIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ManageEquityDialog } from "@/components/users/ManageEquityDialog";

interface Owner {
    id: number;
    name: string;
    equity_percentage: number;
}

const UsersPage = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [newName, setNewName] = useState("");

    const { data: owners = [], isLoading } = useQuery({
        queryKey: ['owners'],
        queryFn: () => api.getOwners(),
    });

    const createOwnerMutation = useMutation({
        mutationFn: api.createOwner,
        onSuccess: () => {
            toast({ title: "Success", description: "User added successfully" });
            setNewName("");
            toast({ title: "Success", description: "User added successfully" });
            setNewName("");
            setIsDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['owners'] });
            queryClient.invalidateQueries({ queryKey: ['investments'] }); // Update investments page too
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to add user", variant: "destructive" });
        }
    });

    const handleAddUser = () => {
        if (!newName.trim()) {
            toast({ title: "Validation Error", description: "Name is required", variant: "destructive" });
            return;
        }

        createOwnerMutation.mutate({ name: newName, equity_percentage: 0 }); // Default to 0
    };

    return (
        <DashboardLayout title="Users & Owners">
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary hover:bg-primary/90">
                                <Plus className="mr-2 h-4 w-4" /> Add User
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New User</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input
                                        placeholder="Enter user name"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Enter user name"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddUser} disabled={createOwnerMutation.isPending}>
                                    {createOwnerMutation.isPending ? "Adding..." : "Add User"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Existing Users</CardTitle>
                        <CardDescription>List of software users and company owners</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-right">Global Equity</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {owners.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                            {isLoading ? "Loading..." : "No users found. Add one to get started."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    owners.map((owner: Owner) => (
                                        <TableRow key={owner.id}>
                                            <TableCell className="font-mono">#{owner.id}</TableCell>
                                            <TableCell className="font-medium">{owner.name}</TableCell>
                                            <TableCell className="text-right">{owner.equity_percentage}%</TableCell>
                                            <TableCell className="text-right">
                                                <ManageEquityDialog owner={owner} />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default UsersPage;
