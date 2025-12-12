import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import PageHeader from "@/components/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Clock,
  Edit,
  Loader2,
  LogIn,
  LogOut,
  Play,
  Plus,
  Square,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import StatCard from "@/components/StatCard";
import TableActions from "@/components/TableActions";

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
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
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
      const active = result.find((e) => !e.clock_out);
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
      toast.success("Clocked out successfully");
      setActiveEntry(null);
      loadTimeEntries();
    } catch (error) {
      console.error("Failed to clock out:", error);
      toast.error(`Failed to clock out: ${error}`);
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
        toast.success("Time entry updated successfully");
      } else {
        await invoke("create_time_entry", {
          request: formData,
        });
        toast.success("Time entry created successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      loadTimeEntries();
    } catch (error) {
      console.error("Failed to save time entry:", error);
      toast.error(`Failed to save time entry: ${error}`);
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
      toast.success("Time entry deleted successfully");
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
      const matchesEmployee =
        selectedEmployee === "all" || entry.employee_id === parseInt(selectedEmployee);
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
  const stats = useMemo(() => {
    const totalHours = filteredEntries.reduce(
      (sum, entry) => sum + (entry.total_hours || 0),
      0
    );
    const activeEmployees = new Set(filteredEntries.map((e) => e.employee_id)).size;
    const totalEntries = filteredEntries.length;

    return { totalHours, activeEmployees, totalEntries };
  }, [filteredEntries]);

  const formatDuration = (hours?: number) => {
    if (!hours) return "0h 0m";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex-none px-3 sm:px-6 py-3 sm:py-4 border-b bg-background/95">
        <PageHeader
          icon={Clock}
          title="Time Tracking"
          subtitle="Track employee work hours and attendance"
          actions={
            <div className="flex gap-2">
              {activeEntry ? (
                <Button onClick={handleClockOut} size="sm" variant="destructive">
                  <Square className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Clock Out</span>
                  <span className="sm:hidden">Out</span>
                </Button>
              ) : (
                <Button onClick={openCreateDialog} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Add Entry</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Active Clock-In Banner */}
          {activeEntry && (
            <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-2 border-green-300 dark:border-green-700 shadow-md">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                      <Play className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm sm:text-base text-green-900 dark:text-green-100 line-clamp-1">
                        {activeEntry.employee_name} is clocked in
                      </p>
                      <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                        Started at {formatTime(activeEntry.clock_in)}
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleClockOut} variant="destructive" size="sm" className="flex-shrink-0">
                    <Square className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Clock Out</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <StatCard
              title="Total Hours"
              value={formatDuration(stats.totalHours)}
              icon={Clock}
              gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            />
            <StatCard
              title="Active Employees"
              value={stats.activeEmployees}
              icon={Users}
              gradient="bg-gradient-to-br from-green-500 to-emerald-600"
            />
            <StatCard
              title="Total Entries"
              value={stats.totalEntries}
              icon={TrendingUp}
              gradient="bg-gradient-to-br from-purple-500 to-purple-600"
            />
          </div>

          {/* Filters */}
          <Card className="shadow-md">
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee" className="text-xs sm:text-sm font-medium">
                    Employee
                  </Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="h-9">
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

                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-xs sm:text-sm font-medium">
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date" className="text-xs sm:text-sm font-medium">
                    End Date
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Showing {filteredEntries.length} time {filteredEntries.length === 1 ? "entry" : "entries"}
              </div>
            </CardContent>
          </Card>

          {/* Time Entries Table */}
          <Card className="shadow-md">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="font-semibold text-base mb-2">No time entries found</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    {selectedEmployee !== "all"
                      ? "Try adjusting your filters"
                      : "Get started by adding a time entry"}
                  </p>
                  <Button onClick={openCreateDialog} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Time Entry
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-9 px-2 sm:px-4 text-xs">Employee</TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs">Clock In</TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs">Clock Out</TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs hidden md:table-cell">
                          Duration
                        </TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs hidden lg:table-cell">
                          Notes
                        </TableHead>
                        <TableHead className="h-9 px-2 sm:px-4 text-xs text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.map((entry) => (
                        <TableRow key={entry.id} className="hover:bg-muted/50">
                          <TableCell className="px-2 sm:px-4 py-2">
                            <p className="font-medium text-xs sm:text-sm line-clamp-1">
                              {entry.employee_name}
                            </p>
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2">
                            <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                              <LogIn className="w-3 h-3 text-green-600 flex-shrink-0" />
                              <span className="line-clamp-1">{formatTime(entry.clock_in)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2">
                            {entry.clock_out ? (
                              <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                                <LogOut className="w-3 h-3 text-red-600 flex-shrink-0" />
                                <span className="line-clamp-1">{formatTime(entry.clock_out)}</span>
                              </div>
                            ) : (
                              <Badge variant="default" className="text-[10px]">
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 hidden md:table-cell">
                            <p className="font-semibold text-xs">
                              {formatDuration(entry.total_hours)}
                            </p>
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 hidden lg:table-cell">
                            {entry.notes ? (
                              <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                                {entry.notes}
                              </p>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-right">
                            <TableActions
                              actions={[
                                {
                                  label: "Edit",
                                  icon: Edit,
                                  onClick: () => handleEditTimeEntry(entry),
                                },
                                {
                                  label: "Delete",
                                  icon: Trash2,
                                  onClick: () => handleDeleteTimeEntry(entry.id),
                                  variant: "destructive",
                                },
                              ]}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Create/Edit Time Entry Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg p-0 gap-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b flex-none">
            <DialogTitle className="text-base sm:text-lg">
              {editingEntry ? "Edit Time Entry" : "Add Time Entry"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {editingEntry
                ? "Update the time entry details below"
                : "Fill in the time entry details"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 sm:px-6 py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee_id" className="text-xs sm:text-sm font-medium">
                  Employee <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.employee_id.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, employee_id: parseInt(value) })
                  }
                >
                  <SelectTrigger
                    className={`h-9 ${validationErrors.employee_id ? "border-red-500" : ""}`}
                  >
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
                {validationErrors.employee_id && (
                  <p className="text-xs text-red-500">{validationErrors.employee_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clock_in" className="text-xs sm:text-sm font-medium">
                  Clock In <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="clock_in"
                  type="datetime-local"
                  value={formData.clock_in}
                  onChange={(e) => setFormData({ ...formData, clock_in: e.target.value })}
                  className={`h-9 ${validationErrors.clock_in ? "border-red-500" : ""}`}
                />
                {validationErrors.clock_in && (
                  <p className="text-xs text-red-500">{validationErrors.clock_in}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clock_out" className="text-xs sm:text-sm font-medium">
                  Clock Out
                </Label>
                <Input
                  id="clock_out"
                  type="datetime-local"
                  value={formData.clock_out}
                  onChange={(e) => setFormData({ ...formData, clock_out: e.target.value })}
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs sm:text-sm font-medium">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes (optional)"
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="flex-none border-t px-4 sm:px-6 py-3 sm:py-4 flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
              className="flex-1 h-9"
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTimeEntry} disabled={isSubmitting} className="flex-1 h-9">
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
        description="Are you sure you want to delete this time entry? This action cannot be undone."
        onConfirm={executeDeleteTimeEntry}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
