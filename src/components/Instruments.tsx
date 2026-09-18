import SynthKeyboard from '@/components/instruments/SynthKeyboard'
import ChordSynth from '@/components/instruments/ChordSynth'

function Instruments() {
  return (
    <section>
      <h1 className="font-heading mb-6 text-4xl tracking-tight">Instruments</h1>
      <div className="flex flex-col gap-6">
        <ChordSynth />
        <SynthKeyboard />
      </div>
    </section>
  )
}

export default Instruments
