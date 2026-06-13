import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/auth/LoginPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import NewPasswordPage from './pages/auth/NewPasswordPage'
import EmployeeLoginPage from './pages/auth/EmployeeLoginPage'
import OrdersPage from './pages/cashier/OrdersPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/new-password" element={<NewPasswordPage />} />
        <Route path="/employee-login" element={<EmployeeLoginPage />} />
        <Route path="/cashier" element={<OrdersPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
