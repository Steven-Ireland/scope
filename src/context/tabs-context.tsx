import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { SearchTab } from '@/types/search-tab';
import { startOfDay, addDays, endOfDay, parseISO } from 'date-fns';
import { useServer } from '@/context/server-context';

interface TabsContextType {
  tabs: SearchTab[];
  activeTabId: string | null;
  activeTab: SearchTab | null;
  setActiveTabId: (id: string) => void;
  addTab: () => void;
  removeTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Omit<SearchTab, 'id'>>) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

const TABS_STORAGE_KEY_PREFIX = 'scope_search_tabs_';
const ACTIVE_TAB_STORAGE_KEY_PREFIX = 'scope_active_tab_id_';

const DEFAULT_TAB = (): SearchTab => ({
  id: crypto.randomUUID(),
  name: 'New Search',
  index: '',
  query: '',
  dateRange: {
    from: startOfDay(addDays(new Date(), -1)),
    to: endOfDay(new Date()),
  },
  sortField: '@timestamp',
  sortOrder: 'desc',
});

function serializeTabs(tabs: SearchTab[]): string {
  return JSON.stringify(tabs);
}

function deserializeTabs(json: string): SearchTab[] {
  try {
    const parsed = JSON.parse(json);
    return parsed.map((tab: any) => ({
      ...tab,
      dateRange: tab.dateRange ? {
        from: tab.dateRange.from ? parseISO(tab.dateRange.from) : undefined,
        to: tab.dateRange.to ? parseISO(tab.dateRange.to) : undefined,
      } : undefined,
    }));
  } catch (e) {
    console.error('Error deserializing tabs', e);
    return [];
  }
}

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const { activeServer } = useServer();
  const serverId = activeServer?.id || 'default';

  const tabsStorageKey = useMemo(() => `${TABS_STORAGE_KEY_PREFIX}${serverId}`, [serverId]);
  const activeTabStorageKey = useMemo(() => `${ACTIVE_TAB_STORAGE_KEY_PREFIX}${serverId}`, [serverId]);

  const [tabs, setTabs] = useState<SearchTab[]>(() => {
    const savedTabs = localStorage.getItem(tabsStorageKey);
    if (savedTabs) {
      const loadedTabs = deserializeTabs(savedTabs);
      if (loadedTabs.length > 0) return loadedTabs;
    }
    return [DEFAULT_TAB()];
  });

  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    const savedActiveId = localStorage.getItem(activeTabStorageKey);
    if (savedActiveId) return savedActiveId;
    return tabs[0]?.id || null;
  });

  // Sync with localStorage when serverId changes
  useEffect(() => {
    const savedTabs = localStorage.getItem(tabsStorageKey);
    const savedActiveId = localStorage.getItem(activeTabStorageKey);
    
    let currentTabs: SearchTab[];
    if (savedTabs) {
      const loadedTabs = deserializeTabs(savedTabs);
      currentTabs = loadedTabs.length > 0 ? loadedTabs : [DEFAULT_TAB()];
    } else {
      currentTabs = [DEFAULT_TAB()];
    }

    setTabs(currentTabs);

    if (savedActiveId && currentTabs.find(t => t.id === savedActiveId)) {
      setActiveTabId(savedActiveId);
    } else {
      setActiveTabId(currentTabs[0].id);
    }
  }, [tabsStorageKey, activeTabStorageKey]);

  // Save changes
  useEffect(() => {
    if (tabs.length > 0) {
      localStorage.setItem(tabsStorageKey, serializeTabs(tabs));
    }
  }, [tabs, tabsStorageKey]);

  useEffect(() => {
    if (activeTabId) {
      localStorage.setItem(activeTabStorageKey, activeTabId);
    }
  }, [activeTabId, activeTabStorageKey]);

  const addTab = useCallback(() => {
    const newTab = DEFAULT_TAB();
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const removeTab = useCallback((id: string) => {
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (filtered.length === 0) {
        const defaultTab = DEFAULT_TAB();
        setActiveTabId(defaultTab.id);
        return [defaultTab];
      }
      if (activeTabId === id) {
        setActiveTabId(filtered[filtered.length - 1].id);
      }
      return filtered;
    });
  }, [activeTabId]);

  const updateTab = useCallback((id: string, updates: Partial<Omit<SearchTab, 'id'>>) => {
    setTabs(prev => {
      const tabIndex = prev.findIndex(t => t.id === id);
      if (tabIndex === -1) return prev;
      
      const tab = prev[tabIndex];
      const hasChanged = Object.entries(updates).some(([key, value]) => {
        const k = key as keyof Omit<SearchTab, 'id'>;
        if (k === 'dateRange') {
          return tab.dateRange?.from?.getTime() !== updates.dateRange?.from?.getTime() ||
                 tab.dateRange?.to?.getTime() !== updates.dateRange?.to?.getTime();
        }
        return tab[k] !== value;
      });

      if (!hasChanged) return prev;

      const newTabs = [...prev];
      newTabs[tabIndex] = { ...tab, ...updates };
      return newTabs;
    });
  }, []);

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId) || null, [tabs, activeTabId]);

  const value = useMemo(() => ({
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    addTab,
    removeTab,
    updateTab,
  }), [tabs, activeTabId, activeTab, addTab, removeTab, updateTab]);

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function useTabs() {
  const context = useContext(TabsContext);
  if (context === undefined) {
    throw new Error('useTabs must be used within a TabsProvider');
  }
  return context;
}
