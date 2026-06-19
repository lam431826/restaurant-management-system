import { Outlet } from 'react-router-dom'
import Header from './Header'

const Layout = () => (
  <div className="flex flex-col min-h-screen bg-surface">
    <Header />
    <main className="flex-1 relative min-h-0">
      <Outlet />
    </main>
  </div>
)

export default Layout
