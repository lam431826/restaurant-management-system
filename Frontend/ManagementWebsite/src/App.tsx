import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/layout/Layout";
import DashboardPage from "./components/dashboard/DashboardPage";
import Menu from "./components/menu/Menu";
import Rooms from "./components/rooms/Rooms";
import Invoices from "./components/transactions/Invoices";
import Employees from "./components/staff/Employees";
import Schedule from "./components/staff/schedule/Schedule";
import Timesheet from "./components/staff/schedule/Timesheet";
import EmployeeSettings from "./components/staff/settings/EmployeeSettings";
import Payroll from "./components/staff/payroll/Payroll";
import PayrollUpdate from "./components/staff/payroll/PayrollUpdate";
import MyProfile from "./components/staff/MyProfile";
import ShiftReconciliation from "./components/reports/ShiftReconciliation";
import EndOfDayReport from "./components/reports/EndOfDayReport";
import FinancialReport from "./components/reports/FinancialReport";
import Reservation from "./components/reservation/Reservation";
import CashierOrders from "./components/cashier/CashierOrders";
import AdminDashboard from "./components/admin/AdminDashboard";
import AuditLogPage from "./components/audit/AuditLogPage";
import LoginPage from "./components/auth/LoginPage";
import EmployeeLoginPage from "./components/auth/EmployeeLoginPage";
import ForgotPasswordPage from "./components/auth/ForgotPasswordPage";
import NewPasswordPage from "./components/auth/NewPasswordPage";
import PromotionManagement from "./components/promotions/PromotionManagement";
import CashBook from "./components/cashbook/CashBook";
import VnpayResultPage from "./components/payment/VnpayResultPage";

//import { ProtectedRoute } from './contexts/AuthContext'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Auth (public) ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/employee-login" element={<EmployeeLoginPage />} />
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
            <ProtectedRoute roles={["CASHIER", "MANAGER"]}>
              <CashierOrders />
            </ProtectedRoute>
          }
        />

        {/* ── VNPAY Sandbox result (lands here after the backend's Return redirect) ── */}
        <Route
          path="/payment/vnpay-result"
          element={
            <ProtectedRoute roles={["CASHIER", "MANAGER", "ADMIN"]}>
              <VnpayResultPage />
            </ProtectedRoute>
          }
        />

        {/* ── Waiter ── */}
        <Route
          path="/waiter"
          element={
            <ProtectedRoute roles={["WAITER", "MANAGER"]}>
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
          <Route path="employee-settings" element={<EmployeeSettings />} />
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
    </AuthProvider>
  );
}

export default App;
