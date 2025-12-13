// src/pages/Profile.tsx - User Profile Management
import PageHeader from "@/components/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatLocalDate } from "@/lib/date-utils";
import { useAuthStore } from "@/store/authStore";
import { User as UserType, UpdateProfileRequest } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { Camera, Info, Key, User, Upload, X, Save, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

// Validation schemas
const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Profile() {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    email: user?.email || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    // Load avatar from user's profile_image_url
    if (user?.profile_image_url) {
      setAvatarPreview(user.profile_image_url);
      setAvatarChanged(false);
    }
  }, [user?.id, user?.profile_image_url]);

  // Sync form with user data when user changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
      });
    }
  }, [user]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if too large (max 800x800)
          const maxSize = 800;
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression (quality: 0.8)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressedBase64);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("❌ Please select an image file (PNG, JPG, etc.)");
      return;
    }

    // Validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("❌ Image must be less than 5MB");
      return;
    }

    try {
      setUploadingAvatar(true);
      const compressedImage = await compressImage(file);
      setAvatarPreview(compressedImage);
      setAvatarChanged(true);
      toast.success("✅ Image selected! Click 'Save Changes' to update.", {
        description: "Your profile picture will be saved when you update your profile."
      });
    } catch (error) {
      console.error("Failed to process image:", error);
      toast.error("❌ Failed to process image");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview("");
    setAvatarChanged(true);
    toast.success("🗑️ Profile picture will be removed when you save changes.");
  };

  const handleUpdateProfile = async () => {
    try {
      // Validate form
      profileSchema.parse(profileForm);
      setValidationErrors({});
      setSavingProfile(true);

      // Prepare update data
      const updateData: UpdateProfileRequest = {
        username: profileForm.username,
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        email: profileForm.email,
      };

      // Include avatar if changed
      if (avatarChanged) {
        updateData.profile_image_url = avatarPreview || undefined;
      }

      // Update profile in backend
      const updatedUser = await invoke<UserType>("update_user_profile", {
        userId: user?.id,
        request: updateData
      });

      // Update user in auth store
      updateUser(updatedUser);

      // Reset avatar changed flag
      setAvatarChanged(false);

      toast.success("✅ Profile updated successfully!", {
        description: "Your changes have been saved to the database."
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) errors[err.path[0].toString()] = err.message;
        });
        setValidationErrors(errors);
        toast.error("❌ Please fix the validation errors");
      } else {
        console.error("Profile update error:", error);
        toast.error(`❌ Failed to update profile: ${error}`);
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      // Validate password form
      passwordSchema.parse(passwordForm);
      setValidationErrors({});
      setChangingPassword(true);

      // Change password in backend
      await invoke("change_user_password", {
        userId: user?.id,
        request: {
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword
        }
      });

      toast.success("✅ Password changed successfully!", {
        description: "You will be logged out in 2 seconds. Please log in with your new password.",
        duration: 5000,
      });

      // Clear password form
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // Log out user and redirect to login
      setTimeout(() => {
        logout();
        navigate("/login");
      }, 2000);

    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) errors[err.path[0].toString()] = err.message;
        });
        setValidationErrors(errors);
        toast.error("❌ Please fix the validation errors");
      } else {
        console.error("Password change error:", error);
        toast.error(`❌ Failed to change password: ${error}`);
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const getInitials = () => {
    if (!user) return "U";
    return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title="Profile"
        subtitle="Manage your account settings and preferences"
        icon={User}
      />

      <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-5 sm:p-6 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 md:gap-6">
            <div className="relative flex-shrink-0">
              <Avatar className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 ring-4 ring-white dark:ring-gray-800 shadow-lg">
                {uploadingAvatar ? (
                  <AvatarFallback className="bg-primary/10">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </AvatarFallback>
                ) : avatarPreview ? (
                  <AvatarImage src={avatarPreview} alt={`${user?.first_name} ${user?.last_name}`} className="object-cover" />
                ) : (
                  <AvatarFallback className="text-xl sm:text-2xl md:text-3xl bg-primary text-primary-foreground">
                    {getInitials()}
                  </AvatarFallback>
                )}
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-3 cursor-pointer hover:bg-primary/90 transition-all shadow-lg hover:scale-110"
                title="Change profile picture"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={uploadingAvatar}
                />
              </label>
              {avatarChanged && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white shadow-md">
                    Unsaved
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left w-full">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                {user?.first_name} {user?.last_name}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-2">{user?.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
                <Badge variant="outline" className="text-xs sm:text-sm">
                  <User className="w-4 h-4 mr-1" />
                  {user?.role}
                </Badge>
                {user?.is_active && (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    Active
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-4 justify-center sm:justify-start">
                {avatarPreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    className="text-xs sm:text-sm"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove Picture
                  </Button>
                )}
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={uploadingAvatar}
                    className="text-xs sm:text-sm"
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    {uploadingAvatar ? "Processing..." : "Change Picture"}
                  </Button>
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardContent className="p-5 sm:p-6">
          <Tabs defaultValue="profile" className="space-y-6 md:space-y-8">
            <TabsList className="grid w-full grid-cols-3 h-full">
              <TabsTrigger value="profile" className="text-xs sm:text-sm">
                <User className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Profile</span>
                <span className="sm:hidden">Info</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="text-xs sm:text-sm">
                <Key className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Security</span>
                <span className="sm:hidden">Pass</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="text-xs sm:text-sm">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Account</span>
                <span className="sm:hidden">Info</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-3 md:space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <div className="space-y-3 md:col-span-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={profileForm.username}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, username: e.target.value })
                    }
                    className={validationErrors.username ? "border-red-500" : ""}
                  />
                  {validationErrors.username && (
                    <p className="text-xs text-red-500">{validationErrors.username}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={profileForm.first_name}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, first_name: e.target.value })
                    }
                    className={validationErrors.first_name ? "border-red-500" : ""}
                  />
                  {validationErrors.first_name && (
                    <p className="text-xs text-red-500">{validationErrors.first_name}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={profileForm.last_name}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, last_name: e.target.value })
                    }
                    className={validationErrors.last_name ? "border-red-500" : ""}
                  />
                  {validationErrors.last_name && (
                    <p className="text-xs text-red-500">{validationErrors.last_name}</p>
                  )}
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, email: e.target.value })
                    }
                    className={validationErrors.email ? "border-red-500" : ""}
                  />
                  {validationErrors.email && (
                    <p className="text-xs text-red-500">{validationErrors.email}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-5 border-t">
                {avatarChanged && (
                  <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-500 flex items-center">
                    <Info className="w-5 h-5 mr-1" />
                    You have unsaved image changes
                  </p>
                )}
                <Button
                  onClick={handleUpdateProfile}
                  disabled={savingProfile}
                  className="w-full sm:w-auto"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-3 md:space-y-5">
              <div className="space-y-3 md:space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="currentPassword">Current Password *</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                    className={validationErrors.currentPassword ? "border-red-500" : ""}
                  />
                  {validationErrors.currentPassword && (
                    <p className="text-xs text-red-500">
                      {validationErrors.currentPassword}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="newPassword">New Password *</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    }
                    className={validationErrors.newPassword ? "border-red-500" : ""}
                  />
                  {validationErrors.newPassword && (
                    <p className="text-xs text-red-500">{validationErrors.newPassword}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                    className={validationErrors.confirmPassword ? "border-red-500" : ""}
                  />
                  {validationErrors.confirmPassword && (
                    <p className="text-xs text-red-500">
                      {validationErrors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-5 border-t">
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="w-full sm:w-auto"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <Key className="w-5 h-5 mr-2" />
                      Change Password
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="account" className="space-y-3 md:space-y-5">
              <div className="space-y-4 md:space-y-6">
                <div className="p-5 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-4 text-sm sm:text-base">Account Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6 text-xs sm:text-sm">
                    <div>
                      <p className="text-muted-foreground">Username</p>
                      <p className="font-medium">{user?.username}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Role</p>
                      <p className="font-medium">{user?.role}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Account Status</p>
                      <p className="font-medium text-green-600">
                        {user?.is_active ? "Active" : "Inactive"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Login</p>
                      <p className="font-medium">
                        {user?.last_login
                          ? new Date(user.last_login).toLocaleString()
                          : "Never"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Member Since</p>
                      <p className="font-medium">
                        {user?.created_at
                          ? formatLocalDate(user.created_at, "long-date")
                          : "Unknown"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                  <h3 className="font-medium text-red-800 dark:text-red-200 mb-3">
                    Danger Zone
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                    Contact your administrator to deactivate or delete your account.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
