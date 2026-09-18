import * as Tone from 'tone'
import { createContext, useContext, useRef, useState } from 'react'
import type { Layer, NoteEvent, RegisteredInstrument } from './recorder-types'

type InstrumentSummary = { id: string; label: string; color: string }

type RecorderContextValue = {
  isPlaying: boolean
  isRecording: boolean
  armedInstrumentId: string | null
  bpm: number
  bars: number
  layers: Layer[]
  instruments: InstrumentSummary[]
  metronomeEnabled: boolean
  togglePlay: () => void
  startRecording: (instrumentId: string) => void
  stopRecording: () => void
  setBpm: (bpm: number) => void
  setBars: (bars: number) => void
  toggleMetronome: () => void
  toggleMuteLayer: (layerId: string) => void
  deleteLayer: (layerId: string) => void
  registerInstrument: (instrument: RegisteredInstrument) => void
  unregisterInstrument: (id: string) => void
  noteOn: (instrumentId: string, note: string, velocity?: number) => void
  noteOff: (instrumentId: string, note: string) => void
}

const RecorderContext = createContext<RecorderContextValue | null>(null)

const LAYER_COLORS = [
  '#c98a2c', // brass
  '#5b7065', // sage
  '#8a5a44', // terracotta
  '#4d6a7a', // dusty blue
  '#8a7a4d', // olive brass
  '#6e5a6e', // plum grey
]
let colorCursor = 0
export function nextLayerColor() {
  const color = LAYER_COLORS[colorCursor % LAYER_COLORS.length]
  colorCursor += 1
  return color
}

export function RecorderProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [armedInstrumentId, setArmedInstrumentId] = useState<string | null>(
    null,
  )
  const [bpm, setBpmValue] = useState(100)
  const [bars, setBarsValue] = useState(4)
  const [layers, setLayers] = useState<Layer[]>([])
  const [instruments, setInstruments] = useState<InstrumentSummary[]>([])
  const [metronomeEnabled, setMetronomeEnabled] = useState(false)

  const isPlayingRef = useRef(false)
  const isRecordingRef = useRef(false)
  const armedRef = useRef(false)
  const armedInstrumentIdRef = useRef<string | null>(null)
  const recordStartRef = useRef(0)
  const recordBufferRef = useRef<NoteEvent[]>([])
  const pendingAttacksRef = useRef<Map<string, { time: number; velocity: number }>>(
    new Map(),
  )
  const instrumentsRef = useRef<Map<string, RegisteredInstrument>>(new Map())
  const partsRef = useRef<Map<string, Tone.Part>>(new Map())
  const boundaryIdRef = useRef<number | null>(null)
  const loopSecondsRef = useRef(Tone.Time('4m').toSeconds())
  const barsRef = useRef(4)

  const metronomeEnabledRef = useRef(false)
  const metronomeIdRef = useRef<number | null>(null)
  const metronomeBeatRef = useRef(0)
  const metronomeSynthRef = useRef<Tone.Synth | null>(null)

  const ensureAudioStarted = async () => {
    if (Tone.context.state !== 'running') await Tone.start()
  }

  const beginRecordingNow = () => {
    recordStartRef.current = Tone.Transport.seconds
    recordBufferRef.current = []
    pendingAttacksRef.current.clear()
    isRecordingRef.current = true
    setIsRecording(true)
  }

  const commitLayer = () => {
    const events = recordBufferRef.current
    recordBufferRef.current = []
    pendingAttacksRef.current.clear()
    isRecordingRef.current = false
    setIsRecording(false)
    const instrumentId = armedInstrumentIdRef.current
    armedInstrumentIdRef.current = null
    setArmedInstrumentId(null)

    if (!instrumentId || events.length === 0) return
    const instrument = instrumentsRef.current.get(instrumentId)
    if (!instrument) return

    const part = new Tone.Part((time, value) => {
      const ev = value as unknown as NoteEvent
      instrument.triggerAttackRelease(ev.note, ev.duration, time, ev.velocity)
    }, events.map((e) => ({ time: e.time, note: e.note, duration: e.duration, velocity: e.velocity })))
    part.loop = true
    part.loopEnd = loopSecondsRef.current
    part.start(0)

    const layerId = `${instrumentId}-${Date.now()}`
    partsRef.current.set(layerId, part)
    setLayers((prev) => [
      ...prev,
      {
        id: layerId,
        instrumentId,
        instrumentLabel: instrument.label,
        color: instrument.color,
        muted: false,
        events,
      },
    ])
  }

  const ensureBoundaryScheduler = () => {
    if (boundaryIdRef.current !== null) {
      Tone.Transport.clear(boundaryIdRef.current)
    }
    loopSecondsRef.current = Tone.Time(`${barsRef.current}m`).toSeconds()
    boundaryIdRef.current = Tone.Transport.scheduleRepeat(() => {
      if (armedRef.current) {
        armedRef.current = false
        beginRecordingNow()
      } else if (isRecordingRef.current) {
        commitLayer()
      }
    }, loopSecondsRef.current, 0)

    partsRef.current.forEach((part) => {
      part.loopEnd = loopSecondsRef.current
    })
  }

  const getMetronomeSynth = () => {
    if (!metronomeSynthRef.current) {
      metronomeSynthRef.current = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
      }).toDestination()
      metronomeSynthRef.current.volume.value = -12
    }
    return metronomeSynthRef.current
  }

  const ensureMetronomeScheduler = () => {
    if (metronomeIdRef.current !== null) {
      Tone.Transport.clear(metronomeIdRef.current)
    }
    metronomeBeatRef.current = 0
    metronomeIdRef.current = Tone.Transport.scheduleRepeat((time) => {
      if (metronomeEnabledRef.current) {
        const isDownbeat = metronomeBeatRef.current % 4 === 0
        getMetronomeSynth().triggerAttackRelease(
          isDownbeat ? 'C6' : 'G5',
          0.03,
          time,
          isDownbeat ? 1 : 0.6,
        )
      }
      metronomeBeatRef.current += 1
    }, '4n', 0)
  }

  const clearMetronomeScheduler = () => {
    if (metronomeIdRef.current !== null) {
      Tone.Transport.clear(metronomeIdRef.current)
      metronomeIdRef.current = null
    }
  }

  const toggleMetronome = () => {
    const next = !metronomeEnabledRef.current
    metronomeEnabledRef.current = next
    setMetronomeEnabled(next)
  }

  const togglePlay = async () => {
    await ensureAudioStarted()
    if (isPlayingRef.current) {
      Tone.Transport.stop()
      clearMetronomeScheduler()
      isPlayingRef.current = false
      setIsPlaying(false)
    } else {
      ensureBoundaryScheduler()
      ensureMetronomeScheduler()
      Tone.Transport.start()
      isPlayingRef.current = true
      setIsPlaying(true)
    }
  }

  const startRecording = async (instrumentId: string) => {
    await ensureAudioStarted()
    armedInstrumentIdRef.current = instrumentId
    setArmedInstrumentId(instrumentId)

    armedRef.current = true

    if (!isPlayingRef.current) {
      Tone.Transport.position = 0
      ensureBoundaryScheduler()
      ensureMetronomeScheduler()
      Tone.Transport.start()
      isPlayingRef.current = true
      setIsPlaying(true)
    }
    // The armed flag is picked up by the boundary scheduler's next tick
    // (immediately, for a fresh start; at the next loop boundary otherwise),
    // which calls beginRecordingNow(). Scheduling this via the same
    // Tone.Transport tick used for commits keeps both transitions on one
    // code path instead of racing a synchronous call against the scheduler.
  }

  const stopRecording = () => {
    if (isRecordingRef.current) {
      commitLayer()
    } else {
      armedRef.current = false
      armedInstrumentIdRef.current = null
      setArmedInstrumentId(null)
    }
  }

  const setBpm = (value: number) => {
    setBpmValue(value)
    Tone.Transport.bpm.value = value
    if (isPlayingRef.current) ensureBoundaryScheduler()
  }

  const setBars = (value: number) => {
    barsRef.current = value
    setBarsValue(value)
    if (isPlayingRef.current) ensureBoundaryScheduler()
  }

  const toggleMuteLayer = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== layerId) return l
        const muted = !l.muted
        const part = partsRef.current.get(layerId)
        if (part) part.mute = muted
        return { ...l, muted }
      }),
    )
  }

  const deleteLayer = (layerId: string) => {
    const part = partsRef.current.get(layerId)
    part?.dispose()
    partsRef.current.delete(layerId)
    setLayers((prev) => prev.filter((l) => l.id !== layerId))
  }

  const registerInstrument = (instrument: RegisteredInstrument) => {
    instrumentsRef.current.set(instrument.id, instrument)
    setInstruments((prev) => {
      if (prev.some((i) => i.id === instrument.id)) return prev
      return [
        ...prev,
        { id: instrument.id, label: instrument.label, color: instrument.color },
      ]
    })
  }

  const unregisterInstrument = (id: string) => {
    instrumentsRef.current.delete(id)
    setInstruments((prev) => prev.filter((i) => i.id !== id))
  }

  const noteOn = (instrumentId: string, note: string, velocity = 0.9) => {
    const instrument = instrumentsRef.current.get(instrumentId)
    instrument?.triggerAttack(note, velocity)
    if (isRecordingRef.current && armedInstrumentIdRef.current === instrumentId) {
      pendingAttacksRef.current.set(note, {
        time: Tone.Transport.seconds - recordStartRef.current,
        velocity,
      })
    }
  }

  const noteOff = (instrumentId: string, note: string) => {
    const instrument = instrumentsRef.current.get(instrumentId)
    instrument?.triggerRelease(note)
    if (isRecordingRef.current && armedInstrumentIdRef.current === instrumentId) {
      const pending = pendingAttacksRef.current.get(note)
      if (pending) {
        const now = Tone.Transport.seconds - recordStartRef.current
        const duration = Math.max(0.05, now - pending.time)
        recordBufferRef.current.push({
          note,
          time: pending.time,
          duration,
          velocity: pending.velocity,
        })
        pendingAttacksRef.current.delete(note)
      }
    }
  }

  const value: RecorderContextValue = {
    isPlaying,
    isRecording,
    armedInstrumentId,
    bpm,
    bars,
    layers,
    instruments,
    metronomeEnabled,
    togglePlay,
    startRecording,
    stopRecording,
    setBpm,
    setBars,
    toggleMetronome,
    toggleMuteLayer,
    deleteLayer,
    registerInstrument,
    unregisterInstrument,
    noteOn,
    noteOff,
  }

  return (
    <RecorderContext.Provider value={value}>
      {children}
    </RecorderContext.Provider>
  )
}

export function useRecorder() {
  const ctx = useContext(RecorderContext)
  if (!ctx) throw new Error('useRecorder must be used within a RecorderProvider')
  return ctx
}
