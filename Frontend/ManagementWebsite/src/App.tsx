import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

const Layout = lazy(() => import("./components/layout/Layout"));
const DashboardPage = lazy(() => import("./components/dashboard/DashboardPage"));
const Menu = lazy(() => import("./components/menu/Menu"));
const Rooms = lazy(() => import("./components/rooms/Rooms"));
const Invoices = lazy(() => import("./components/transactions/Invoices"));
const Employees = lazy(() => import("./components/staff/Employees"));
const Schedule = lazy(() => import("./components/staff/schedule/Schedule"));
const Timesheet = lazy(() => import("./components/staff/schedule/Timesheet"));
const SettingsPage = lazy(() => import("./components/settings/SettingsPage"));
const Payroll = lazy(() => import("./components/staff/payroll/Payroll"));
const PayrollUpdate = lazy(() => import("./components/staff/payroll/PayrollUpdate"));
const MyProfile = lazy(() => import("./components/staff/MyProfile"));
const MySchedule = lazy(() => import("./components/staff/MySchedule"));
const ShiftReconciliation = lazy(() => import("./components/reports/ShiftReconciliation"));
const EndOfDayReport = lazy(() => import("./components/reports/EndOfDayReport"));
const FinancialReport = lazy(() => import("./components/reports/FinancialReport"));
const Reservation = lazy(() => import("./components/reservation/Reservation"));
const CashierOrders = lazy(() => import("./components/cashier/CashierOrders"));
const AdminDashboard = lazy(() => import("./components/admin/AdminDashboard"));
const AuditLogPage = lazy(() => import("./components/audit/AuditLogPage"));
const LoginPage = lazy(() => import("./components/auth/LoginPage"));
const ForgotPasswordPage = lazy(() => import("./components/auth/ForgotPasswordPage"));
const NewPasswordPage = lazy(() => import("./components/auth/NewPasswordPage"));
const PromotionManagement = lazy(() => import("./components/promotions/PromotionManagement"));
const CashBook = lazy(() => import("./components/cashbook/CashBook"));
const VnpayResultPage = lazy(() => import("./components/payment/VnpayResultPage"));

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<div className="min-h-screen bg-surface" aria-label="Đang tải" />}>
        <Routes>
        {/* ── Auth (public) ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/new-password" element={<NewPasswordPage />} />

        {/* ── Admin ── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* ── Cashier ── */}
        <Route
          path="/cashier"
          element={
            <ProtectedRoute roles={["CASHIER"]}>
              <CashierOrders />
            </ProtectedRoute>
          }
        />

        {/* ── VNPAY Sandbox result (lands here after the backend's Return redirect) ── */}
        <Route
          path="/payment/vnpay-result"
          element={
            <ProtectedRoute roles={["CASHIER"]}>
              <VnpayResultPage />
            </ProtectedRoute>
          }
        />

        {/* ── Waiter / Cashier: reservation lifecycle (Waiter confirms/edits/cancels,
             Cashier checks guests in) ── */}
        <Route
          path="/waiter"
          element={
            <ProtectedRoute roles={["WAITER", "CASHIER"]}>
              <Reservation />
            </ProtectedRoute>
          }
        />

        {/* ── Staff: self-service employee profile ── */}
        <Route
          path="/my-profile"
          element={
            <ProtectedRoute roles={["WAITER", "CASHIER", "MANAGER", "ADMIN"]}>
              <MyProfile />
            </ProtectedRoute>
          }
        />

        {/* ── Staff: self-service work schedule + check-in/out ── */}
        <Route
          path="/my-schedule"
          element={
            <ProtectedRoute roles={["WAITER", "CASHIER", "MANAGER"]}>
              <MySchedule />
            </ProtectedRoute>
          }
        />

        {/* ── Manager role (dashboard chrome) ── */}
        <Route
          path="/manager"
          element={
            <ProtectedRoute roles={["MANAGER"]}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/manager/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<Menu />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="promotions" element={<PromotionManagement />} />
          <Route path="employees" element={<Employees />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="timesheet" element={<Timesheet />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="payroll/update" element={<PayrollUpdate />} />
          <Route path="cash-book" element={<CashBook />} />
          <Route path="reports/daily-summary" element={<EndOfDayReport />} />
          <Route
            path="reports/shift-reconciliation"
            element={<ShiftReconciliation />}
          />
          <Route path="reports/financial" element={<FinancialReport />} />
          <Route path="audit-logs" element={<AuditLogPage />} />
        </Route>

        {/* ── Default → login ── */}
        <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
