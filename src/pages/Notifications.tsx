// src/pages/Notifications.tsx - World-class Notification Center
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Package,
  DollarSign,
  Mail,
  FileText,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { formatDistance } from "date-fns";

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
      toast.error("❌ Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await invoke("mark_notification_read", { notificationId: id });
      toast.success("✅ Marked as read");
      loadNotifications();
    } catch (error) {
      console.error("Failed to mark as read:", error);
      toast.error("❌ Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      await invoke("mark_all_notifications_read", { userId: user?.id });
      toast.success("✅ All notifications marked as read");
      loadNotifications();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("❌ Failed to mark all as read");
    }
  };

  const deleteNotification = async () => {
    if (!deleteId) return;

    try {
      await invoke("delete_notification", { notificationId: deleteId });
      toast.success("🗑️ Notification deleted");
      setDeleteId(null);
      loadNotifications();
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast.error("❌ Failed to delete notification");
    }
  };

  const checkLowStock = async () => {
    try {
      const count = await invoke<number>("check_low_stock_alerts");
      if (count > 0) {
        toast.success(`✅ Created ${count} low stock alert(s)`);
        loadNotifications();
      } else {
        toast.info("ℹ️ No new low stock items");
      }
    } catch (error) {
      console.error("Failed to check low stock:", error);
      toast.error("❌ Failed to check low stock");
    }
  };

  const clearAllNotifications = async () => {
    if (!confirm("Are you sure you want to delete all notifications? This action cannot be undone.")) {
      return;
    }
    
    try {
      // Delete all notifications
      await Promise.all(
        notifications.map((notification) =>
          invoke("delete_notification", { notificationId: notification.id })
        )
      );
      toast.success("🗑️ All notifications cleared");
      loadNotifications();
    } catch (error) {
      console.error("Failed to clear all notifications:", error);
      toast.error("❌ Failed to clear notifications");
    }
  };

  useEffect(() => {
    loadNotifications();
    
    // Auto-check low stock every 5 minutes
    const interval = setInterval(checkLowStock, 300000);
    return () => clearInterval(interval);
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "border-l-4 border-red-500 bg-red-50 dark:bg-red-950 dark:border-red-400";
      case "warning":
        return "border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-400";
      case "success":
        return "border-l-4 border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-400";
      default:
        return "border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with alerts and system messages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={checkLowStock} size="sm">
            <Package className="w-4 h-4 mr-2" />
            Check Low Stock
          </Button>
          {stats && stats.unread > 0 && (
            <Button onClick={markAllAsRead} size="sm">
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read ({stats.unread})
            </Button>
          )}
          {notifications.length > 0 && (
            <Button onClick={clearAllNotifications} variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
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
                  <p className="text-2xl font-bold text-red-600">{stats.unread}</p>
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
                  <p className="text-2xl font-bold text-yellow-600">{stats.low_stock}</p>
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
                  <p className="text-2xl font-bold text-blue-600">{stats.system}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
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
              <label className="text-sm font-medium">Status</label>
              <Select value={filterRead} onValueChange={setFilterRead}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread Only</SelectItem>
                  <SelectItem value="read">Read Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                You're all caught up! Check back later for updates.
              </p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`${getSeverityColor(notification.severity)} ${
                !notification.is_read ? "shadow-md" : "opacity-75"
              } transition-all hover:shadow-lg`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="mt-1">
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">
                          {notification.title}
                        </h3>
                        {getSeverityIcon(notification.severity)}
                        {!notification.is_read && (
                          <Badge variant="default" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {formatDistance(new Date(notification.created_at), new Date(), {
                            addSuffix: true,
                          })}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {notification.notification_type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CheckCheck className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(notification.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
