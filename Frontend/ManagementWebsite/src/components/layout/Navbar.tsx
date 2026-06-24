import { useLocation } from 'react-router-dom'
import { navItems } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'

type NavChild =
  | { label: string; href: string; divider?: undefined; groupTitle?: undefined }
  | { divider: true; label?: undefined; groupTitle?: undefined; href?: undefined }
  | { groupTitle: string; label?: undefined; divider?: undefined; href?: undefined }

const toPath = (href?: string) => (href ? href.replace(/^#/, '') : '')

const renderChild = (child: NavChild, i: number) => {
  if ('divider' in child && child.divider) {
    return <li key={i} className="h-px bg-line my-2" role="separator" />
  }
  if ('groupTitle' in child && child.groupTitle) {
    return (
      <li key={i}>
        <span className="block px-6 pt-3 pb-1 text-sm font-semibold text-ink-muted uppercase tracking-[0.05em] whitespace-nowrap">
          {child.groupTitle}
        </span>
      </li>
    )
  }
  const placeholder = !child.href || child.href === '#'
  return (
    <li key={i}>
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
    const child = (item.children as NavChild[]).find(c => 'href' in c && c.href)
    return child && 'href' in child ? child.href : undefined
  }

  const targetHref = (item: (typeof visibleItems)[number]) =>
    item.href ?? firstChildHref(item) ?? '#'

  const isActive = (item: (typeof visibleItems)[number]) => {
    if (toPath(item.href) === pathname) return true
    return (item.children as NavChild[]).some(
      c => 'href' in c && c.href && toPath(c.href) === pathname
    )
  }

  return (
    <nav className="flex items-center overflow-visible">
      <ul className="inline-flex items-center gap-0.5 p-[0.5rem] rounded-[2.4rem] bg-[linear-gradient(90deg,#5B8DFE_0%,#4A7CFB_50%,#2F6EF7_100%)] shadow-[0_0.4rem_1.2rem_rgba(47,110,247,0.25)]">
        {visibleItems.map(item => {
          const active = isActive(item)
          const isGroup2 = item.id === 12
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
                    isGroup2 ? 'flex-row min-w-[38rem]' : 'flex-col',
                  ].join(' ')}
                >
                  {isGroup2 ? (
                    (() => {
                      const col1: NavChild[] = []
                      const col2: NavChild[] = []
                      let inCol2 = false
                      for (const child of item.children as NavChild[]) {
                        if ('groupTitle' in child && child.groupTitle === 'Nhập hàng') inCol2 = true
                        if (inCol2) col2.push(child)
                        else col1.push(child)
                      }
                      return (
                        <>
                          <ul className="kv-list flex-1">{col1.map(renderChild)}</ul>
                          <ul className="kv-list flex-1">{col2.map(renderChild)}</ul>
                        </>
                      )
                    })()
                  ) : (
                    <ul className="kv-list">{(item.children as NavChild[]).map(renderChild)}</ul>
                  )}
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
