import { useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import { cn } from '@/lib/utils'
import { useRecorder, nextLayerColor } from '@/lib/recorder-context'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Disc, Square, Sparkles } from 'lucide-react'
import {
  CHORD_TYPES,
  MODIFIERS,
  NOTE_NAMES,
  scaleDegrees,
  buildChordMidiNotes,
  applyVoicing,
  midiToNoteName,
  chordName,
  type ChordTypeId,
  type ModifierId,
  type ScaleId,
} from '@/lib/chord-theory'

const CHORD_ID = 'chord-synth'
const BASS_ID = 'chord-synth-bass'
const CHORD_BASE_MIDI = 60 // C4
const BASS_BASE_MIDI = 36 // C2

type EngineType = 'analog' | 'fm' | 'ep'

const ENGINES: { id: EngineType; label: string }[] = [
  { id: 'analog', label: 'Analog' },
  { id: 'fm', label: 'FM' },
  { id: 'ep', label: 'EP' },
]

function buildEngine(type: EngineType) {
  if (type === 'analog') {
    const filter = new Tone.Filter(2200, 'lowpass')
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.02, decay: 0.25, sustain: 0.45, release: 1 },
    })
    synth.connect(filter)
    filter.toDestination()
    return {
      instrument: synth,
      dispose: () => {
        synth.dispose()
        filter.dispose()
      },
    }
  }
  if (type === 'fm') {
    const synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2,
      modulationIndex: 8,
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.8 },
    }).toDestination()
    return { instrument: synth, dispose: () => synth.dispose() }
  }
  const synth = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 3.01,
    modulationIndex: 3,
    envelope: { attack: 0.005, decay: 1.2, sustain: 0.1, release: 1.2 },
  }).toDestination()
  return { instrument: synth, dispose: () => synth.dispose() }
}

function ChordSynth() {
  const recorder = useRecorder()
  const chordColorRef = useRef(nextLayerColor())
  const bassColorRef = useRef(nextLayerColor())
  const engineRef = useRef<ReturnType<typeof buildEngine> | null>(null)
  const bassRef = useRef<Tone.MonoSynth | null>(null)

  const activeNotesRef = useRef<string[]>([])
  const activeBassNoteRef = useRef<string | null>(null)
  const activeRootRef = useRef<number | null>(null)
  const lastQualityRef = useRef<ChordTypeId>('maj')

  const [engine, setEngine] = useState<EngineType>('analog')
  const [chordType, setChordType] = useState<ChordTypeId>('maj')
  const [modifiers, setModifiers] = useState<ModifierId[]>([])
  const [voicing, setVoicing] = useState(0)
  const [keyMode, setKeyMode] = useState(false)
  const [keyRoot, setKeyRoot] = useState(0)
  const [keyScale, setKeyScale] = useState<ScaleId>('major')
  const [bassEnabled, setBassEnabled] = useState(true)
  const [pressedIndex, setPressedIndex] = useState<number | null>(null)
  const [lastChordLabel, setLastChordLabel] = useState('—')

  // Bass voice + registration: lives for the component's lifetime.
  // Chord engine: rebuilt whenever the selected engine type changes.
  // Registered before the bass voice below so it's the default pick in the
  // recorder's "instrument to record" list.
  useEffect(() => {
    const handle = buildEngine(engine)
    engineRef.current = handle

    recorder.registerInstrument({
      id: CHORD_ID,
      label: 'Chord Synth',
      color: chordColorRef.current,
      triggerAttack: (note, velocity) =>
        handle.instrument.triggerAttack(note, Tone.now(), velocity),
      triggerRelease: (note) => handle.instrument.triggerRelease(note, Tone.now()),
      triggerAttackRelease: (note, duration, time, velocity) =>
        handle.instrument.triggerAttackRelease(note, duration, time, velocity),
    })

    return () => {
      handle.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine])

  // Unregister the chord voice only when the whole instrument unmounts.
  useEffect(() => {
    return () => {
      recorder.unregisterInstrument(CHORD_ID)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const bass = new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.7, release: 0.6 },
    }).toDestination()
    bassRef.current = bass

    recorder.registerInstrument({
      id: BASS_ID,
      label: 'Chord Synth — Bass',
      color: bassColorRef.current,
      triggerAttack: (note, velocity) => bass.triggerAttack(note, Tone.now(), velocity),
      triggerRelease: () => bass.triggerRelease(Tone.now()),
      triggerAttackRelease: (note, duration, time, velocity) =>
        bass.triggerAttackRelease(note, duration, time, velocity),
    })

    return () => {
      recorder.unregisterInstrument(BASS_ID)
      bass.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const triggerChord = (
    rootPitchClass: number,
    type: ChordTypeId,
    mods: ModifierId[],
    voicingValue: number,
  ) => {
    const raw = buildChordMidiNotes(rootPitchClass, type, mods, CHORD_BASE_MIDI)
    const voiced = applyVoicing(raw, voicingValue)
    const noteNames = voiced.map(midiToNoteName)
    noteNames.forEach((n) => recorder.noteOn(CHORD_ID, n))
    activeNotesRef.current = noteNames
    lastQualityRef.current = type
    setLastChordLabel(chordName(rootPitchClass, type, mods))

    if (bassEnabled) {
      const bassNote = midiToNoteName(BASS_BASE_MIDI + rootPitchClass)
      recorder.noteOn(BASS_ID, bassNote)
      activeBassNoteRef.current = bassNote
    }
  }

  const releaseChord = () => {
    activeNotesRef.current.forEach((n) => recorder.noteOff(CHORD_ID, n))
    activeNotesRef.current = []
    if (activeBassNoteRef.current) {
      recorder.noteOff(BASS_ID, activeBassNoteRef.current)
      activeBassNoteRef.current = null
    }
  }

  const retriggerHeld = (nextMods: ModifierId[], nextVoicing: number) => {
    if (activeRootRef.current === null) return
    releaseChord()
    triggerChord(activeRootRef.current, lastQualityRef.current, nextMods, nextVoicing)
  }

  const pressChromaticRoot = (pitchClass: number) => {
    setPressedIndex(pitchClass)
    activeRootRef.current = pitchClass
    triggerChord(pitchClass, chordType, modifiers, voicing)
  }

  const pressDegree = (degreeIndex: number) => {
    const degrees = scaleDegrees(keyScale)
    const degree = degrees[degreeIndex]
    const rootPitchClass = (keyRoot + degree.offset) % 12
    setPressedIndex(degreeIndex)
    activeRootRef.current = rootPitchClass
    triggerChord(rootPitchClass, degree.quality, modifiers, voicing)
  }

  const releasePad = () => {
    setPressedIndex(null)
    activeRootRef.current = null
    releaseChord()
  }

  const toggleModifier = (id: ModifierId) => {
    const next = modifiers.includes(id)
      ? modifiers.filter((m) => m !== id)
      : [...modifiers, id]
    setModifiers(next)
    retriggerHeld(next, voicing)
  }

  const handleVoicingChange = (value: number) => {
    setVoicing(value)
    retriggerHeld(modifiers, value)
  }

  const isArmed = recorder.armedInstrumentId === CHORD_ID
  const pads = keyMode ? scaleDegrees(keyScale) : NOTE_NAMES

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4" />
          <h2 className="font-heading text-lg">Chord Synth</h2>
          <span className="ml-2 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {lastChordLabel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex overflow-hidden rounded-md border">
            {ENGINES.map((e) => (
              <button
                key={e.id}
                onClick={() => setEngine(e.id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  engine === e.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted',
                )}
              >
                {e.label}
              </button>
            ))}
          </div>
          <Button
            variant={isArmed ? 'destructive' : 'outline'}
            size="sm"
            onClick={() =>
              isArmed ? recorder.stopRecording() : recorder.startRecording(CHORD_ID)
            }
          >
            {isArmed ? <Square className="size-4" /> : <Disc className="size-4" />}
            {isArmed ? 'Recording…' : 'Arm to Record'}
          </Button>
        </div>
      </div>

      {/* Chord type row */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {CHORD_TYPES.map((t) => (
          <button
            key={t.id}
            disabled={keyMode}
            onClick={() => setChordType(t.id)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
              keyMode && 'cursor-not-allowed opacity-40',
              !keyMode && chordType === t.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-muted',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Modifier row */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {MODIFIERS.map((m) => (
          <button
            key={m.id}
            onClick={() => toggleModifier(m.id)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
              modifiers.includes(m.id)
                ? 'border-accent-foreground/20 bg-accent text-accent-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-muted',
            )}
          >
            +{m.label}
          </button>
        ))}
      </div>

      {/* Root / scale-degree pads */}
      <div className="mb-4 grid select-none grid-cols-7 gap-1.5 sm:grid-cols-12">
        {pads.map((pad, index) => {
          const label = keyMode
            ? (pad as { roman: string }).roman
            : (pad as string)
          return (
            <button
              key={label + index}
              onMouseDown={() =>
                keyMode ? pressDegree(index) : pressChromaticRoot(index)
              }
              onMouseUp={releasePad}
              onMouseLeave={releasePad}
              className={cn(
                'flex h-12 items-center justify-center rounded-md border text-sm font-medium transition-colors',
                pressedIndex === index
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Bottom control row */}
      <div className="flex flex-wrap items-end gap-5">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Voicing dial</label>
          <div className="flex items-center gap-3">
            <Slider
              value={[voicing]}
              min={-6}
              max={6}
              step={1}
              onValueChange={([v]) => handleVoicingChange(v)}
              className="w-40"
            />
            <span className="w-8 text-xs tabular-nums text-muted-foreground">
              {voicing > 0 ? `+${voicing}` : voicing}
            </span>
          </div>
        </div>

        <Button
          variant={bassEnabled ? 'default' : 'outline'}
          size="sm"
          onClick={() => setBassEnabled((v) => !v)}
        >
          Bass layer
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant={keyMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setKeyMode((v) => !v)
              releasePad()
            }}
          >
            Key Mode
          </Button>

          <Select
            value={String(keyRoot)}
            onValueChange={(v) => setKeyRoot(Number(v))}
            disabled={!keyMode}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTE_NAMES.map((n, i) => (
                <SelectItem key={n} value={String(i)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={keyScale}
            onValueChange={(v) => setKeyScale(v as ScaleId)}
            disabled={!keyMode}
          >
            <SelectTrigger className="h-8 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

export default ChordSynth
