import Logo from './Logo'
import Navbar from './Navbar'
import ActionArea from './ActionArea'

const Header = () => (
  <header className="sticky top-0 z-[var(--kv-z-dropdown)] bg-[#EEF1F6] border-b border-line shadow-[0_1px_0_var(--kv-border-subtle)]">
    <div className="flex flex-wrap items-center min-h-[6rem] px-3 sm:px-6 py-2 gap-x-4 gap-y-2">
      <div className="shrink-0 flex items-center self-stretch pr-4 sm:pr-6 border-r border-line">
        <Logo />
      </div>
      <div className="flex-1 min-w-0 flex items-center overflow-visible">
        <Navbar />
      </div>
      <div className="shrink-0 flex items-center gap-3 self-stretch pl-4 sm:pl-6 border-l border-line">
        <ActionArea />
      </div>
    </div>
  </header>
)

export default Header
