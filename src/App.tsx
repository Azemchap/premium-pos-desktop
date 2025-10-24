import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Toaster } from "sonner";
import SettingsApplier from "@/components/SettingsApplier";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import DashboardLayout from "@/layouts/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Sales from "@/pages/Sales";
import SalesRecords from "@/pages/SalesRecords";
import Products from "@/pages/Products";
import Inventory from "@/pages/Inventory";
import Users from "@/pages/Users";
import Reports from "@/pages/Reports";
import Notifications from "@/pages/Notifications";
import MasterData from "@/pages/MasterData";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Unauthorized from "@/pages/Unauthorized";

function App() {
  const { isAuthenticated, theme } = useAuthStore();

  useEffect(() => {
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (!isAuthenticated) {
    return (
      <>
        <SettingsApplier />
        <Toaster position="top-right" richColors />
        <LoginPage />
      </>
    );
  }

  return (
    <>
      <SettingsApplier />
      <Toaster position="bottom-right" richColors />
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/sales-records" element={<SalesRecords />} />
          <Route 
            path="/products" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "Manager"]}>
                <Products />
              </ProtectedRoute>
            } 
          />
          <Route path="/inventory" element={<Inventory />} />
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
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Routes>
      </DashboardLayout>
    </>
  );
}

export default App;