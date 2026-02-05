import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SearchTab } from '@/types/search-tab';
import { LogEntry } from '@/types/elasticsearch';
import { startOfDay, addDays, endOfDay, parseISO } from 'date-fns';

interface SearchState {
  tabs: Record<string, SearchTab[]>; // serverId -> tabs
  activeTabIds: Record<string, string | null>; // serverId -> activeTabId
  columnConfigs: Record<string, string[]>; // indexName -> columns
  selectedLogs: Record<string, LogEntry | null>; // tabId -> selectedLog
  
  // Actions
  addTab: (serverId: string) => void;
  removeTab: (serverId: string, tabId: string) => void;
  updateTab: (serverId: string, tabId: string, updates: Partial<Omit<SearchTab, 'id'>>) => void;
  setActiveTabId: (serverId: string, tabId: string | null) => void;
  setColumnConfig: (indexName: string, columns: string[]) => void;
  setSelectedLog: (tabId: string, log: LogEntry | null) => void;
  
  // Helpers
  getTabs: (serverId: string) => SearchTab[];
  getActiveTabId: (serverId: string) => string | null;
  getActiveTab: (serverId: string) => SearchTab | null;
}

const createDefaultTab = (): SearchTab => ({
  id: crypto.randomUUID(),
  name: 'New Search',
  index: '',
  query: '',
  dateRange: {
    from: startOfDay(addDays(new Date(), -1)),
    to: endOfDay(new Date()),
  },
  sortField: '',
  sortOrder: 'desc',
});

const EMPTY_ARRAY: any[] = [];

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      tabs: {},
      activeTabIds: {},
      columnConfigs: {},
      selectedLogs: {},

      addTab: (serverId) => {
        const newTab = createDefaultTab();
        set((state) => ({
          tabs: {
            ...state.tabs,
            [serverId]: [...(state.tabs[serverId] || []), newTab],
          },
          activeTabIds: {
            ...state.activeTabIds,
            [serverId]: newTab.id,
          },
        }));
      },

      removeTab: (serverId, tabId) => {
        set((state) => {
          const serverTabs = state.tabs[serverId] || [];
          const filtered = serverTabs.filter((t) => t.id !== tabId);
          let nextActiveId = state.activeTabIds[serverId];

          const newSelectedLogs = { ...state.selectedLogs };
          delete newSelectedLogs[tabId];

          if (filtered.length === 0) {
            const defaultTab = createDefaultTab();
            return {
              tabs: { ...state.tabs, [serverId]: [defaultTab] },
              activeTabIds: { ...state.activeTabIds, [serverId]: defaultTab.id },
              selectedLogs: newSelectedLogs,
            };
          }

          if (nextActiveId === tabId) {
            nextActiveId = filtered[filtered.length - 1].id;
          }

          return {
            tabs: { ...state.tabs, [serverId]: filtered },
            activeTabIds: { ...state.activeTabIds, [serverId]: nextActiveId },
            selectedLogs: newSelectedLogs,
          };
        });
      },

      updateTab: (serverId, tabId, updates) => {
        const state = get();
        const serverTabs = state.tabs[serverId] || [];
        const tabIndex = serverTabs.findIndex((t) => t.id === tabId);
        if (tabIndex === -1) return;

        const tab = serverTabs[tabIndex];
        const hasChanged = Object.entries(updates).some(([key, value]) => {
          const k = key as keyof Omit<SearchTab, 'id'>;
          if (k === 'dateRange') {
            const newRange = value as any;
            return tab.dateRange?.from?.getTime() !== newRange?.from?.getTime() ||
                   tab.dateRange?.to?.getTime() !== newRange?.to?.getTime();
          }
          return tab[k] !== value;
        });

        if (!hasChanged) return;

        set((state) => {
          const currentTabs = state.tabs[serverId] || [];
          const updatedTabs = [...currentTabs];
          updatedTabs[tabIndex] = { ...updatedTabs[tabIndex], ...updates };

          return {
            tabs: { ...state.tabs, [serverId]: updatedTabs },
          };
        });
      },

      setActiveTabId: (serverId, tabId) => {
        set((state) => ({
          activeTabIds: { ...state.activeTabIds, [serverId]: tabId },
        }));
      },

      setColumnConfig: (indexName, columns) => {
        set((state) => ({
          columnConfigs: { ...state.columnConfigs, [indexName]: columns },
        }));
      },

      setSelectedLog: (tabId, log) => {
        set((state) => ({
          selectedLogs: { ...state.selectedLogs, [tabId]: log },
        }));
      },

      getTabs: (serverId) => {
        if (!serverId) return EMPTY_ARRAY;
        const state = get();
        const serverTabs = state.tabs[serverId];
        if (!serverTabs || serverTabs.length === 0) {
          return EMPTY_ARRAY;
        }
        return serverTabs;
      },

      getActiveTabId: (serverId) => {
        if (!serverId) return null;
        const state = get();
        return state.activeTabIds[serverId] || (state.tabs[serverId]?.[0]?.id) || null;
      },

      getActiveTab: (serverId) => {
        if (!serverId) return null;
        const state = get();
        const serverTabs = state.tabs[serverId] || [];
        const activeId = state.activeTabIds[serverId];
        const tab = serverTabs.find((t) => t.id === activeId) || serverTabs[0] || null;
        return tab;
      },
    }),
    {
      name: 'scope_search',
      storage: createJSONStorage(() => localStorage),
      // Custom deserialization for Date objects in dateRange
      onRehydrateStorage: () => (state) => {
        if (state && state.tabs) {
          Object.keys(state.tabs).forEach(serverId => {
            state.tabs[serverId] = state.tabs[serverId].map(tab => ({
              ...tab,
              dateRange: tab.dateRange ? {
                from: tab.dateRange.from ? (typeof tab.dateRange.from === 'string' ? parseISO(tab.dateRange.from) : tab.dateRange.from) : undefined,
                to: tab.dateRange.to ? (typeof tab.dateRange.to === 'string' ? parseISO(tab.dateRange.to) : tab.dateRange.to) : undefined,
              } : undefined,
            }));
          });
        }
      },
    }
  )
);
