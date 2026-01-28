import React, { createContext, useContext, useEffect, useState } from 'react';
import { ServerConfig } from '@/types/server';
import { SERVER_COLORS } from '@/lib/constants';

interface ServerContextType {
  servers: ServerConfig[];
  activeServer: ServerConfig | null;
  setActiveServerId: (id: string) => void;
  addServer: (server: Omit<ServerConfig, 'id'>) => void;
  updateServer: (id: string, server: Partial<ServerConfig>) => void;
  removeServer: (id: string) => void;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

const STORAGE_KEY = 'scope_servers';
const ACTIVE_ID_KEY = 'scope_active_server_id';

const DEFAULT_SERVER: ServerConfig = {
  id: 'default',
  name: 'Localhost',
  url: 'http://localhost:9200',
  color: SERVER_COLORS[0].bg,
};

export function ServerProvider({ children }: { children: React.ReactNode }) {
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      let savedServers: ServerConfig[] = [];
      
      if (window.electron?.loadConfig) {
        const config = await window.electron.loadConfig();
        if (config && config.servers) {
          savedServers = config.servers;
        }
      }

      if (savedServers.length === 0) {
        const localData = localStorage.getItem(STORAGE_KEY);
        if (localData) {
          try {
            savedServers = JSON.parse(localData);
          } catch (e) {
            savedServers = [DEFAULT_SERVER];
          }
        } else {
          savedServers = [DEFAULT_SERVER];
        }
      }

      setServers(savedServers);

      const savedActiveId = localStorage.getItem(ACTIVE_ID_KEY);
      if (savedActiveId && savedServers.find(s => s.id === savedActiveId)) {
        setActiveServerId(savedActiveId);
      } else {
        setActiveServerId(savedServers[0]?.id || null);
      }
      
      setIsLoaded(true);
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
    
    if (window.electron?.saveConfig) {
      window.electron.saveConfig({ servers });
    }
  }, [servers, isLoaded]);

  useEffect(() => {
    if (activeServerId) {
      localStorage.setItem(ACTIVE_ID_KEY, activeServerId);
    }
  }, [activeServerId]);

  const activeServer = servers.find((s) => s.id === activeServerId) || servers[0] || null;

  const addServer = (server: Omit<ServerConfig, 'id'>) => {
    const newServer = { ...server, id: crypto.randomUUID() };
    setServers((prev) => [...prev, newServer]);
    setActiveServerId(newServer.id);
  };

  const updateServer = (id: string, updates: Partial<ServerConfig>) => {
    setServers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeServer = (id: string) => {
    setServers((prev) => prev.filter((s) => s.id !== id));
    if (activeServerId === id) {
      const remaining = servers.filter(s => s.id !== id);
      setActiveServerId(remaining[0]?.id || null);
    }
  };

  if (!isLoaded) {
    return null; // Or a loading spinner
  }

  return (
    <ServerContext.Provider
      value={{
        servers,
        activeServer,
        setActiveServerId,
        addServer,
        updateServer,
        removeServer,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
}

export function useServer() {
  const context = useContext(ServerContext);
  if (context === undefined) {
    throw new Error('useServer must be used within a ServerProvider');
  }
  return context;
}