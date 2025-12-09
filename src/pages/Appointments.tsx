// src/pages/Appointments.tsx
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
import { Textarea } from "@/components/ui/textarea";
import { invoke } from "@tauri-apps/api/core";
import {
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Phone,
  Plus,
  User,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const appointmentSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_phone: z.string().min(1, "Phone is required"),
  customer_email: z.string().email("Invalid email").optional().or(z.literal("")),
  service_type: z.string().min(1, "Service type is required"),
  appointment_date: z.string().min(1, "Date is required"),
  appointment_time: z.string().min(1, "Time is required"),
  duration_minutes: z.number().min(15, "Duration must be at least 15 minutes"),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface Appointment {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  service_type: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: string;
  notes?: string;
  created_at: string;
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState<AppointmentFormData>({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    service_type: "",
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: "09:00",
    duration_minutes: 60,
    notes: "",
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const result = await invoke<Appointment[]>("get_appointments", {
        date: selectedDate,
      });
      setAppointments(result);
    } catch (error) {
      console.error("Failed to load appointments:", error);
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    try {
      appointmentSchema.parse(formData);
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

  const handleSaveAppointment = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (editingAppointment) {
        await invoke("update_appointment", {
          appointmentId: editingAppointment.id,
          request: formData,
        });
        toast.success("✅ Appointment updated successfully!");
      } else {
        await invoke("create_appointment", {
          request: formData,
        });
        toast.success("✅ Appointment created successfully!");
      }
      setIsDialogOpen(false);
      resetForm();
      loadAppointments();
    } catch (error) {
      console.error("Failed to save appointment:", error);
      toast.error(`❌ Failed to save appointment: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await invoke("update_appointment_status", {
        appointmentId: id,
        status,
      });
      toast.success(`Appointment marked as ${status}`);
      loadAppointments();
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      service_type: "",
      appointment_date: new Date().toISOString().split('T')[0],
      appointment_time: "09:00",
      duration_minutes: 60,
      notes: "",
    });
    setEditingAppointment(null);
    setValidationErrors({});
  };

  useEffect(() => {
    loadAppointments();
  }, [selectedDate]);

  const filteredAppointments = appointments.filter(apt =>
    statusFilter === "all" || apt.status === statusFilter
  );

  const todayAppointments = appointments.filter(apt =>
    apt.appointment_date === new Date().toISOString().split('T')[0]
  );
  const confirmedCount = appointments.filter(apt => apt.status === "confirmed").length;
  const completedCount = appointments.filter(apt => apt.status === "completed").length;

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
      confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    };
    return colors[status as keyof typeof colors] || "";
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={Calendar}
        title="Appointments"
        subtitle="Manage customer appointments"
        actions={
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} size="sm" className="shadow-md">
            <Plus className="w-4 h-4" /> Book Appointment
          </Button>
        }
      />

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-2 border-blue-200 dark:border-blue-800 shadow-md">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">Today</p>
                <p className="text-xl md:text-2xl font-bold text-blue-900 dark:text-blue-100">{todayAppointments.length}</p>
              </div>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-2 border-green-200 dark:border-green-800 shadow-md">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">Confirmed</p>
                <p className="text-xl md:text-2xl font-bold text-green-900 dark:text-green-100">{confirmedCount}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-2 border-purple-200 dark:border-purple-800 shadow-md">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300">Completed</p>
                <p className="text-xl md:text-2xl font-bold text-purple-900 dark:text-purple-100">{completedCount}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-none">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-xs">Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))
        ) : filteredAppointments.length > 0 ? (
          filteredAppointments.map((apt) => (
            <Card key={apt.id} className="shadow-md border-2 hover:shadow-lg transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {apt.customer_name}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <Phone className="w-3 h-3" />
                      {apt.customer_phone}
                    </div>
                  </div>
                  <Badge className={`${getStatusBadge(apt.status)} border-0 text-xs`}>
                    {apt.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">{apt.appointment_time}</span>
                  <span className="text-muted-foreground">({apt.duration_minutes} min)</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Service:</span> {apt.service_type}
                </div>
                {apt.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{apt.notes}</p>
                )}
                <div className="flex gap-2 pt-2">
                  {apt.status === "pending" && (
                    <Button size="sm" onClick={() => handleStatusChange(apt.id, "confirmed")} className="flex-1">
                      Confirm
                    </Button>
                  )}
                  {apt.status === "confirmed" && (
                    <Button size="sm" onClick={() => handleStatusChange(apt.id, "completed")} className="flex-1">
                      Complete
                    </Button>
                  )}
                  {apt.status !== "cancelled" && apt.status !== "completed" && (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(apt.id, "cancelled")}>
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No appointments found</h3>
              <p className="text-muted-foreground mb-4">No appointments for the selected date</p>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Book Appointment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{editingAppointment ? "Edit Appointment" : "Book Appointment"}</DialogTitle>
            <DialogDescription>Fill in the appointment details</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="customer_name">Customer Name *</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className={validationErrors.customer_name ? "border-red-500" : ""}
              />
              {validationErrors.customer_name && <p className="text-xs text-red-500">{validationErrors.customer_name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="customer_phone">Phone *</Label>
                <Input
                  id="customer_phone"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  className={validationErrors.customer_phone ? "border-red-500" : ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customer_email">Email</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="service_type">Service Type *</Label>
              <Input
                id="service_type"
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                className={validationErrors.service_type ? "border-red-500" : ""}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="appointment_date">Date *</Label>
                <Input
                  id="appointment_date"
                  type="date"
                  value={formData.appointment_date}
                  onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="appointment_time">Time *</Label>
                <Input
                  id="appointment_time"
                  type="time"
                  value={formData.appointment_time}
                  onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="duration_minutes">Duration (minutes) *</Label>
              <Input
                id="duration_minutes"
                type="number"
                min="15"
                step="15"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any special requests or notes"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveAppointment} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
