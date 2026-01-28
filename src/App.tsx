import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import AppSettingsPage from './pages/AppSettingsPage';
import ServerSettingsPage from './pages/ServerSettingsPage';
import { Sidebar } from '@/components/sidebar';
import { ServerProvider } from '@/context/server-context';

function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/search?index=logs-events" replace />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings/app" element={<AppSettingsPage />} />
            <Route path="/settings/server/:serverId" element={<ServerSettingsPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ServerProvider>
      <Router>
        <AppLayout />
      </Router>
    </ServerProvider>
  );
}

export default App;
