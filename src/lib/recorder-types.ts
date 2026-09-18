export type NoteEvent = {
  note: string
  time: number
  duration: number
  velocity: number
}

export type Layer = {
  id: string
  instrumentId: string
  instrumentLabel: string
  color: string
  muted: boolean
  events: NoteEvent[]
}

export type RegisteredInstrument = {
  id: string
  label: string
  color: string
  triggerAttack: (note: string, velocity?: number) => void
  triggerRelease: (note: string) => void
  triggerAttackRelease: (
    note: string,
    duration: number,
    time: number,
    velocity?: number,
  ) => void
}
