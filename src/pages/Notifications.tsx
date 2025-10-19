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
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { invoke } from "@tauri-apps/api/core";
import { formatInTimeZone } from "date-fns-tz";
import {
  Bell,
  Clock,
  Package,
  Trash2
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
      const loadingToast = toast.loading("🔍 Checking inventory...");

      const count = await invoke<number>("check_low_stock_alerts");

      toast.dismiss(loadingToast);

      if (count > 0) {
        toast.success(`✅ Found ${count} new low stock alert(s)`, {
          description: "Only new items were added to avoid duplicates"
        });
        loadNotifications();
      } else {
        toast.info("✨ No new low stock items", {
          description: "All low stock items already have alerts"
        });
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
      const loadingToast = toast.loading("🗑️ Clearing notifications...");

      await Promise.all(
        notifications.map((notification) =>
          invoke("delete_notification", { notificationId: notification.id })
        )
      );

      toast.dismiss(loadingToast);
      toast.success("✅ All notifications cleared", {
        description: "You'll see new notifications when you check low stock again"
      });

      setNotifications([]);
      setStats({ total: 0, unread: 0, low_stock: 0, system: 0 });
    } catch (error) {
      console.error("Failed to clear all notifications:", error);
      toast.error("❌ Failed to clear notifications");
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(checkLowStock, 300000);
    return () => clearInterval(interval);
  }, [filterType, filterRead]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "low_stock":
        return <Package className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />;
      default:
        return <Bell className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />;
    }
  };

  const getSeverityBorder = (severity: string) => {
    switch (severity) {
      case "error":
        return "border-l-4 border-zinc-400 dark:border-zinc-600";
      case "warning":
        return "border-l-4 border-gray-400 dark:border-gray-600";
      case "success":
        return "border-l-4 border-zinc-400 dark:border-zinc-600";
      default:
        return "border-l-4 border-gray-400 dark:border-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with alerts and system messages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={checkLowStock} size="sm">
            <Package className="w-4 h-4 mr-2 text-zinc-500 dark:text-zinc-400" />
            Check Low Stock
          </Button>
          {stats && stats.unread > 0 && (
            <Button onClick={markAllAsRead} size="sm">
              Mark All Read ({stats.unread})
            </Button>
          )}
          {notifications.length > 0 && (
            <Button onClick={clearAllNotifications} variant="outline" size="sm">
              <Trash2 className="w-4 h-4 mr-2 text-zinc-500 dark:text-zinc-400" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          <Card className="border-2 border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total}</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  <Bell className="w-7 h-7 text-zinc-500 dark:text-zinc-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unread</p>
                  <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.unread}</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  <Bell className="w-7 h-7 text-zinc-500 dark:text-zinc-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                  <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.low_stock}</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  <Package className="w-7 h-7 text-zinc-500 dark:text-zinc-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">System</p>
                  <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.system}</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  <Bell className="w-7 h-7 text-zinc-500 dark:text-zinc-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-zinc-50 dark:bg-zinc-900">
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Filter by Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="bg-white dark:bg-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="low_stock">📦 Low Stock</SelectItem>
                  <SelectItem value="system">⚙️ System</SelectItem>
                  <SelectItem value="payment">💳 Payment</SelectItem>
                  <SelectItem value="invoice">📄 Invoice</SelectItem>
                  <SelectItem value="email">📧 Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Filter by Status</label>
              <Select value={filterRead} onValueChange={setFilterRead}>
                <SelectTrigger className="bg-white dark:bg-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Notifications</SelectItem>
                  <SelectItem value="unread">🔴 Unread Only</SelectItem>
                  <SelectItem value="read">✅ Read Only</SelectItem>
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
          <Card className="border-2 border-dashed border-zinc-200 dark:border-zinc-700">
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Bell className="w-10 h-10 text-zinc-500 dark:text-zinc-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">
                You're all caught up!
              </h3>
              <p className="text-muted-foreground mb-6">
                No notifications to display. Check back later for updates.
              </p>
              <Button
                variant="outline"
                onClick={checkLowStock}
                className="shadow-sm border-zinc-200 dark:border-zinc-700"
              >
                <Package className="w-4 h-4 mr-2 text-zinc-500 dark:text-zinc-400" />
                Check Low Stock Now
              </Button>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`${getSeverityBorder(notification.severity)} ${!notification.is_read
                  ? "shadow-md border-2 border-zinc-300 dark:border-zinc-600"
                  : "opacity-80 hover:opacity-100"
                } transition-all duration-200 bg-white dark:bg-zinc-800 cursor-pointer`}
              onClick={(e) => {
                if (!notification.is_read && !(e.target as HTMLElement).closest('button')) {
                  markAsRead(notification.id);
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="mt-1 p-2 rounded-lg bg-zinc-100 dark:bg-zinc-700">
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <Badge variant="outline" className="text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2 leading-relaxed">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                          {formatInTimeZone(new Date(notification.created_at), 'Africa/Lagos', "MMM dd, yyyy hh:mm a")}
                        </span>
                        <Badge variant="outline" className="text-xs capitalize bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100">
                          {notification.notification_type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(notification.id)}
                      title="Delete notification"
                      className="hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    >
                      <Trash2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
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