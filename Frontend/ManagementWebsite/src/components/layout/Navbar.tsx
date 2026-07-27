import { useLocation } from 'react-router-dom'
import { navItems } from './navigation'
import type { NavigationChild } from './navigation'
import { useAuth } from '../../context/useAuth'

const toPath = (href?: string) => (href ? href.replace(/^#/, '') : '')

const renderChild = (child: NavigationChild) => {
  const placeholder = !child.href || child.href === '#'
  return (
    <li key={child.href}>
      <a
        href={child.href}
        className={`kv-list-item ${placeholder ? 'opacity-60' : ''}`}
        onClick={placeholder ? e => e.preventDefault() : undefined}
      >
        <span className="kv-list-item-text">{child.label}</span>
      </a>
    </li>
  )
}

const Navbar = () => {
  const { pathname } = useLocation()
  const { user } = useAuth()

  const visibleItems = navItems.filter(item =>
    !item.allowedRoles || (user && item.allowedRoles.includes(user.role))
  )

  const firstChildHref = (item: (typeof visibleItems)[number]) => {
    const child = item.children.find(c => c.href)
    return child?.href
  }

  const targetHref = (item: (typeof visibleItems)[number]) =>
    item.href ?? firstChildHref(item) ?? '#'

  const isActive = (item: (typeof visibleItems)[number]) => {
    if (toPath(item.href) === pathname) return true
    return item.children.some(c => toPath(c.href) === pathname)
  }

  return (
    <nav className="flex items-center overflow-visible">
      <ul className="inline-flex flex-wrap items-center gap-0.5 p-[0.5rem] rounded-[2.4rem] bg-[linear-gradient(90deg,#5B8DFE_0%,#4A7CFB_50%,#2F6EF7_100%)] shadow-[0_0.4rem_1.2rem_rgba(47,110,247,0.25)]">
        {visibleItems.map(item => {
          const active = isActive(item)
          const href = targetHref(item)
          const placeholder = !href || href === '#'
          return (
            <li key={item.id} className="group relative flex items-center" data-item-id={item.id}>
              <a
                href={href}
                onClick={placeholder ? e => e.preventDefault() : undefined}
                className={[
                  'relative flex items-center h-9 px-4 text-md font-semibold no-underline whitespace-nowrap',
                  'cursor-pointer rounded-full transition-colors select-none text-white',
                  active ? 'font-semibold' : 'hover:bg-white/[0.15]',
                ].join(' ')}
              >
                {item.label}
                {active && (
                  <span className="absolute bottom-[0.4rem] left-1/2 -translate-x-1/2 w-[2.4rem] h-[0.3rem] rounded-full bg-white" />
                )}
              </a>

              {item.children.length > 0 && (
                <div
                  className={[
                    "kv-float-container hidden group-hover:flex left-0 right-auto top-[calc(100%+0.9rem)]",
                    // Transparent bridge over the gap so moving from the tab to the menu keeps it open
                    "before:content-[''] before:absolute before:left-0 before:right-0 before:-top-[0.9rem] before:h-[0.9rem]",
                    'flex-col',
                  ].join(' ')}
                >
                  <ul className="kv-list">{item.children.map(renderChild)}</ul>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default Navbar
