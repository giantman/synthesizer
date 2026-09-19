import Sidebar from './components/Sidebar'
import Instruments from './components/Instruments'
import RecorderPanel from './components/RecorderPanel'

function App() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="bg-grid flex-1 overflow-y-auto bg-background p-6">
        <Instruments />
      </main>
      <RecorderPanel />
    </div>
  )
}

export default App
