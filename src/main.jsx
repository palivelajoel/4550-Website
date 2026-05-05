import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Admin from './Admin.jsx'
import Landing from './Landing.jsx'
import Hub from './Hub.jsx'

const path = window.location.pathname

const Page =
  path === '/admin'                         ? Admin
  : path === '/login' || path === '/dashboard' ? App
  : path === '/hub'                          ? Hub
  : Landing

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Page />
  </StrictMode>
)
