import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Admin from './Admin.jsx'
import Landing from './Landing.jsx'
import Hub from './Hub.jsx'
import HubCalendar from './HubCalendar.jsx'
import HubTasks from './HubTasks.jsx'
import HubMedia from './HubMedia.jsx'
import HubAnnouncements from './HubAnnouncements.jsx'
import HubResources from './HubResources.jsx'
import HubProjector from './HubProjector.jsx'

const path = window.location.pathname

const Page =
  path === '/admin'                            ? Admin
  : path === '/login' || path === '/dashboard' ? App
  : path === '/hub'                            ? Hub
  : path === '/hub/calendar'                   ? HubCalendar
  : path === '/hub/tasks'                      ? HubTasks
  : path === '/hub/media'                      ? HubMedia
  : path === '/hub/announcements'              ? HubAnnouncements
  : path === '/hub/resources'                  ? HubResources
  : path === '/hub/projector'                  ? HubProjector
  : Landing

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Page />
  </StrictMode>
)
