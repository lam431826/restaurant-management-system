import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/layout/Layout'
import DashboardPage from './components/dashboard/DashboardPage'
import Menu from './components/menu/Menu'
import Rooms from './components/rooms/Rooms'
import Invoices from './components/transactions/Invoices'
import Employees from './components/staff/Employees'
import Reservation from './components/reservation/Reservation'
import CashierOrders from './components/cashier/CashierOrders'
import AdminDashboard from './components/admin/AdminDashboard'
import AuditLogPage from './components/audit/AuditLogPage'
import LoginPage from './components/auth/LoginPage'
import EmployeeLoginPage from './components/auth/EmployeeLoginPage'
import ForgotPasswordPage from './components/auth/ForgotPasswordPage'
import NewPasswordPage from './components/auth/NewPasswordPage'

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
        <Route path="/admin" element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* ── Cashier ── */}
        <Route path="/cashier" element={
          <ProtectedRoute roles={['CASHIER', 'MANAGER']}>
            <CashierOrders />
          </ProtectedRoute>
        } />

        {/* ── Waiter ── */}
        <Route path="/waiter" element={
          <ProtectedRoute roles={['WAITER', 'MANAGER']}>
            <Reservation />
          </ProtectedRoute>
        } />

        {/* ── Manager dashboard ── */}
        <Route path="/manager" element={
          <ProtectedRoute roles={['MANAGER']}>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/manager/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<Menu />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="employees" element={<Employees />} />
          <Route path="audit-logs" element={<AuditLogPage />} />
        </Route>

        {/* ── Default → login ── */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
