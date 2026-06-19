import DashboardHeader from './DashboardHeader'
import KPICards from './KPICards'
import NetRevenueChart from './NetRevenueChart'
import CustomerChart from './CustomerChart'
import MenuEffectiveness from './MenuEffectiveness'
import CancellationStatus from './CancellationStatus'
import EmployeeTracking from './EmployeeTracking'
import SalesChannel from './SalesChannel'
import SidebarPromo from './SidebarPromo'
import RecentActivities from './RecentActivities'

const Dashboard = () => (
  <div className="flex flex-col min-h-full relative z-[1]">
    <DashboardHeader />
    <div className="flex gap-4 items-start mb-4 max-xl:flex-col">
      {/* ── Left: main content ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <KPICards />

        {/* Row: net revenue + customer volume */}
        <div className="flex gap-4 items-stretch [&>*]:flex-1 [&>*]:min-w-0 max-[900px]:flex-col">
          <NetRevenueChart />
          <CustomerChart />
        </div>

        {/* Menu effectiveness (full width) */}
        <MenuEffectiveness />

        {/* Row: cancellation + employee tracking */}
        <div className="flex gap-4 items-stretch [&>*]:flex-1 [&>*]:min-w-0 [&>*]:flex max-[900px]:flex-col">
          <CancellationStatus />
          <EmployeeTracking />
        </div>

        {/* Sales channel (full width) */}
        <SalesChannel />
      </div>

      {/* ── Right: sidebar ── */}
      <div className="w-[31rem] shrink-0 flex flex-col gap-4 max-xl:w-full">
        <SidebarPromo />
        <RecentActivities />
      </div>
    </div>
  </div>
)

export default Dashboard
