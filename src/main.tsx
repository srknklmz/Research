import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './stil.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Ana ekrana eklenebilmesi ve zayıf bağlantıda hızlı açılması için.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
