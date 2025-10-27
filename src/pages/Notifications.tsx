// src/pages/Notifications.tsx - Enhanced Notification Center
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { parseUTCDate } from "@/lib/date-utils";
import { useAuthStore } from "@/store/authStore";
import { invoke } from "@tauri-apps/api/core";
import { formatDistance, format, isToday, isYesterday } from "date-fns";
import {
  AlertTriangle,
  Archive,
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle,
  Clock,
  DollarSign,
  Filter,
  Info,
  Loader2,
  Mail,
  Package,
  Search,
  Trash2,
  XCircle,
  X,
  RotateCcw
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
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
  archived?: boolean;
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
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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

  const markAsUnread = async (id: number) => {
    try {
      await invoke("mark_notification_unread", { notificationId: id });
      toast.success("Marked as unread");
      loadNotifications();
    } catch (error) {
      console.error("Failed to mark as unread:", error);
      toast.error("Failed to mark as unread");
    }
  };

  const archiveNotification = async (id: number) => {
    try {
      await invoke("archive_notification", { notificationId: id });
      toast.success("Notification archived");
      loadNotifications();
    } catch (error) {
      console.error("Failed to archive:", error);
      toast.error("Failed to archive notification");
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

  const bulkMarkAsRead = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      setBulkActionLoading(true);
      await Promise.all(
        selectedIds.map((id) => invoke("mark_notification_read", { notificationId: id }))
      );
      toast.success(`✅ Marked ${selectedIds.length} notification(s) as read`);
      setSelectedIds([]);
      loadNotifications();
    } catch (error) {
      console.error("Failed to mark selected as read:", error);
      toast.error("❌ Failed to mark selected as read");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkArchive = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      setBulkActionLoading(true);
      await Promise.all(
        selectedIds.map((id) => invoke("archive_notification", { notificationId: id }))
      );
      toast.success(`📦 Archived ${selectedIds.length} notification(s)`);
      setSelectedIds([]);
      loadNotifications();
    } catch (error) {
      console.error("Failed to archive selected:", error);
      toast.error("❌ Failed to archive selected");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} notification(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setBulkActionLoading(true);
      await Promise.all(
        selectedIds.map((id) => invoke("delete_notification", { notificationId: id }))
      );
      toast.success(`🗑️ Deleted ${selectedIds.length} notification(s)`);
      setSelectedIds([]);
      loadNotifications();
    } catch (error) {
      console.error("Failed to delete selected:", error);
      toast.error("❌ Failed to delete selected");
    } finally {
      setBulkActionLoading(false);
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

  useEffect(() => {
    loadNotifications();
  }, [filterType, filterRead]);

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !notif.title.toLowerCase().includes(query) &&
          !notif.message.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Severity filter
      if (filterSeverity !== "all" && notif.severity !== filterSeverity) {
        return false;
      }

      return true;
    });
  }, [notifications, searchQuery, filterSeverity]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {};

    filteredNotifications.forEach((notif) => {
      const date = parseUTCDate(notif.created_at);
      let groupKey: string;

      if (isToday(date)) {
        groupKey = "Today";
      } else if (isYesterday(date)) {
        groupKey = "Yesterday";
      } else {
        groupKey = format(date, "MMMM d, yyyy");
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notif);
    });

    return groups;
  }, [filteredNotifications]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map((n) => n.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

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
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Notifications</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Stay updated with alerts and system messages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={checkLowStock}
          >
            <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Check Stock</span>
          </Button>
          {stats && stats.unread > 0 && (
            <Button 
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={markAllAsRead}
            >
              <CheckCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Mark All</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards - Enhanced with Gradients */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <p className="text-xs sm:text-sm opacity-90 font-medium">Total</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold mt-2">{stats.total}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Bell className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <p className="text-xs sm:text-sm opacity-90 font-medium">Unread</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold mt-2">{stats.unread}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <BellOff className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-6">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <p className="text-xs sm:text-sm opacity-90 font-medium">Low Stock</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold mt-2">{stats.low_stock}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Package className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <p className="text-xs sm:text-sm opacity-90 font-medium">System</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold mt-2">{stats.system}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Info className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="shadow-md">
        <CardContent className="p-4 sm:p-6">
          {/* Search Bar */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
                {(filterType !== "all" || filterRead !== "all" || filterSeverity !== "all") && (
                  <Badge variant="secondary" className="ml-1">
                    Active
                  </Badge>
                )}
              </Button>
              
              {filteredNotifications.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Collapsible Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-9">
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
                  <Label className="text-xs sm:text-sm">Status</Label>
                  <Select value={filterRead} onValueChange={setFilterRead}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="unread">Unread</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Severity</Label>
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <Card className="shadow-md border-primary/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.length === filteredNotifications.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedIds.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={bulkMarkAsRead}
                  disabled={bulkActionLoading}
                  className="flex-1 sm:flex-none"
                >
                  {bulkActionLoading ? (
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  )}
                  <span className="text-xs sm:text-sm">Mark Read</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={bulkArchive}
                  disabled={bulkActionLoading}
                  className="flex-1 sm:flex-none"
                >
                  <Archive className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  <span className="text-xs sm:text-sm">Archive</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={bulkDelete}
                  disabled={bulkActionLoading}
                  className="flex-1 sm:flex-none"
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  <span className="text-xs sm:text-sm">Delete</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List - Grouped by Date */}
      {loading ? (
        <Card className="shadow-md">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card className="shadow-md">
          <CardContent className="p-8 sm:p-12">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">No notifications found</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">
                {searchQuery || filterType !== "all" || filterRead !== "all" || filterSeverity !== "all"
                  ? "Try adjusting your filters or search query"
                  : "You're all caught up!"}
              </p>
              {(searchQuery || filterType !== "all" || filterRead !== "all" || filterSeverity !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterType("all");
                    setFilterRead("all");
                    setFilterSeverity("all");
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([date, notifs]) => (
            <Card key={date} className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    {date}
                  </span>
                  <Badge variant="secondary" className="text-xs sm:text-sm">
                    {notifs.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {notifs.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 sm:p-6 hover:bg-muted/50 transition-colors ${
                        !notification.is_read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                      }`}
                    >
                      <div className="flex gap-3 sm:gap-4">
                        {/* Checkbox */}
                        <div className="flex items-start pt-1">
                          <Checkbox
                            checked={selectedIds.includes(notification.id)}
                            onCheckedChange={() => toggleSelect(notification.id)}
                          />
                        </div>

                        {/* Icon */}
                        <div className="flex-shrink-0">
                          <div
                            className={`p-2 sm:p-3 rounded-xl ${
                              notification.severity === "error"
                                ? "bg-red-100 dark:bg-red-900/30"
                                : notification.severity === "warning"
                                ? "bg-yellow-100 dark:bg-yellow-900/30"
                                : notification.severity === "success"
                                ? "bg-green-100 dark:bg-green-900/30"
                                : "bg-blue-100 dark:bg-blue-900/30"
                            }`}
                          >
                            <div className={getSeverityColor(notification.severity)}>
                              {getNotificationIcon(notification.notification_type)}
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start gap-2 mb-2">
                            <h4 className="font-semibold text-sm sm:text-base">
                              {notification.title}
                            </h4>
                            {!notification.is_read && (
                              <Badge variant="destructive" className="text-xs">
                                New
                              </Badge>
                            )}
                            {getSeverityIcon(notification.severity)}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                            {notification.message}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                            <Badge variant="outline" className="capitalize text-xs">
                              {notification.notification_type.replace("_", " ")}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistance(parseUTCDate(notification.created_at), new Date(), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row items-end sm:items-start gap-1">
                          {!notification.is_read ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              title="Mark as read"
                              className="h-8 w-8 p-0"
                            >
                              <CheckCheck className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsUnread(notification.id)}
                              title="Mark as unread"
                              className="h-8 w-8 p-0"
                            >
                              <BellOff className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => archiveNotification(notification.id)}
                            title="Archive"
                            className="h-8 w-8 p-0"
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(notification.id)}
                            title="Delete"
                            className="h-8 w-8 p-0 hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
