// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import HomePage from './pages/HomePage.jsx'
import EpisodePage from './pages/EpisodePage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import { PlayerProvider } from './context/PlayerContext.jsx'

export default function App() {
  return (
    <PlayerProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/:slug" element={<EpisodePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PlayerProvider>
  )
}