// src/pages/Users.tsx
// import { hapticFeedback } from "@/lib/mobile-utils";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import PageHeader from "@/components/PageHeader";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  UserPlus,
  Shield,
  Key,
  CheckCircle,
  XCircle,
  Mail,
  // Phone,
  Calendar,
  Users as UsersIcon,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formData, setFormData] = useState<CreateUserRequest>({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "Cashier",
  });

  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === "Admin";

  const roles = [
    { value: "Admin", label: "Administrator", description: "Full system access", color: "destructive" },
    { value: "Manager", label: "Manager", description: "Manage operations and reports", color: "default" },
    { value: "Cashier", label: "Cashier", description: "Process sales and basic operations", color: "secondary" },
    { value: "Inventory Manager", label: "Inventory Manager", description: "Manage stock and inventory", color: "secondary" },
  ];

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await invoke<User[]>("get_users");
      setUsers(result);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.username || !formData.email || !formData.first_name || !formData.last_name) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!editingUser && !formData.password) {
      toast.error("Password is required for new users");
      return;
    }

    if (!editingUser && formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      if (editingUser) {
        await invoke("update_user", {
          userId: editingUser.id,
          request: {
            username: formData.username,
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: formData.role,
            password: "", // Don't update password here
          }
        });
        toast.success("User updated successfully");
      } else {
        await invoke("create_user", { request: formData });
        toast.success("User created successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error("Failed to save user:", error);
      toast.error(`Failed to save user: ${error}`);
    }
  };

  const handleChangePassword = async () => {
    if (!editingUser) return;

    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      await invoke("update_user", {
        userId: editingUser.id,
        request: {
          username: editingUser.username,
          email: editingUser.email,
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
          role: editingUser.role,
          password: newPassword,
        }
      });

      toast.success("Password changed successfully");
      setIsPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      setEditingUser(null);
    } catch (error) {
      console.error("Failed to change password:", error);
      toast.error("Failed to change password");
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await invoke("delete_user", { userId: userToDelete.id });
      toast.success("User deactivated successfully");
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("Failed to delete user");
    }
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      role: "Cashier",
    });
    setEditingUser(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openPasswordDialog = (user: User) => {
    setEditingUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setIsPasswordDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchQuery ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRole === "all" || user.role === selectedRole;

    return matchesSearch && matchesRole;
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-16 h-16 mx-auto mb-2 md:mb-4 text-muted-foreground" />
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You need administrator privileges to access user management.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage user accounts, roles, and permissions"
        icon={UsersIcon}
        actions={
          <Button onClick={openCreateDialog} size="sm" className="w-full sm:w-auto">
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        }
      />

      {/* Stats - Compact & Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-300">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-[10px] sm:text-xs opacity-90 font-medium">Total Users</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">{users.length}</p>
              </div>
              <div className="p-2 sm:p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-300">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-[10px] sm:text-xs opacity-90 font-medium">Active</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">
                  {users.filter(u => u.is_active).length}
                </p>
              </div>
              <div className="p-2 sm:p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-300">
          <div className="bg-gradient-to-br from-red-500 to-rose-600 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-[10px] sm:text-xs opacity-90 font-medium">Inactive</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">
                  {users.filter(u => !u.is_active).length}
                </p>
              </div>
              <div className="p-2 sm:p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-300">
          <div className="bg-gradient-to-br from-orange-500 to-pink-600 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-[10px] sm:text-xs opacity-90 font-medium">Admins</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">
                  {users.filter(u => u.role === "Admin").length}
                </p>
              </div>
              <div className="p-2 sm:p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters - Compact */}
      <Card className="shadow-md">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="search" className="text-xs sm:text-sm">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <Input
                  id="search"
                  placeholder="Search by name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 sm:pl-10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-xs sm:text-sm">Filter by Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table - Compact */}
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-3 sm:p-4">
          <CardTitle className="flex items-center text-base sm:text-lg">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
            Users
            <Badge className="ml-2 text-xs" variant="secondary">{filteredUsers.length}</Badge>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Manage user accounts and their access levels
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-3">
          {loading ? (
            <div className="space-y-2 p-3 sm:p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead className="h-9 px-2 sm:px-4 text-xs">User</TableHead>
                    <TableHead className="h-9 px-2 sm:px-4 text-xs hidden md:table-cell">Email</TableHead>
                    <TableHead className="h-9 px-2 sm:px-4 text-xs">Role</TableHead>
                    <TableHead className="h-9 px-2 sm:px-4 text-xs">Status</TableHead>
                    <TableHead className="h-9 px-2 sm:px-4 text-xs hidden lg:table-cell">Last Login</TableHead>
                    <TableHead className="h-9 px-2 sm:px-4 text-xs hidden xl:table-cell">Created</TableHead>
                    <TableHead className="h-9 px-2 sm:px-4 text-right text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/50 transition-colors border-b h-12">
                      <TableCell className="py-2 px-2 sm:px-4">
                        <div>
                          <div className="font-medium text-xs sm:text-sm">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground">
                            @{user.username}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-4 hidden md:table-cell">
                        <div className="flex items-center text-xs">
                          <Mail className="w-3 h-3 mr-1.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate max-w-[150px] lg:max-w-[200px]">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] sm:text-xs px-1.5 py-0 h-5 ${user.role === "Admin" ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400" :
                            user.role === "Manager" ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400" :
                              "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400"
                            }`}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] sm:text-xs px-1.5 py-0 h-5 ${user.is_active ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400"}`}
                        >
                          {user.is_active ? "✓" : "○"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-4 hidden lg:table-cell">
                        <div className="text-[10px] sm:text-xs text-muted-foreground">
                          {user.last_login ? formatDate(user.last_login) : "Never"}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-4 hidden xl:table-cell">
                        <div className="flex items-center text-[10px] sm:text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                          {formatDate(user.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditUser(user)} className="text-xs">
                              <Edit className="w-3.5 h-3.5 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPasswordDialog(user)} className="text-xs">
                              <Key className="w-3.5 h-3.5 mr-2" />
                              Change Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(user)}
                              className="text-destructive text-xs"
                              disabled={user.username === "admin" || user.id === currentUser?.id}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Deactivate User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && filteredUsers.length === 0 && (
            <div className="text-center py-8 sm:py-12 px-4">
              <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-muted rounded-full flex items-center justify-center mb-3">
                <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">No users found</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                {searchQuery || selectedRole !== "all"
                  ? "Try adjusting your search criteria"
                  : "Get started by creating your first user"}
              </p>
              {!searchQuery && selectedRole === "all" && (
                <Button onClick={openCreateDialog} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit User Dialog - Responsive */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {editingUser ? "Edit User" : "Create New User"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {editingUser
                ? "Update user information and role"
                : "Add a new user to the system"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="first_name" className="text-xs sm:text-sm">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="John"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="last_name" className="text-xs sm:text-sm">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Doe"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs sm:text-sm">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="johndoe"
                disabled={!!editingUser}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs sm:text-sm">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="role" className="text-xs sm:text-sm">Role *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <div className="text-sm font-medium">{role.label}</div>
                        <div className="text-xs text-muted-foreground">{role.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!editingUser && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="password" className="text-xs sm:text-sm">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="h-9 text-sm"
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Password must be at least 6 characters long
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} size="sm" className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={handleCreateUser} size="sm" className="flex-1 sm:flex-none">
              {editingUser ? "Update User" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog - Responsive */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Change Password</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Change password for {editingUser?.first_name} {editingUser?.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new_password" className="text-xs sm:text-sm">New Password</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm_password" className="text-xs sm:text-sm">Confirm Password</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} size="sm" className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={handleChangePassword} size="sm" className="flex-1 sm:flex-none">
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog - Responsive */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">Deactivate User</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Are you sure you want to deactivate {userToDelete?.first_name} {userToDelete?.last_name}?
              This user will no longer be able to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="flex-1 sm:flex-none">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1 sm:flex-none">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
