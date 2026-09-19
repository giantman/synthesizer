import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import { cn } from '@/lib/utils'
import { useRecorder, nextLayerColor } from '@/lib/recorder-context'
import { Button } from '@/components/ui/button'
import {
  Disc,
  Square,
  Piano as PianoIcon,
  Maximize,
  Minimize,
} from 'lucide-react'

type KeyDef = { note: string; type: 'white' | 'black'; key: string }

// Two octaves (C4–B5) plus a resolving C6, using the classic two-row
// "typing piano" layout: Z..M / S D G H J for the lower octave, Q..I / 2 3 5 6 7
// for the upper one — more natural to play than one continuous QWERTY row.
const KEYS: KeyDef[] = [
  { note: 'C4', type: 'white', key: 'z' },
  { note: 'C#4', type: 'black', key: 's' },
  { note: 'D4', type: 'white', key: 'x' },
  { note: 'D#4', type: 'black', key: 'd' },
  { note: 'E4', type: 'white', key: 'c' },
  { note: 'F4', type: 'white', key: 'v' },
  { note: 'F#4', type: 'black', key: 'g' },
  { note: 'G4', type: 'white', key: 'b' },
  { note: 'G#4', type: 'black', key: 'h' },
  { note: 'A4', type: 'white', key: 'n' },
  { note: 'A#4', type: 'black', key: 'j' },
  { note: 'B4', type: 'white', key: 'm' },
  { note: 'C5', type: 'white', key: 'q' },
  { note: 'C#5', type: 'black', key: '2' },
  { note: 'D5', type: 'white', key: 'w' },
  { note: 'D#5', type: 'black', key: '3' },
  { note: 'E5', type: 'white', key: 'e' },
  { note: 'F5', type: 'white', key: 'r' },
  { note: 'F#5', type: 'black', key: '5' },
  { note: 'G5', type: 'white', key: 't' },
  { note: 'G#5', type: 'black', key: '6' },
  { note: 'A5', type: 'white', key: 'y' },
  { note: 'A#5', type: 'black', key: '7' },
  { note: 'B5', type: 'white', key: 'u' },
  { note: 'C6', type: 'white', key: 'i' },
]

const BASE_WHITE_KEY_WIDTH = 48
const BASE_BLACK_KEY_WIDTH = 32
const BASE_WHITE_KEY_HEIGHT = 160
const BASE_BLACK_KEY_HEIGHT = 100
const INSTRUMENT_ID = 'synth-keyboard'

function buildKeyLayout(keys: KeyDef[]) {
  let whiteCount = 0
  const white: (KeyDef & { index: number })[] = []
  const black: (KeyDef & { leftIndex: number })[] = []
  keys.forEach((k) => {
    if (k.type === 'white') {
      white.push({ ...k, index: whiteCount })
      whiteCount += 1
    } else {
      black.push({ ...k, leftIndex: whiteCount })
    }
  })
  return { white, black }
}

const { white: WHITE_KEYS, black: BLACK_KEYS } = buildKeyLayout(KEYS)

function SynthKeyboard() {
  const recorder = useRecorder()
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set())
  const colorRef = useRef(nextLayerColor())
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [keyWidth, setKeyWidth] = useState(BASE_WHITE_KEY_WIDTH)

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      containerRef.current?.requestFullscreen().catch(() => {})
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    if (!isFullscreen) {
      setKeyWidth(BASE_WHITE_KEY_WIDTH)
      return
    }
    const recompute = () => {
      const maxByWidth = (window.innerWidth - 96) / WHITE_KEYS.length
      const maxByHeight =
        (window.innerHeight - 260) / (BASE_WHITE_KEY_HEIGHT / BASE_WHITE_KEY_WIDTH)
      const next = Math.max(BASE_WHITE_KEY_WIDTH, Math.min(maxByWidth, maxByHeight, 140))
      setKeyWidth(next)
    }
    recompute()
    window.addEventListener('resize', recompute)
    return () => window.removeEventListener('resize', recompute)
  }, [isFullscreen])

  const scale = keyWidth / BASE_WHITE_KEY_WIDTH
  const blackKeyWidth = BASE_BLACK_KEY_WIDTH * scale
  const whiteKeyHeight = BASE_WHITE_KEY_HEIGHT * scale
  const blackKeyHeight = BASE_BLACK_KEY_HEIGHT * scale

  useEffect(() => {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.6 },
    }).toDestination()
    synth.volume.value = -8

    recorder.registerInstrument({
      id: INSTRUMENT_ID,
      label: 'Synth Keyboard',
      color: colorRef.current,
      triggerAttack: (note, velocity) =>
        synth.triggerAttack(note, Tone.now(), velocity),
      triggerRelease: (note) => synth.triggerRelease(note, Tone.now()),
      triggerAttackRelease: (note, duration, time, velocity) =>
        synth.triggerAttackRelease(note, duration, time, velocity),
    })

    return () => {
      recorder.unregisterInstrument(INSTRUMENT_ID)
      synth.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pressNote = useCallback(
    (note: string) => {
      setActiveNotes((prev) => {
        if (prev.has(note)) return prev
        return new Set(prev).add(note)
      })
      recorder.noteOn(INSTRUMENT_ID, note)
    },
    [recorder],
  )

  const releaseNote = useCallback(
    (note: string) => {
      setActiveNotes((prev) => {
        if (!prev.has(note)) return prev
        const next = new Set(prev)
        next.delete(note)
        return next
      })
      recorder.noteOff(INSTRUMENT_ID, note)
    },
    [recorder],
  )

  useEffect(() => {
    const keyToNote = new Map(KEYS.map((k) => [k.key, k.note]))
    const pressedKeys = new Set<string>()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT') return
      const note = keyToNote.get(e.key.toLowerCase())
      if (!note || pressedKeys.has(e.key)) return
      pressedKeys.add(e.key)
      pressNote(note)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.key)
      const note = keyToNote.get(e.key.toLowerCase())
      if (!note) return
      releaseNote(note)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [pressNote, releaseNote])

  const isArmed = recorder.armedInstrumentId === INSTRUMENT_ID

  return (
    <div
      ref={containerRef}
      className={cn(
        'rounded-lg border bg-card p-5 shadow-sm',
        isFullscreen && 'flex h-screen flex-col justify-center',
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PianoIcon className="size-4" />
          <h2 className="font-heading text-lg">Synth Keyboard</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isArmed ? 'destructive' : 'outline'}
            size="sm"
            onClick={() =>
              isArmed
                ? recorder.stopRecording()
                : recorder.startRecording(INSTRUMENT_ID)
            }
          >
            {isArmed ? (
              <Square className="size-4" />
            ) : (
              <Disc className="size-4" />
            )}
            {isArmed ? 'Recording…' : 'Arm to Record'}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize className="size-4" />
            ) : (
              <Maximize className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          className="relative mx-auto select-none"
          style={{
            width: WHITE_KEYS.length * keyWidth,
            height: whiteKeyHeight,
          }}
        >
          {WHITE_KEYS.map((k) => (
            <button
              key={k.note}
              onMouseDown={() => pressNote(k.note)}
              onMouseUp={() => releaseNote(k.note)}
              onMouseLeave={() => releaseNote(k.note)}
              className={cn(
                'absolute top-0 flex items-end justify-center rounded-b-sm border border-key-white-foreground/30 bg-key-white pb-2 text-[10px] font-medium text-key-white-foreground shadow-sm transition-colors',
                activeNotes.has(k.note) && 'bg-signal/40',
              )}
              style={{
                left: k.index * keyWidth,
                width: keyWidth - 2,
                height: whiteKeyHeight,
              }}
            >
              {k.key.toUpperCase()}
            </button>
          ))}
          {BLACK_KEYS.map((k) => (
            <button
              key={k.note}
              onMouseDown={() => pressNote(k.note)}
              onMouseUp={() => releaseNote(k.note)}
              onMouseLeave={() => releaseNote(k.note)}
              className={cn(
                'absolute top-0 z-10 flex items-end justify-center rounded-b-sm border border-key-black-foreground/20 bg-key-black pb-2 text-[10px] font-medium text-key-black-foreground shadow-md',
                activeNotes.has(k.note) && 'bg-signal text-signal-foreground',
              )}
              style={{
                left: k.leftIndex * keyWidth - blackKeyWidth / 2,
                width: blackKeyWidth,
                height: blackKeyHeight,
              }}
            >
              {k.key.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SynthKeyboard
