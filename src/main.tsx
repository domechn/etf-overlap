import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n';
import App from './App.tsx'
import { inject } from '@vercel/analytics'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Vercel Web Analytics: privacy-friendly page views. A no-op until Analytics is enabled for the project in the Vercel dashboard.
inject()
