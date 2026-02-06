import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchPage from './pages/SearchPage';
import AppSettingsPage from './pages/AppSettingsPage';
import ServerSettingsPage from './pages/ServerSettingsPage';
import { Sidebar } from '@/components/sidebar';
import { WindowControls } from '@/components/window-controls';
import { SearchTabs } from '@/components/search-tabs';
import { useConfigStore } from '@/store/use-config-store';
import { useSearchStore } from '@/store/use-search-store';
import { TooltipProvider } from '@/components/radix/tooltip';
import { useMemo, useCallback } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const EMPTY_ARRAY: any[] = [];

function TitleBar() {
  const isElectron = window.electron?.isElectron;
  const platform = window.electron?.platform;
  const location = useLocation();

  const servers = useConfigStore((state) => state.servers);
  const activeServerId = useConfigStore((state) => state.activeServerId);
  const activeServer = useMemo(
    () => servers.find((s) => s.id === activeServerId) || servers[0] || null,
    [servers, activeServerId]
  );

  const serverId = activeServer?.id || 'default';
  const tabs = useSearchStore((state) => state.tabs[serverId] || EMPTY_ARRAY);
  const activeTabId = useSearchStore(
    (state) => state.activeTabIds[serverId] || tabs[0]?.id || null
  );

  const setActiveTabId = useSearchStore((state) => state.setActiveTabId);
  const removeTab = useSearchStore((state) => state.removeTab);
  const addTab = useSearchStore((state) => state.addTab);

  const handleTabSelect = useCallback(
    (id: string) => {
      setActiveTabId(serverId, id);
    },
    [serverId, setActiveTabId]
  );

  if (!isElectron) return null;

  const isSearchPage = location.pathname.startsWith('/search');

  return (
    <div className="flex items-end justify-between h-12 bg-background border-b drag select-none w-full">
      <div className="flex items-end flex-1 h-full min-w-0 drag">
        {
          platform === 'darwin' && (
            <div className="w-20 shrink-0 no-drag h-full" />
          ) /* Traffic lights area is no-drag to allow interaction */
        }
        {isSearchPage && (
          <div className="flex-1 h-full min-w-0">
            <SearchTabs
              tabs={tabs}
              activeTabId={activeTabId}
              onTabSelect={handleTabSelect}
              onTabClose={(id) => removeTab(serverId, id)}
              onTabAdd={() => addTab(serverId)}
            />
          </div>
        )}
        {!isSearchPage && (
          <div className="px-4 text-xs font-medium text-muted-foreground flex items-center h-full drag pb-2">
            Scope Settings
          </div>
        )}
      </div>
      <div className="h-full flex items-center">
        <WindowControls />
      </div>
    </div>
  );
}

function AppLayout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <div className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<Navigate to="/search" replace />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/settings/app" element={<AppSettingsPage />} />
              <Route path="/settings/server/:serverId" element={<ServerSettingsPage />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router>
          <AppLayout />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
