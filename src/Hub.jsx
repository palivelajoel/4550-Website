import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Admin from './Admin.jsx'
import Landing from './Landing.jsx'

const path = window.location.pathname

const Page = path === '/admin' ? Admin
           : path === '/login' || path === '/dashboard' ? App
           : Landing

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>
)
