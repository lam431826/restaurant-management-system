import Logo from './Logo'
import Navbar from './Navbar'
import ActionArea from './ActionArea'

const Header = () => (
  <header className="sticky top-0 z-[var(--kv-z-dropdown)] bg-[#EEF1F6] border-b border-line shadow-[0_1px_0_var(--kv-border-subtle)]">
    <div className="flex items-center h-24 px-6 gap-4">
      <div className="shrink-0 flex items-center h-full pr-6 border-r border-line">
        <Logo />
      </div>
      <div className="flex-1 flex items-center overflow-visible">
        <Navbar />
      </div>
      <div className="shrink-0 flex items-center gap-3 h-full pl-6 border-l border-line">
        <ActionArea />
      </div>
    </div>
  </header>
)

export default Header
