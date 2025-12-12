// src/pages/TimeTracking.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { invoke } from "@tauri-apps/api/core";
import {
  Clock,
  Edit,
  Loader2,
  LogIn,
  LogOut,
  MoreHorizontal,
  Play,
  Plus,
  Square,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// Zod validation schema
const timeEntrySchema = z.object({
  employee_id: z.number().min(1, "Employee is required"),
  clock_in: z.string().min(1, "Clock in time is required"),
  clock_out: z.string().optional(),
  notes: z.string().max(500, "Notes are too long").optional(),
});

type TimeEntryFormData = z.infer<typeof timeEntrySchema>;

interface TimeEntry {
  id: number;
  employee_id: number;
  employee_name: string;
  clock_in: string;
  clock_out?: string;
  total_hours?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
}

export default function TimeTracking() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [formData, setFormData] = useState<TimeEntryFormData>({
    employee_id: 0,
    clock_in: new Date().toISOString().slice(0, 16),
    clock_out: "",
    notes: "",
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null);

  const loadTimeEntries = async () => {
    try {
      setLoading(true);
      const result = await invoke<TimeEntry[]>("get_time_entries", {
        startDate,
        endDate,
      });
      setTimeEntries(result);

      // Check for active entry
      const active = result.find(e => !e.clock_out);
      setActiveEntry(active || null);
    } catch (error) {
      console.error("Failed to load time entries:", error);
      toast.error("Failed to load time entries");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const result = await invoke<Employee[]>("get_employees");
      setEmployees(result);
    } catch (error) {
      console.error("Failed to load employees:", error);
      toast.error("Failed to load employees");
    }
  };

  const validateForm = (): boolean => {
    try {
      timeEntrySchema.parse(formData);
      setValidationErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setValidationErrors(errors);
        toast.error("Please fix validation errors");
      }
      return false;
    }
  };



  const handleClockOut = async () => {
    if (!activeEntry) return;

    try {
      await invoke("clock_out", {
        entryId: activeEntry.id,
        clockOut: new Date().toISOString(),
      });
      toast.success("✅ Clocked out successfully!");
      setActiveEntry(null);
      loadTimeEntries();
    } catch (error) {
      console.error("Failed to clock out:", error);
      toast.error(`❌ Failed to clock out: ${error}`);
    }
  };

  const handleCreateTimeEntry = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingEntry) {
        await invoke("update_time_entry", {
          entryId: editingEntry.id,
          request: formData,
        });
        toast.success("✅ Time entry updated successfully!");
      } else {
        await invoke("create_time_entry", {
          request: formData,
        });
        toast.success("✅ Time entry created successfully!");
      }

      setIsDialogOpen(false);
      resetForm();
      loadTimeEntries();
    } catch (error) {
      console.error("Failed to save time entry:", error);
      toast.error(`❌ Failed to save time entry: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTimeEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setFormData({
      employee_id: entry.employee_id,
      clock_in: entry.clock_in.slice(0, 16),
      clock_out: entry.clock_out ? entry.clock_out.slice(0, 16) : "",
      notes: entry.notes || "",
    });
    setValidationErrors({});
    setIsDialogOpen(true);
  };

  const handleDeleteTimeEntry = (entryId: number) => {
    setEntryToDelete(entryId);
  };

  const executeDeleteTimeEntry = async () => {
    if (!entryToDelete) return;

    try {
      await invoke("delete_time_entry", { entryId: entryToDelete });
      toast.success("Time entry deleted successfully!");
      loadTimeEntries();
    } catch (error) {
      console.error("Failed to delete time entry:", error);
      toast.error(`Failed to delete time entry: ${error}`);
    } finally {
      setEntryToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: 0,
      clock_in: new Date().toISOString().slice(0, 16),
      clock_out: "",
      notes: "",
    });
    setEditingEntry(null);
    setValidationErrors({});
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Auto-filter time entries
  const filteredEntries = useMemo(() => {
    return timeEntries.filter((entry) => {
      const matchesEmployee = selectedEmployee === "all" || entry.employee_id === parseInt(selectedEmployee);
      return matchesEmployee;
    });
  }, [timeEntries, selectedEmployee]);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    loadTimeEntries();
  }, [startDate, endDate]);

  // Statistics
  const totalHours = filteredEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
  const activeEmployees = new Set(filteredEntries.map(e => e.employee_id)).size;
  const totalEntries = filteredEntries.length;

  const formatDuration = (hours?: number) => {
    if (!hours) return "—";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={Clock}
        title="Time Tracking"
        subtitle="Track employee work hours"
        actions={
          <div className="flex gap-2">
            {activeEntry ? (
              <Button onClick={handleClockOut} size="sm" variant="destructive" className="shadow-md">
                <Square className="w-4 h-4" /> Clock Out
              </Button>
            ) : (
              <Button onClick={openCreateDialog} size="sm" variant="outline" className="shadow-md">
                <Plus className="w-4 h-4" /> Add Entry
              </Button>
            )}
          </div>
        }
      />

      {/* Active Clock-In Banner */}
      {activeEntry && (
        <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-2 border-green-300 dark:border-green-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    {activeEntry.employee_name} is clocked in
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Started at {formatTime(activeEntry.clock_in)}
                  </p>
                </div>
              </div>
              <Button onClick={handleClockOut} variant="destructive" size="sm">
                <Square className="w-4 h-4 mr-2" />
                Clock Out
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-2 border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">Total Hours</p>
                <p className="text-xl md:text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {formatDuration(totalHours)}
                </p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-2 border-green-200 dark:border-green-800 shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">Employees</p>
                <p className="text-xl md:text-2xl font-bold text-green-900 dark:text-green-100">{activeEmployees}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-2 border-purple-200 dark:border-purple-800 shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300">Entries</p>
                <p className="text-xl md:text-2xl font-bold text-purple-900 dark:text-purple-100">{totalEntries}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-none">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="employee" className="text-xs">
                Employee
              </Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.first_name} {employee.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="start-date" className="text-xs">
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="end-date" className="text-xs">
                End Date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <div className="mt-1.5 text-[11px] sm:text-xs text-muted-foreground">
            Showing {filteredEntries.length} time entries
          </div>
        </CardContent>
      </Card>

      {/* Time Entries Table */}
      <Card className="shadow-md border-2 hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b-2">
          <CardTitle className="text-lg font-bold">Time Entries</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {loading ? (
            <div className="space-y-2 md:space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gradient-to-r from-muted/50 to-muted/30">
                      <TableRow>
                        <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                          Employee
                        </TableHead>
                        <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                          Clock In
                        </TableHead>
                        <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                          Clock Out
                        </TableHead>
                        <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                          Duration
                        </TableHead>
                        <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">
                          Notes
                        </TableHead>
                        <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/30">
                      {filteredEntries.map((entry) => (
                        <TableRow
                          key={entry.id}
                          className="hover:bg-primary/5 transition-all duration-200"
                        >
                          <TableCell className="px-4 py-3">
                            <div className="font-semibold text-sm">{entry.employee_name}</div>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-sm">
                              <LogIn className="w-3 h-3 text-green-600" />
                              {formatTime(entry.clock_in)}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            {entry.clock_out ? (
                              <div className="flex items-center gap-1.5 text-sm">
                                <LogOut className="w-3 h-3 text-red-600" />
                                {formatTime(entry.clock_out)}
                              </div>
                            ) : (
                              <Badge variant="default" className="text-xs">
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3 hidden md:table-cell">
                            <div className="font-semibold text-sm">
                              {formatDuration(entry.total_hours)}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 hidden lg:table-cell">
                            {entry.notes ? (
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {entry.notes}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditTimeEntry(entry)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteTimeEntry(entry.id)}
                                  className="text-destructive"
                                >
                                  <LogOut className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {!loading && filteredEntries.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No time entries found</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                {selectedEmployee !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by adding a time entry"}
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Time Entry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Time Entry Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingEntry ? "Edit Time Entry" : "Add Time Entry"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {editingEntry
                ? "Update the time entry details below."
                : "Fill in the time entry details."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="employee_id" className="text-xs font-medium">
                Employee *
              </Label>
              <Select
                value={formData.employee_id.toString()}
                onValueChange={(value) => setFormData({ ...formData, employee_id: parseInt(value) })}
              >
                <SelectTrigger className={`h-9 text-sm ${validationErrors.employee_id ? "border-red-500" : ""}`}>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.first_name} {employee.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.employee_id && <p className="text-xs text-red-500">{validationErrors.employee_id}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clock_in" className="text-xs font-medium">
                Clock In *
              </Label>
              <Input
                id="clock_in"
                type="datetime-local"
                value={formData.clock_in}
                onChange={(e) => setFormData({ ...formData, clock_in: e.target.value })}
                className={`h-9 text-sm ${validationErrors.clock_in ? "border-red-500" : ""}`}
              />
              {validationErrors.clock_in && <p className="text-xs text-red-500">{validationErrors.clock_in}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clock_out" className="text-xs font-medium">
                Clock Out
              </Label>
              <Input
                id="clock_out"
                type="datetime-local"
                value={formData.clock_out}
                onChange={(e) => setFormData({ ...formData, clock_out: e.target.value })}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-medium">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any notes (optional)"
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTimeEntry} disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingEntry ? (
                "Update Entry"
              ) : (
                "Add Entry"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!entryToDelete}
        onOpenChange={(open) => !open && setEntryToDelete(null)}
        title="Delete Time Entry"
        description="Are you sure you want to delete this time entry?"
        onConfirm={executeDeleteTimeEntry}
        confirmText="Delete"
        variant="destructive"
      />
    </div >
  );
}
