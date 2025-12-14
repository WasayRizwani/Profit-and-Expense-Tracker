import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { api, Expense } from "@/lib/api";
import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { useState } from "react";

export const RecentExpenses = () => {
    const [page, setPage] = useState(1);
    const limit = 5;

    const { data: expenses = [], isLoading } = useQuery({
        queryKey: ['expenses', 'recent', page],
        queryFn: () => api.getExpenses((page - 1) * limit, limit),
    });

    return (
        <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-normal">Recent Expenses</CardTitle>
                <AddExpenseDialog trigger={
                    <Button variant="outline" size="sm" className="h-8">
                        <Plus className="mr-2 h-3 w-3" /> Add
                    </Button>
                } />
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                {expenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent expenses</p>
                ) : (
                    <div className="space-y-4">
                        {expenses.map((expense: Expense) => (
                            <div key={expense.id} className="flex items-center justify-between text-sm">
                                <div className="flex flex-col gap-1">
                                    <span className="font-medium">{expense.description}</span>
                                    <span className="text-xs text-muted-foreground">{new Date(expense.date).toLocaleDateString()} &bull; {expense.category}</span>
                                </div>
                                <div className="font-medium text-red-600">
                                    -£{expense.amount.toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex items-center justify-end space-x-2 pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-8 w-8 p-0"
                    >
                        {"<"}
                    </Button>
                    <div className="text-xs text-muted-foreground w-12 text-center">
                        Page {page}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={expenses.length < limit}
                        className="h-8 w-8 p-0"
                    >
                        {">"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
