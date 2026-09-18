import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './components/theme-provider'
import { RecorderProvider } from './lib/recorder-context'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="synthesizer-ui-theme">
      <RecorderProvider>
        <App />
      </RecorderProvider>
    </ThemeProvider>
  </StrictMode>,
)
