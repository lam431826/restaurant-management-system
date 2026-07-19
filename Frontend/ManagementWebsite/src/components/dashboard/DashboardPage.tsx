import Dashboard from './Dashboard'

const DashboardPage = () => (
  <div className="relative bg-surface min-h-[calc(100vh-var(--kv-header-height))] p-4 sm:p-6 overflow-hidden">
    <div className="absolute top-0 left-0 right-0 h-[32rem] pointer-events-none overflow-hidden z-0">
      <div className="absolute rounded-full opacity-15 blur-[6rem] w-[40rem] h-[25rem] -top-8 -left-8 bg-[radial-gradient(ellipse,#00b63e_0%,transparent_70%)]" />
      <div className="absolute rounded-full opacity-15 blur-[6rem] w-[35rem] h-[20rem] -top-6 -right-6 bg-[radial-gradient(ellipse,#ef06bc_0%,transparent_70%)]" />
    </div>
    {/* Cap width on normal screens for readability; on very wide viewports (zoomed out / ultrawide) fill the space */}
    <div className="relative z-1 max-w-[180rem] min-[1920px]:max-w-none mx-auto">
      <Dashboard />
    </div>
  </div>
)

export default DashboardPage
