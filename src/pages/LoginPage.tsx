import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthStore } from "@/store/authStore";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Eye, EyeOff, Store, Lock, User } from "lucide-react";

// --- Corrected Imports & Readiness Check ---
// Removed the `isTauri` import as we'll rely on checking `window.__TAURI__` directly.

// Let's revise the readiness check.
// If `window.__TAURI__` and `window.__TAURI__.core` exist, we assume it's ready.
const isAppInTauri = () => {
  return typeof window.__TAURI__ !== "undefined" && window.__TAURI__ !== null && typeof window.__TAURI__.core !== 'undefined';
};

interface LoginRequest {
  username: string;
  password: string;
  [key: string]: unknown;
}

interface LoginResponse {
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    pin_code?: string;
    permissions?: string;
  };
  session_token: string;
}

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginRequest>({
    username: "admin",
    password: "admin123",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuthStore();
  const navigate = useNavigate();

  // --- State to track if Tauri APIs are ready ---
  const [tauriReady, setTauriReady] = useState(isAppInTauri());

  useEffect(() => {
    console.log("LoginPage mounted.");
    console.log("window.__TAURI__ available?", !!window.__TAURI__);
    if (window.__TAURI__) {
      console.log("window.__TAURI__.core available?", !!window.__TAURI__.core);
      if (window.__TAURI__.core) {
        console.log("window.__TAURI__.core.invoke exists:", typeof window.__TAURI__.core.invoke === 'function');
      }
    }
    // Update state to reflect initial readiness
    setTauriReady(isAppInTauri());

  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // The issue here is how invoke arguments are passed.
    // The Rust handler expects its parameters within an object, possibly named 'request'.

    setLoading(true);
    setError("");

    try {
      console.log("Attempting to invoke login_user...");
      const response = await invoke<LoginResponse>("login_user", {
        // Wrap the arguments in an object that matches the Rust handler's expected structure.
        // The error message "missing required key request" implies the Rust side
        // is looking for something like: { request: { username: '...', password: '...' } }
        request: { // <-- Add this 'request' object wrapper
          username: formData.username,
          password: formData.password
        }
      });
      console.log("Invoke response received:", response);

      localStorage.setItem("session_token", response.session_token);
      login(response.user);

      toast.success("Login successful!");
      navigate("/");
    } catch (error: any) {
      console.error("Error during invoke:", error);
      // If Tauri is ready, the error is likely from the argument mismatch.
      setError(error.message || "Login failed due to incorrect arguments or server error.");
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

  const testDatabaseQuery = async () => {
    // Removed the !tauriReady guard here as well.

    console.log("Attempting test database query...");
    try {
      const users = await invoke("get_users");
      console.log("get_users response:", users);
      if (Array.isArray(users)) {
        toast.success(`Database test successful! Found ${users.length} users.`);
      } else {
        toast.warning("Database test completed, but got unexpected response format.");
      }
    } catch (error: any) {
      console.error("Database test failed:", error);
      // If tauriReady was false, the error message might reflect that.
      toast.error(`Database test failed: ${error.message || 'An unknown error occurred'}`);
      setError(`Database test failed: ${error.message || 'An unknown error occurred'}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Store className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Premium POS
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Sign in to your account to continue
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="pl-10"
                // Removed disabled={loading || !tauriReady}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
                  className="pl-10 pr-10"
                // Removed disabled={loading || !tauriReady}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                // Removed disabled={loading || !tauriReady}
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
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            // Removed disabled={loading || !tauriReady}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Demo credentials: <strong>admin</strong> / <strong>admin123</strong>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Button variant="outline" onClick={testDatabaseQuery} /* Removed disabled={!tauriReady || loading} */ >
              Test Database Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}