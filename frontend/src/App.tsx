import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { DesktopFrame } from './components/layout/DesktopFrame'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ChatPage } from './components/pages/ChatPage'
import { NotesPage } from './components/pages/NotesPage'
import { SettingsPage } from './components/pages/SettingsPage'
import { EngPage } from './components/pages/EngPage'
import { WorkspacePage } from './components/pages/WorkspacePage'
import { PluginPage } from './components/pages/PluginPage'

/**
 * One boundary per route, keyed by pathname: a page that throws shows a
 * diagnostic panel instead of blanking the app, and navigating away recovers.
 */
function Boundary({ children }: { children: ReactNode }) {
  const location = useLocation()
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<DesktopFrame />}>
          <Route path="/" element={<Boundary><ChatPage /></Boundary>} />
          <Route path="/notes" element={<Boundary><NotesPage /></Boundary>} />
          <Route path="/notes/new" element={<Boundary><NotesPage /></Boundary>} />
          <Route path="/notes/:slug" element={<Boundary><NotesPage /></Boundary>} />
          <Route path="/settings" element={<Boundary><SettingsPage /></Boundary>} />
          <Route path="/eng" element={<Boundary><EngPage /></Boundary>} />
          <Route path="/plugins" element={<Boundary><PluginPage /></Boundary>} />
          <Route path="/workspace" element={<Boundary><WorkspacePage /></Boundary>} />
          <Route path="*" element={<Boundary><ChatPage /></Boundary>} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
