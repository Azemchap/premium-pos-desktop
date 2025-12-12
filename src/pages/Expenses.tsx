// src/pages/Expenses.tsx - Expense Management
import PageHeader from "@/components/PageHeader";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Expense, CreateExpenseRequest, UpdateExpenseRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Receipt, Plus, Edit, Trash2, DollarSign, Filter } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useCurrency } from "@/hooks/useCurrency";
import { format as formatDate } from "date-fns";

export default function Expenses() {
  const { user } = useAuthStore();
  const { format } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<Partial<CreateExpenseRequest>>({
    description: "",
    amount: 0,
    expense_date: new Date().toISOString().split("T")[0],
    payment_method: "Cash",
    vendor: "",
    reference_number: "",
    notes: "",
  });

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await invoke<Expense[]>("get_expenses", {
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setExpenses(data);
    } catch (error) {
      console.error("Failed to load expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [statusFilter]);

  const stats = {
    total: expenses.reduce((sum, e) => sum + e.amount, 0),
    pending: expenses.filter((e) => e.status === "Pending").length,
    paid: expenses.filter((e) => e.status === "Paid").length,
  };

  const handleCreate = async () => {
    if (!formData.description || !formData.amount) {
      toast.error("Description and amount are required");
      return;
    }

    try {
      setSubmitting(true);
      await invoke("create_expense", { request: formData, userId: user?.id });
      toast.success("Expense created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      loadExpenses();
    } catch (error: unknown) {
      console.error("Failed to create expense:", error);
      toast.error(typeof error === "string" ? error : "Failed to create expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedExpense) return;

    try {
      setSubmitting(true);
      const updateData: UpdateExpenseRequest = {
        description: formData.description,
        amount: formData.amount,
        expense_date: formData.expense_date,
        payment_method: formData.payment_method,
        vendor: formData.vendor,
        notes: formData.notes,
      };

      await invoke("update_expense", { expenseId: selectedExpense.id, request: updateData });
      toast.success("Expense updated successfully");
      setIsEditDialogOpen(false);
      resetForm();
      loadExpenses();
    } catch (error: unknown) {
      console.error("Failed to update expense:", error);
      toast.error(typeof error === "string" ? error : "Failed to update expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedExpense) return;

    try {
      setSubmitting(true);
      await invoke("delete_expense", { expenseId: selectedExpense.id });
      toast.success("Expense deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedExpense(null);
      loadExpenses();
    } catch (error: unknown) {
      console.error("Failed to delete expense:", error);
      toast.error(typeof error === "string" ? error : "Failed to delete expense");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (expense: Expense) => {
    setSelectedExpense(expense);
    setFormData({
      description: expense.description,
      amount: expense.amount,
      expense_date: expense.expense_date,
      payment_method: expense.payment_method as typeof formData.payment_method,
      vendor: expense.vendor || "",
      reference_number: expense.reference_number || "",
      notes: expense.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      description: "",
      amount: 0,
      expense_date: new Date().toISOString().split("T")[0],
      payment_method: "Cash",
      vendor: "",
      reference_number: "",
      notes: "",
    });
    setSelectedExpense(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "Approved": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "Rejected": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Track and manage business expenses"
        icon={Receipt}
        actions={
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs opacity-90 font-medium">Total Expenses</p>
                <p className="text-lg font-bold mt-1">{format(stats.total)}</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs opacity-90 font-medium">Pending</p>
                <p className="text-lg font-bold mt-1">{stats.pending}</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <Receipt className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs opacity-90 font-medium">Paid</p>
                <p className="text-lg font-bold mt-1">{stats.paid}</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <Receipt className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="shadow-md">
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : expenses.length === 0 ? (
        <Card className="shadow-md">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <Receipt className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {statusFilter !== "all" ? "Try adjusting your filter" : "Get started by adding your first expense"}
            </p>
            {statusFilter === "all" && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-base">{expenses.length} Expense{expenses.length !== 1 ? "s" : ""}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {expenses.map((expense) => (
                <div key={expense.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-sm">{expense.description}</h4>
                        <Badge className={`text-xs ${getStatusColor(expense.status)}`}>{expense.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{expense.expense_number}</span>
                        <span className="font-medium text-foreground">{format(expense.amount)}</span>
                        <span>{formatDate(new Date(expense.expense_date), "MMM d, yyyy")}</span>
                        <span>{expense.payment_method}</span>
                        {expense.vendor && <span>{expense.vendor}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(expense)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedExpense(expense); setIsDeleteDialogOpen(true); }} className="hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => { if (!open) { setIsCreateDialogOpen(false); setIsEditDialogOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">{isEditDialogOpen ? "Edit Expense" : "Add New Expense"}</DialogTitle>
            <DialogDescription className="text-sm">{isEditDialogOpen ? "Update expense information" : "Enter expense details"}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="description" className="text-sm">Description <span className="text-destructive">*</span></Label>
              <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Office supplies" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm">Amount <span className="text-destructive">*</span></Label>
              <Input id="amount" type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense_date" className="text-sm">Date</Label>
              <Input id="expense_date" type="date" value={formData.expense_date} onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method" className="text-sm">Payment Method</Label>
              <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value as typeof formData.payment_method })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Debit Card">Debit Card</SelectItem>
                  <SelectItem value="Check">Check</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor" className="text-sm">Vendor</Label>
              <Input id="vendor" value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} placeholder="Vendor name" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes" className="text-sm">Notes</Label>
              <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); setIsEditDialogOpen(false); resetForm(); }} disabled={submitting}>Cancel</Button>
            <Button onClick={isEditDialogOpen ? handleUpdate : handleCreate} disabled={submitting || !formData.description || !formData.amount}>
              {submitting ? "Saving..." : isEditDialogOpen ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">Are you sure you want to delete this expense? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting}>{submitting ? "Deleting..." : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
