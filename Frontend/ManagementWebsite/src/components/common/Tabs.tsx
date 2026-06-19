import { useState, type ReactNode } from 'react'

export interface TabItem {
  label: string
  content: ReactNode
}

interface Props {
  tabs: TabItem[]
  defaultIndex?: number
  className?: string
  onTabChange?: (index: number) => void
}

const Tabs = ({ tabs, defaultIndex = 0, className = '', onTabChange }: Props) => {
  const [active, setActive] = useState(defaultIndex)

  const select = (i: number) => {
    setActive(i)
    onTabChange?.(i)
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul role="tablist" className="flex items-center list-none m-0 p-1 bg-fill rounded-full gap-0 w-fit" aria-orientation="horizontal">
          {tabs.map((tab, i) => (
            <li
              key={i}
              role="tab"
              id={`kv-tabs-item-${i}`}
              aria-controls={`kv-tabs-panel-${i}`}
              aria-selected={active === i}
              tabIndex={active === i ? 0 : -1}
              className={[
                'flex items-center gap-2 px-4 py-1.5 text-md font-medium rounded-full cursor-pointer transition-colors whitespace-nowrap select-none',
                active === i ? 'bg-card text-ink font-semibold shadow-sm' : 'text-ink-subtle hover:text-ink',
              ].join(' ')}
              onClick={() => select(i)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') select(i)
              }}
            >
              <span>{tab.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1">
        {tabs.map((tab, i) => (
          <div
            key={i}
            role="tabpanel"
            id={`kv-tabs-panel-${i}`}
            aria-labelledby={`kv-tabs-item-${i}`}
            aria-hidden={active !== i}
            className={`h-full ${active === i ? 'block' : 'hidden'}`}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Tabs
