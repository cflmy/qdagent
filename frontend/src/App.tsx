import { HashRouter, Routes, Route } from 'react-router-dom'
import { DesktopFrame } from './components/layout/DesktopFrame'
import { ChatPage } from './components/pages/ChatPage'
import { NotesPage } from './components/pages/NotesPage'
import { SettingsPage } from './components/pages/SettingsPage'
import { EngPage } from './components/pages/EngPage'
import { WorkspacePage } from './components/pages/WorkspacePage'
import { PluginPage } from './components/pages/PluginPage'

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<DesktopFrame />}>
          <Route path="/" element={<ChatPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/new" element={<NotesPage />} />
          <Route path="/notes/:slug" element={<NotesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/eng" element={<EngPage />} />
          <Route path="/plugins" element={<PluginPage />} />
          <Route path="/workspace" element={<WorkspacePage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
