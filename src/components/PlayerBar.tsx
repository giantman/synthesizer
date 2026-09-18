import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { AudioLines, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react'

function PlayerBar() {
  return (
    <footer className="flex shrink-0 items-center justify-between border-t bg-background px-5 py-3">
      <div className="flex min-w-[200px] items-center gap-3">
        <div className="flex size-12 items-center justify-center border border-border bg-muted text-muted-foreground">
          <AudioLines className="size-5" />
        </div>
        <div>
          <div className="font-heading text-base leading-tight">
            Midnight Drive
          </div>
          <div className="text-xs text-muted-foreground">Nova Sound</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" aria-label="Previous">
          <SkipBack className="size-4" />
        </Button>
        <Button
          size="icon"
          className="size-9 rounded-full bg-signal text-signal-foreground hover:bg-signal/85"
          aria-label="Play"
        >
          <Play className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Next">
          <SkipForward className="size-4" />
        </Button>
      </div>

      <div className="flex min-w-[200px] items-center justify-end gap-2">
        <Volume2 className="size-4 text-muted-foreground" />
        <Slider defaultValue={[70]} max={100} step={1} className="w-28" />
      </div>
    </footer>
  )
}

export default PlayerBar
