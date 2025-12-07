import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StoreLogo from "@/components/StoreLogo";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { Eye, EyeOff, Lock, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  user: User;
  session_token: string;
}

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginRequest>({
    username: "admin", // Default to admin for convenience
    password: "admin123", // Default password
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      // Invoke the login command with the correct argument structure
      const response = await invoke<LoginResponse>("login_user", {
        request: {
          username: formData.username,
          password: formData.password
        }
      });

      // Store session token and update auth state
      localStorage.setItem("session_token", response.session_token);
      login(response.user);

      toast.success("Login successful!");
      navigate("/"); // Navigate to the dashboard or main application page
    } catch (error: any) {
      // Log and display login errors
      console.error("Login failed:", error);
      setError(error.message || "Login failed. Please check your credentials.");
      toast.error(`Login failed: ${error.message || 'An unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-3 sm:p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4 sm:space-y-6 p-4 sm:p-6">
          <div className="flex justify-center">
            <StoreLogo variant="desktop" showSubtitle={false} />
          </div>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="username" className="text-sm">Username</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="pl-10 touch-target"
                  inputMode="text"
                />
              </div>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="pl-10 pr-10 touch-target"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent touch-target"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 touch-target mt-2"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Demo credentials: <strong>admin</strong> / <strong>admin123</strong>
            </p>
          </div>
          {/* Removed the testDatabaseQuery button */}
        </CardContent>
      </Card>
    </div>
  );
}