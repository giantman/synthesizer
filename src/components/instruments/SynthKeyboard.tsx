import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import { cn } from '@/lib/utils'
import { useRecorder, nextLayerColor } from '@/lib/recorder-context'
import { Button } from '@/components/ui/button'
import { Disc, Square, Piano as PianoIcon } from 'lucide-react'

type KeyDef = { note: string; type: 'white' | 'black'; key: string }

const KEYS: KeyDef[] = [
  { note: 'C4', type: 'white', key: 'a' },
  { note: 'C#4', type: 'black', key: 'w' },
  { note: 'D4', type: 'white', key: 's' },
  { note: 'D#4', type: 'black', key: 'e' },
  { note: 'E4', type: 'white', key: 'd' },
  { note: 'F4', type: 'white', key: 'f' },
  { note: 'F#4', type: 'black', key: 't' },
  { note: 'G4', type: 'white', key: 'g' },
  { note: 'G#4', type: 'black', key: 'y' },
  { note: 'A4', type: 'white', key: 'h' },
  { note: 'A#4', type: 'black', key: 'u' },
  { note: 'B4', type: 'white', key: 'j' },
  { note: 'C5', type: 'white', key: 'k' },
  { note: 'C#5', type: 'black', key: 'o' },
  { note: 'D5', type: 'white', key: 'l' },
  { note: 'D#5', type: 'black', key: 'p' },
  { note: 'E5', type: 'white', key: ';' },
]

const WHITE_KEY_WIDTH = 48
const BLACK_KEY_WIDTH = 32
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
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PianoIcon className="size-5" />
          <h2 className="font-heading text-xl">Synth Keyboard</h2>
        </div>
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
      </div>

      <div
        className="relative mx-auto select-none"
        style={{ width: WHITE_KEYS.length * WHITE_KEY_WIDTH, height: 160 }}
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
              left: k.index * WHITE_KEY_WIDTH,
              width: WHITE_KEY_WIDTH - 2,
              height: 160,
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
              left: k.leftIndex * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2,
              width: BLACK_KEY_WIDTH,
              height: 100,
            }}
          >
            {k.key.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}

export default SynthKeyboard
