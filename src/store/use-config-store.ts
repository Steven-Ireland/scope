import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ServerConfig } from '@/types/server';
import { SERVER_COLORS } from '@/lib/constants';

interface ConfigState {
  servers: ServerConfig[];
  activeServerId: string | null;
  isLoaded: boolean;

  // Actions
  setServers: (servers: ServerConfig[]) => void;
  setActiveServerId: (id: string | null) => void;
  addServer: (server: Omit<ServerConfig, 'id'>) => ServerConfig;
  updateServer: (id: string, updates: Partial<ServerConfig>) => void;
  removeServer: (id: string) => void;
  setLoaded: (loaded: boolean) => void;

  // Computed (helper)
  getActiveServer: () => ServerConfig | null;
}

const DEFAULT_SERVER: ServerConfig = {
  id: 'default',
  name: 'Localhost',
  url: 'http://localhost:9200',
  color: SERVER_COLORS[0].bg,
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      servers: [],
      activeServerId: null,
      isLoaded: false,

      setServers: (servers) => set({ servers }),
      setActiveServerId: (id) => set({ activeServerId: id }),

      addServer: (server) => {
        const newServer = { ...server, id: crypto.randomUUID() };
        set((state) => ({
          servers: [...state.servers, newServer],
          activeServerId: newServer.id,
        }));
        return newServer;
      },

      updateServer: (id, updates) => {
        set((state) => ({
          servers: state.servers.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        }));
      },

      removeServer: (id) => {
        set((state) => {
          const remaining = state.servers.filter((s) => s.id !== id);
          let nextActiveId = state.activeServerId;
          if (state.activeServerId === id) {
            nextActiveId = remaining[0]?.id || null;
          }
          return { servers: remaining, activeServerId: nextActiveId };
        });
      },

      setLoaded: (loaded) => set({ isLoaded: loaded }),

      getActiveServer: () => {
        const { servers, activeServerId } = get();
        if (servers.length === 0) return null;
        const active = servers.find((s) => s.id === activeServerId);
        return active || servers[0] || null;
      },
    }),
    {
      name: 'scope_config',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setLoaded(true);
        }
      },
    }
  )
);

// Electron sync helper
if (typeof window !== 'undefined' && window.electron) {
  useConfigStore.subscribe((state) => {
    if (state.isLoaded) {
      window.electron.saveConfig({ servers: state.servers });
    }
  });

  // Initial load from electron
  window.electron.loadConfig().then((config) => {
    if (config && config.servers && config.servers.length > 0) {
      useConfigStore.getState().setServers(config.servers);
      // Only set active if not already set by persist
      if (!useConfigStore.getState().activeServerId) {
        useConfigStore.getState().setActiveServerId(config.servers[0].id);
      }
    } else if (useConfigStore.getState().servers.length === 0) {
      useConfigStore.getState().setServers([DEFAULT_SERVER]);
      useConfigStore.getState().setActiveServerId(DEFAULT_SERVER.id);
    }
  });
}
