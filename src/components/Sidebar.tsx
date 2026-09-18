import { ScrollArea } from '@/components/ui/scroll-area'
import { ThemeToggle } from '@/components/theme-toggle'
import { Piano } from 'lucide-react'

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
  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-6 py-6">
        <CompassMark />
        <span className="font-heading text-lg leading-none text-sidebar-foreground">
          Synthesizer
        </span>
      </div>
      <ScrollArea className="flex-1 px-3">
        <nav className="flex flex-col gap-0.5">
          <div className="relative flex items-center gap-3 bg-sidebar-accent px-3 py-2 text-sm text-sidebar-accent-foreground">
            <span className="absolute inset-y-1 left-0 w-0.5 bg-sidebar-primary" />
            <Piano className="size-4" />
            Instruments
          </div>
        </nav>
      </ScrollArea>
      <div className="flex items-center justify-between border-t border-sidebar-border px-6 py-4">
        <span className="text-eyebrow !text-sidebar-foreground/40">Theme</span>
        <ThemeToggle />
      </div>
    </aside>
  )
}

export default Sidebar
