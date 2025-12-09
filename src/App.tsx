import ProtectedRoute from "@/components/ProtectedRoute";
import SettingsApplier from "@/components/SettingsApplier";
import DashboardLayout from "@/layouts/DashboardLayout";
import Appointments from "@/pages/Appointments";
import Cart from "@/pages/Cart";
import Dashboard from "@/pages/Dashboard";
import Employees from "@/pages/Employees";
import Finance from "@/pages/Finance";
import Inventory from "@/pages/Inventory";
import LoginPage from "@/pages/LoginPage";
import MasterData from "@/pages/MasterData";
import Notifications from "@/pages/Notifications";
import Organization from "@/pages/Organization";
import Products from "@/pages/Products";
import Profile from "@/pages/Profile";
import Promotions from "@/pages/Promotions";
import PurchaseOrders from "@/pages/PurchaseOrders";
import Reports from "@/pages/Reports";
import Returns from "@/pages/Returns";
import Sales from "@/pages/Sales";
import SalesRecords from "@/pages/SalesRecords";
import Settings from "@/pages/Settings";
import TimeTracking from "@/pages/TimeTracking";
import Unauthorized from "@/pages/Unauthorized";
import Users from "@/pages/Users";
import { useAuthStore } from "@/store/authStore";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

function App() {
  const { isAuthenticated, theme } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

useEffect(() => {
    const initialize = async () => {
        try {
            // Apply theme
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }

            // Perform a single lightweight readiness check with timeout; never block UI
            try {
                const readiness = invoke('verify_session', { _session_token: '' });
                await Promise.race([
                    readiness,
                    new Promise((resolve) => setTimeout(resolve, 2000)), // 2s max wait
                ]);
            } catch (error) {
                console.warn('Backend readiness check failed; continuing to UI.', error);
            } finally {
                setIsInitializing(false);
                console.log("✅ App initialized (UI released)");
            }
        } catch (error) {
            console.error("❌ App initialization error:", error);
            setInitError(error instanceof Error ? error.message : "Unknown initialization error");
        }
    };

    initialize();
}, [theme]);


  // Show initialization error
  if (initError) {
    return (
      <div style={{
        padding: "40px",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}>
        <h1 style={{ color: "#c00", fontSize: "24px", marginBottom: "16px" }}>
          ⚠️ Initialization Error
        </h1>
        <p style={{ fontSize: "16px", marginBottom: "16px" }}>
          {initError}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "12px 24px",
            backgroundColor: "#0066cc",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          🔄 Reload App
        </button>
      </div>
    );
  }

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{
          width: "60px",
          height: "60px",
          border: "4px solid #f3f3f3",
          borderTop: "4px solid #0066cc",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          marginBottom: "24px",
        }} />
        <h2 style={{ fontSize: "20px", color: "#333", marginBottom: "8px" }}>
          Loading ZTAD POS
        </h2>
        <p style={{ fontSize: "14px", color: "#666" }}>
          Initializing database and services...
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <SettingsApplier />
        <Toaster position="top-right" richColors />
        <LoginPage />
      </>
    );
  }

  // Show main app
  return (
    <>
      <SettingsApplier />
      <Toaster position="bottom-right" richColors />
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/sales-records" element={<SalesRecords />} />
          <Route path="/returns" element={<Returns />} />
          <Route
            path="/products"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Manager"]}>
                <Products />
              </ProtectedRoute>
            }
          />
          <Route path="/inventory" element={<Inventory />} />
          <Route
            path="/purchase-orders"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Manager"]}>
                <PurchaseOrders />
              </ProtectedRoute>
            }
          />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/reports" element={<Reports />} />
          <Route
            path="/master-data"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Manager"]}>
                <MasterData />
              </ProtectedRoute>
            }
          />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Manager"]}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Manager"]}>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Manager"]}>
                <Employees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/promotions"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Manager"]}>
                <Promotions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/time-tracking"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Manager"]}>
                <TimeTracking />
              </ProtectedRoute>
            }
          />
          <Route path="/appointments" element={<Appointments />} />
          <Route
            path="/organization"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <Organization />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Manager"]}>
                <Finance />
              </ProtectedRoute>
            }
          />
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Routes>
      </DashboardLayout>
    </>
  );
}

export default App;