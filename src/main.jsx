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
  : path === '/member-hub'                     ? Hub
  : path === '/member-hub/calendar'            ? HubCalendar
  : path === '/member-hub/tasks'               ? HubTasks
  : path === '/member-hub/media'               ? HubMedia
  : path === '/member-hub/announcements'       ? HubAnnouncements
  : path === '/member-hub/resources'           ? HubResources
  : path === '/member-hub/projector'           ? HubProjector
  : Landing

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Page />
  </StrictMode>
)
