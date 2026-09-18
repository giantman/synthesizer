import Sidebar from './components/Sidebar'
import Instruments from './components/Instruments'
import PlayerBar from './components/PlayerBar'
import RecorderPanel from './components/RecorderPanel'

function App() {
  return (
    <div className="flex h-screen flex-col">
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="bg-grid flex-1 overflow-y-auto bg-background p-10">
          <Instruments />
        </main>
        <RecorderPanel />
      </div>
      <PlayerBar />
    </div>
  )
}

export default App
