import { useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import { useRecorder } from '@/lib/recorder-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Play,
  Square,
  Disc,
  Trash2,
  Volume2,
  VolumeX,
  ListMusic,
  Metronome,
} from 'lucide-react'

const BAR_OPTIONS = [1, 2, 4, 8]

function RecorderPanel() {
  const recorder = useRecorder()
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(
    null,
  )
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!selectedInstrument && recorder.instruments.length > 0) {
      setSelectedInstrument(recorder.instruments[0].id)
    }
  }, [recorder.instruments, selectedInstrument])

  useEffect(() => {
    const loopSeconds = Tone.Time(`${recorder.bars}m`).toSeconds()
    const tick = () => {
      if (recorder.isPlaying) {
        const pos = Tone.Transport.seconds % loopSeconds
        setProgress(pos / loopSeconds)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [recorder.isPlaying, recorder.bars])

  const canRecord = selectedInstrument !== null
  const isArmed = recorder.armedInstrumentId !== null

  return (
    <aside className="flex w-[270px] shrink-0 flex-col border-l bg-background">
      <div className="border-b px-4 py-3">
        <h2 className="font-heading text-base tracking-tight">
          Loop Recorder
        </h2>
      </div>

      <div className="flex flex-col gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant={recorder.isPlaying ? 'default' : 'outline'}
            size="icon"
            disabled={recorder.isRecording}
            onClick={() => recorder.togglePlay()}
            aria-label={recorder.isPlaying ? 'Stop' : 'Play'}
          >
            {recorder.isPlaying ? (
              <Square className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </Button>

          <div className="flex-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>

          <Button
            variant={recorder.metronomeEnabled ? 'default' : 'outline'}
            size="icon"
            onClick={() => recorder.toggleMetronome()}
            aria-label={
              recorder.metronomeEnabled
                ? 'Disable metronome'
                : 'Enable metronome'
            }
          >
            <Metronome className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">BPM</label>
            <Input
              type="number"
              min={40}
              max={220}
              value={recorder.bpm}
              onChange={(e) => recorder.setBpm(Number(e.target.value) || 100)}
              className="h-8"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Loop bars</label>
            <Select
              value={String(recorder.bars)}
              onValueChange={(v) => recorder.setBars(Number(v))}
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BAR_OPTIONS.map((b) => (
                  <SelectItem key={b} value={String(b)}>
                    {b} bar{b > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">
            Instrument to record
          </label>
          <Select
            value={selectedInstrument ?? undefined}
            onValueChange={(v) => setSelectedInstrument(v)}
            disabled={recorder.instruments.length === 0}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue placeholder="No instruments loaded" />
            </SelectTrigger>
            <SelectContent>
              {recorder.instruments.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant={isArmed ? 'destructive' : 'default'}
          className="w-full"
          disabled={!canRecord}
          onClick={() =>
            isArmed
              ? recorder.stopRecording()
              : selectedInstrument &&
                recorder.startRecording(selectedInstrument)
          }
        >
          <Disc className="size-4" />
          {recorder.isRecording
            ? 'Recording — click to finish'
            : isArmed
              ? 'Armed — starts next loop'
              : 'Record layer'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <ListMusic className="size-3.5" />
          Layers ({recorder.layers.length})
        </div>
        {recorder.layers.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No layers yet. Arm an instrument and play something to record
            your first loop.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {recorder.layers.map((layer, index) => (
            <div
              key={layer.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: layer.color }}
                />
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-xs font-medium">
                    {layer.instrumentLabel}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Layer {index + 1} · {layer.events.length} notes
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={layer.muted ? 'Unmute layer' : 'Mute layer'}
                  onClick={() => recorder.toggleMuteLayer(layer.id)}
                >
                  {layer.muted ? (
                    <VolumeX className="size-3.5" />
                  ) : (
                    <Volume2 className="size-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Delete layer"
                  onClick={() => recorder.deleteLayer(layer.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

export default RecorderPanel
