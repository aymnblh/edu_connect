import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './visual-identity.css'
import App from './App.tsx'
import { initPwaInstall, registerPwaServiceWorker } from './lib/pwaInstall'

initPwaInstall()
registerPwaServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
