import SynthKeyboard from '@/components/instruments/SynthKeyboard'
import ChordSynth from '@/components/instruments/ChordSynth'

function Instruments() {
  return (
    <section>
      <h1 className="font-heading mb-4 text-3xl tracking-tight">Instruments</h1>
      <div className="flex flex-col gap-4">
        <ChordSynth />
        <SynthKeyboard />
      </div>
    </section>
  )
}

export default Instruments
