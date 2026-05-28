import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './context/ToastContext';
import { GoogleMapsProvider } from './context/GoogleMapsContext';
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App is ready to work offline.')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <GoogleMapsProvider>
        <App />
      </GoogleMapsProvider>
    </ToastProvider>
  </StrictMode>,
)
