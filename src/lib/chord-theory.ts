import * as Tone from 'tone'

export type ChordTypeId = 'maj' | 'min' | 'dim' | 'aug' | 'sus2' | 'sus4' | 'power'
export type ModifierId = '6' | '7' | 'M7' | '9'
export type ScaleId = 'major' | 'minor'

export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
]

export const CHORD_TYPES: { id: ChordTypeId; label: string; intervals: number[] }[] = [
  { id: 'maj', label: 'Maj', intervals: [0, 4, 7] },
  { id: 'min', label: 'Min', intervals: [0, 3, 7] },
  { id: 'dim', label: 'Dim', intervals: [0, 3, 6] },
  { id: 'aug', label: 'Aug', intervals: [0, 4, 8] },
  { id: 'sus2', label: 'Sus2', intervals: [0, 2, 7] },
  { id: 'sus4', label: 'Sus4', intervals: [0, 5, 7] },
  { id: 'power', label: '5', intervals: [0, 7] },
]

export const MODIFIERS: { id: ModifierId; label: string; interval: number }[] = [
  { id: '6', label: '6', interval: 9 },
  { id: '7', label: '7', interval: 10 },
  { id: 'M7', label: 'M7', interval: 11 },
  { id: '9', label: '9', interval: 14 },
]

type ScaleDegree = { roman: string; offset: number; quality: ChordTypeId }

export const MAJOR_SCALE_DEGREES: ScaleDegree[] = [
  { roman: 'I', offset: 0, quality: 'maj' },
  { roman: 'ii', offset: 2, quality: 'min' },
  { roman: 'iii', offset: 4, quality: 'min' },
  { roman: 'IV', offset: 5, quality: 'maj' },
  { roman: 'V', offset: 7, quality: 'maj' },
  { roman: 'vi', offset: 9, quality: 'min' },
  { roman: 'vii°', offset: 11, quality: 'dim' },
]

export const MINOR_SCALE_DEGREES: ScaleDegree[] = [
  { roman: 'i', offset: 0, quality: 'min' },
  { roman: 'ii°', offset: 2, quality: 'dim' },
  { roman: 'III', offset: 3, quality: 'maj' },
  { roman: 'iv', offset: 5, quality: 'min' },
  { roman: 'v', offset: 7, quality: 'min' },
  { roman: 'VI', offset: 8, quality: 'maj' },
  { roman: 'VII', offset: 10, quality: 'maj' },
]

export function scaleDegrees(scale: ScaleId): ScaleDegree[] {
  return scale === 'major' ? MAJOR_SCALE_DEGREES : MINOR_SCALE_DEGREES
}

export function buildChordMidiNotes(
  rootPitchClass: number,
  typeId: ChordTypeId,
  modifiers: ModifierId[],
  baseOctaveMidi = 60,
): number[] {
  const type = CHORD_TYPES.find((t) => t.id === typeId) ?? CHORD_TYPES[0]
  const intervals = new Set(type.intervals)
  modifiers.forEach((m) => {
    const mod = MODIFIERS.find((x) => x.id === m)
    if (mod) intervals.add(mod.interval)
  })
  return Array.from(intervals)
    .sort((a, b) => a - b)
    .map((interval) => baseOctaveMidi + rootPitchClass + interval)
}

/**
 * Cycles the chord through inversions one note at a time, mirroring the
 * "cascade of voicing inversions" a hardware voicing dial produces: each
 * step moves exactly the lowest (or highest) tone by an octave.
 */
export function applyVoicing(notes: number[], voicing: number): number[] {
  const result = [...notes].sort((a, b) => a - b)
  let v = voicing
  while (v > 0) {
    const lowest = result.shift()
    if (lowest === undefined) break
    result.push(lowest + 12)
    v--
  }
  while (v < 0) {
    const highest = result.pop()
    if (highest === undefined) break
    result.unshift(highest - 12)
    v++
  }
  return result.sort((a, b) => a - b)
}

export function midiToNoteName(midi: number): string {
  return Tone.Frequency(midi, 'midi').toNote()
}

export function chordName(
  rootPitchClass: number,
  typeId: ChordTypeId,
  modifiers: ModifierId[],
): string {
  const root = NOTE_NAMES[((rootPitchClass % 12) + 12) % 12]
  const type = CHORD_TYPES.find((t) => t.id === typeId)
  const typeLabel = typeId === 'maj' ? '' : (type?.label ?? '')
  const modLabel = modifiers.length ? modifiers.join('') : ''
  return `${root}${typeLabel}${modLabel}`
}
