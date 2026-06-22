import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import DashboardPage from './components/dashboard/DashboardPage'
import Menu from './components/menu/Menu'
import Rooms from './components/rooms/Rooms'
import Invoices from './components/transactions/Invoices'
import Employees from './components/staff/Employees'
import Reservation from './components/reservation/Reservation'
import CashierOrders from './components/cashier/CashierOrders'
import LoginPage from './components/auth/LoginPage'
import EmployeeLoginPage from './components/auth/EmployeeLoginPage'

function App() {
  return (
    <Routes>
      {/* ── Auth ── */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/employee-login" element={<EmployeeLoginPage />} />

      {/* ── Cashier role (standalone POS chrome) ── */}
      <Route path="/cashier" element={<CashierOrders />} />

      {/* ── Waiter role (standalone reception chrome) ── */}
      <Route path="/waiter" element={<Reservation />} />

      {/* ── Manager role (dashboard chrome) ── */}
      <Route path="/manager" element={<Layout />}>
        <Route index element={<Navigate to="/manager/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="products" element={<Menu />} />
        <Route path="rooms" element={<Rooms />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="employees" element={<Employees />} />
      </Route>

      {/* ── Default → login ── */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
