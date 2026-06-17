import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { PantryPage } from './pages/PantryPage'
import { ItemEditorPage } from './pages/ItemEditorPage'
import { SnapPage } from './pages/SnapPage'
import { CookPage } from './pages/CookPage'
import { RecipePage } from './pages/RecipePage'
import { SettingsPage } from './pages/SettingsPage'

// HashRouter keeps the built app refresh-safe on any static host
// (GitHub Pages, plain nginx, file://) with no server rewrites.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<PantryPage />} />
          <Route path="add" element={<ItemEditorPage />} />
          <Route path="snap" element={<SnapPage />} />
          <Route path="cook" element={<CookPage />} />
          <Route path="recipe/:id" element={<RecipePage />} />
          <Route path="edit/:id" element={<ItemEditorPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
