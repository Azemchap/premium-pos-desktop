// src/pages/Notifications.tsx - Notification Center
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { parseUTCDate } from "@/lib/date-utils";
import { useAuthStore } from "@/store/authStore";
import { invoke } from "@tauri-apps/api/core";
import { formatDistance } from "date-fns";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle,
  Clock,
  DollarSign,
  Info,
  Mail,
  Package,
  Trash2,
  XCircle
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  user_id?: number;
  reference_id?: number;
  reference_type?: string;
  created_at: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  low_stock: number;
  system: number;
}

export default function Notifications() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterRead, setFilterRead] = useState("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [notifs, statsData] = await Promise.all([
        invoke<Notification[]>("get_notifications", {
          userId: user?.id,
          isRead: filterRead === "all" ? undefined : filterRead === "unread" ? false : true,
          notificationType: filterType !== "all" ? filterType : undefined,
          limit: 100,
        }),
        invoke<NotificationStats>("get_notification_stats", {
          userId: user?.id,
        }),
      ]);

      setNotifications(notifs);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await invoke("mark_notification_read", { notificationId: id });
      toast.success("Marked as read");
      loadNotifications();
    } catch (error) {
      console.error("Failed to mark as read:", error);
      toast.error("Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      await invoke("mark_all_notifications_read", { userId: user?.id });
      toast.success("All notifications marked as read");
      loadNotifications();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const deleteNotification = async () => {
    if (!deleteId) return;

    try {
      await invoke("delete_notification", { notificationId: deleteId });
      toast.success("Notification deleted");
      setDeleteId(null);
      loadNotifications();
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  const checkLowStock = async () => {
    try {
      const count = await invoke<number>("check_low_stock_alerts");

      if (count > 0) {
        toast.success(`Found ${count} new low stock alert(s)`);
        loadNotifications();
      } else {
        toast.info("No new low stock items");
      }
    } catch (error) {
      console.error("Failed to check low stock:", error);
      toast.error("Failed to check low stock");
    }
  };

  const clearAllNotifications = async () => {
    if (!confirm("Are you sure you want to delete all notifications? This action cannot be undone.")) {
      return;
    }

    try {
      await Promise.all(
        notifications.map((notification) =>
          invoke("delete_notification", { notificationId: notification.id })
        )
      );

      toast.success("All notifications cleared");
      setNotifications([]);
      setStats({ total: 0, unread: 0, low_stock: 0, system: 0 });
    } catch (error) {
      console.error("Failed to clear all notifications:", error);
      toast.error("Failed to clear notifications");
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [filterType, filterRead]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "low_stock":
        return <Package className="w-5 h-5" />;
      case "payment":
      case "invoice":
        return <DollarSign className="w-5 h-5" />;
      case "email":
        return <Mail className="w-5 h-5" />;
      case "system":
        return <Info className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "text-red-600";
      case "warning":
        return "text-yellow-600";
      case "success":
        return "text-green-600";
      default:
        return "text-blue-600";
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-lg  md:text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with alerts and system messages
          </p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="outline" onClick={checkLowStock}>
            <Package className="w-4 h-4 mr-2" />
            Check Low Stock
          </Button>
          {stats && stats.unread > 0 && (
            <Button onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold">{stats.total}</p>
                </div>
                <Bell className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unread</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600">{stats.unread}</p>
                </div>
                <BellOff className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600">{stats.low_stock}</p>
                </div>
                <Package className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">System</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold">{stats.system}</p>
                </div>
                <Info className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            <div className="space-y-2">
              <Label>Filter by Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filter by Status</Label>
              <Select value={filterRead} onValueChange={setFilterRead}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Notifications</SelectItem>
                  <SelectItem value="unread">Unread Only</SelectItem>
                  <SelectItem value="read">Read Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button 
                onClick={clearAllNotifications} 
                variant="outline" 
                className="w-full"
                disabled={notifications.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2 md:space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-6 md:py-12">
              <Bell className="w-12 h-12 mx-auto mb-2 md:mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No notifications</h3>
              <p className="text-muted-foreground mb-2 md:mb-4">
                You're all caught up!
              </p>
              <Button variant="outline" onClick={checkLowStock}>
                <Package className="w-4 h-4 mr-2" />
                Check Low Stock
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Notification</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[120px]">Time</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notification) => (
                  <TableRow 
                    key={notification.id}
                    className={!notification.is_read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}
                  >
                    <TableCell>
                      <div className={`p-2 rounded-lg ${
                        notification.severity === 'error' 
                          ? 'bg-red-100 dark:bg-red-900/30' 
                          : notification.severity === 'warning'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30'
                          : notification.severity === 'success'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        <div className={getSeverityColor(notification.severity)}>
                          {getNotificationIcon(notification.notification_type)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                          <span className="font-medium">{notification.title}</span>
                          {!notification.is_read && (
                            <Badge variant="destructive" className="text-xs">New</Badge>
                          )}
                          {getSeverityIcon(notification.severity)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {notification.notification_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistance(parseUTCDate(notification.created_at), new Date(), {
                          addSuffix: true,
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(notification.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification?</AlertDialogTitle>
            <AlertDialogDescription>
              This notification will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteNotification}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
