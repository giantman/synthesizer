import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Piano, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

const COLLAPSED_KEY = 'sidebar-collapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function CompassMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5 shrink-0 text-sidebar-primary"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0c.6 4.2 1.6 8 3 9.4L24 12l-9 2.6c-1.4 1.4-2.4 5.2-3 9.4-.6-4.2-1.6-8-3-9.4L0 12l9-2.6C10.4 8 11.4 4.2 12 0Z" />
    </svg>
  )
}

function Sidebar() {
  const [collapsed, setCollapsed] = useState(readCollapsed)

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
  }

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200',
        collapsed ? 'w-14' : 'w-[200px]',
      )}
    >
      <div
        className={cn(
          'flex items-center px-4 py-5',
          collapsed ? 'flex-col gap-3' : 'justify-between gap-2',
        )}
      >
        <div className="flex items-center gap-2">
          <CompassMark />
          {!collapsed && (
            <span className="font-heading text-lg leading-none text-sidebar-foreground">
              Synthesizer
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      </div>
      <ScrollArea className="flex-1 px-2.5">
        <nav className="flex flex-col gap-0.5">
          <div
            className={cn(
              'relative flex items-center gap-3 bg-sidebar-accent px-3 py-2 text-sm text-sidebar-accent-foreground',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? 'Instruments' : undefined}
          >
            <span className="absolute inset-y-1 left-0 w-0.5 bg-sidebar-primary" />
            <Piano className="size-4 shrink-0" />
            {!collapsed && 'Instruments'}
          </div>
        </nav>
      </ScrollArea>
      <div
        className={cn(
          'flex items-center border-t border-sidebar-border px-4 py-3',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {!collapsed && (
          <span className="text-eyebrow !text-sidebar-foreground/40">
            Theme
          </span>
        )}
        <ThemeToggle />
      </div>
    </aside>
  )
}

export default Sidebar
