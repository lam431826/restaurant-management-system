import Dashboard from './Dashboard'

const DashboardPage = () => (
  <div className="bg-surface min-h-[calc(100vh-var(--kv-header-height))] p-4 sm:p-6">
    {/* Cap width on normal screens for readability; fill the space on very wide viewports. */}
    <div className="max-w-[180rem] min-[1920px]:max-w-none mx-auto">
      <Dashboard />
    </div>
  </div>
)

export default DashboardPage
