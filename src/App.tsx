import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import AppSettingsPage from './pages/AppSettingsPage';
import IndexSettingsPage from './pages/IndexSettingsPage';
import { Sidebar } from '@/components/sidebar';

function App() {
  return (
    <Router>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Routes>
            <Route path="/" element={<Navigate to="/search?index=logs-events" replace />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings/app" element={<AppSettingsPage />} />
            <Route path="/settings/index" element={<IndexSettingsPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
