import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/auth/LoginPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import NewPasswordPage from './pages/auth/NewPasswordPage'
import EmployeeLoginPage from './pages/auth/EmployeeLoginPage'
import OrdersPage from './pages/cashier/OrdersPage'
import AdminPage from './pages/admin/AdminPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/employee-login" element={<EmployeeLoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/new-password" element={<NewPasswordPage />} />
          <Route
            path="/cashier"
            element={
              <ProtectedRoute roles={['CASHIER', 'WAITER', 'MANAGER', 'ADMIN']}>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
