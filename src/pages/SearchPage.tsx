import { useState, useEffect, useLayoutEffect, Suspense, useMemo, useCallback, useRef } from 'react';
import { useIndices, useFields, useSearch } from '@/hooks/use-elasticsearch';
import { DateHistogram } from '@/components/date-histogram';
import { SearchHeader } from './SearchPage/components/SearchHeader';
import { ResultsTable } from './SearchPage/components/ResultsTable';
import { DocumentDetails } from './SearchPage/components/DocumentDetails';
import { LogEntry } from '@/types/elasticsearch';
import { SearchTabs } from '@/components/search-tabs';
import { useConfigStore } from '@/store/use-config-store';
import { useSearchStore } from '@/store/use-search-store';
import { cn } from '@/lib/utils';
import { SearchTab } from '@/types/search-tab';
import { DateRange } from 'react-day-picker';

const EMPTY_ARRAY: any[] = [];

function SearchContent({ tabId, serverId }: { tabId: string, serverId: string }) {
  const tabs = useSearchStore(state => state.tabs[serverId] || EMPTY_ARRAY);
  const activeTab = useMemo(() => tabs.find(t => t.id === tabId) || tabs[0] || null, [tabs, tabId]);
  
  const updateTab = useSearchStore(state => state.updateTab);

  const selectedLog = useSearchStore(state => state.selectedLogs[tabId] || null);
  const setSelectedLog = useSearchStore(state => state.setSelectedLog);
  
  const columnConfigs = useSearchStore(state => state.columnConfigs);
  const setColumnConfig = useSearchStore(state => state.setColumnConfig);

  // Read search state directly from the store's tab object
  const index = activeTab?.index || '';
  const query = activeTab?.query || '';
  const dateRange = activeTab?.dateRange;

  // Data fetching with React Query
  const { data: indices = EMPTY_ARRAY } = useIndices();
  const { data: fields = EMPTY_ARRAY, isLoading: fieldsLoading } = useFields(index);

  const timestampField = useMemo(() => {
    if (fieldsLoading || fields.length === 0) return undefined;
    const dateFields = fields
      .filter((f: any) => f.type === 'date')
      .map((f: any) => f.name)
      .sort();
    
    return dateFields.length > 0 ? dateFields[0] : undefined;
  }, [fields, fieldsLoading]);

  const sortField = useMemo(() => {
    if (activeTab?.sortField) return activeTab.sortField;
    if (timestampField) return timestampField;
    
    // Fallback: first sortable field (not 'text' and not meta fields starting with _)
    const firstSortable = fields.find((f: any) => f.type !== 'text' && !f.name.startsWith('_'));
    return firstSortable?.name || '';
  }, [activeTab?.sortField, timestampField, fields]);

  const sortOrder = activeTab?.sortOrder || 'desc';

  // Local state for the input field to allow typing without immediate store updates
  const [searchInput, setSearchInput] = useState(query);

  // Sync searchInput when the store's query changes (e.g., from another component or reset)
  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  // Handler functions that update the store directly
  const handleUpdateSearch = useCallback((updates: Partial<Omit<SearchTab, 'id'>>) => {
    updateTab(serverId, tabId, updates);
  }, [serverId, tabId, updateTab]);

  const handleSetDateRange = useCallback((range: DateRange | undefined) => {
    handleUpdateSearch({ dateRange: range });
  }, [handleUpdateSearch]);

  const handleSetSort = useCallback((field: string, order: 'asc' | 'desc') => {
    handleUpdateSearch({ sortField: field, sortOrder: order });
  }, [handleUpdateSearch]);

  // Close sidebar when results change
  useEffect(() => {
    if (selectedLog !== null) {
      setSelectedLog(tabId, null);
    }
  }, [index, query, dateRange, tabId, setSelectedLog]);

  // Data fetching with React Query
  const { data: searchResults, isLoading: searchLoading } = useSearch({
    index,
    query,
    dateRange,
    sortField,
    sortOrder,
    timestampField,
  });

  const logs = searchResults?.hits?.hits || EMPTY_ARRAY;
  const histogramData = useMemo(() => {
    return searchResults?.aggregations?.histogram?.buckets?.map((b: any) => ({
      timestamp: b.key,
      count: b.doc_count,
    })) || EMPTY_ARRAY;
  }, [searchResults]);

  const getDefaultColumns = useCallback((fieldsList: any[], tsField?: string) => {
    if (fieldsList.length === 0) return tsField ? [tsField] : ['_source'];
    
    // Pick dynamic defaults: primary timestamp + first 4 non-meta fields
    const defaults = tsField && fieldsList.some(f => f.name === tsField) ? [tsField] : [];
    const others = fieldsList
      .filter(f => f.name !== tsField && !f.name.startsWith('_'))
      .slice(0, 4)
      .map(f => f.name);
    
    const combined = [...defaults, ...others];
    return combined.length > 0 ? combined : ['_source'];
  }, []);

  const visibleColumns = useMemo(() => {
    if (!index) return EMPTY_ARRAY;
    if (activeTab?.columns && activeTab.columns.length > 0) return activeTab.columns;
    const config = columnConfigs[index];
    if (config) return config;
    if (fields.length > 0) return getDefaultColumns(fields, timestampField);
    return timestampField ? [timestampField] : ['_source'];
  }, [index, activeTab?.columns, columnConfigs, fields, getDefaultColumns, timestampField]);

  const handleToggleColumn = useCallback((col: string) => {
    if (!index) return;
    const current = visibleColumns;
    let next;
    if (current.includes(col)) {
      next = current.filter((c) => c !== col);
    } else {
      next = [...current, col];
    }
    handleUpdateSearch({ columns: next });
  }, [index, visibleColumns, handleUpdateSearch]);

  const handleMoveColumn = useCallback((fromIndex: number, toIndex: number) => {
    const next = [...visibleColumns];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    handleUpdateSearch({ columns: next });
  }, [visibleColumns, handleUpdateSearch]);

  const handleSaveDefaultColumns = useCallback(() => {
    if (index) {
      setColumnConfig(index, visibleColumns);
    }
  }, [index, visibleColumns, setColumnConfig]);

  const handleResetColumns = useCallback(() => {
    if (index) {
      handleUpdateSearch({ columns: undefined });
    }
  }, [index, handleUpdateSearch]);

  const handleSearch = useCallback(() => {
    handleUpdateSearch({ query: searchInput });
  }, [handleUpdateSearch, searchInput]);

  const handleSort = useCallback((field: string) => {
    let newOrder: 'asc' | 'desc' = 'desc';
    if (sortField === field) {
      newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    }
    handleSetSort(field, newOrder);
  }, [sortField, sortOrder, handleSetSort]);

  const handleSelectLog = useCallback((log: LogEntry) => {
    setSelectedLog(tabId, log);
  }, [tabId, setSelectedLog]);

  const handleIndexChange = useCallback((newIndex: string) => {
    setSelectedLog(tabId, null);
    handleUpdateSearch({ index: newIndex, columns: undefined });
  }, [tabId, handleUpdateSearch, setSelectedLog]);

  const handleDateRangeChange = useCallback((range: any) => {
    handleSetDateRange(range);
  }, [handleSetDateRange]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <SearchHeader
        indices={indices}
        selectedIndex={index}
        onIndexChange={handleIndexChange}
        searchQuery={searchInput}
        onSearchQueryChange={setSearchInput}
        onSearch={handleSearch}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        fields={fields}
        fieldsLoading={fieldsLoading}
        visibleColumns={visibleColumns}
        onToggleColumn={handleToggleColumn}
        onMoveColumn={handleMoveColumn}
        onResetColumns={handleResetColumns}
        onSaveDefaultColumns={handleSaveDefaultColumns}
        loading={searchLoading}
      />

      {!index ? (
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/5">
          <div className="max-w-md space-y-2">
            <h2 className="text-xl font-semibold">Ready to explore?</h2>
            <p className="text-muted-foreground text-sm">
              Select an index from the dropdown above to start searching through your logs and events.
            </p>
          </div>
        </main>
      ) : (
        <>
          {(histogramData.length > 0 || searchLoading) && (
            <div className="px-2 bg-background border-b shrink-0 h-16 flex flex-col justify-center">
              <div
                className={`w-full transition-opacity duration-200 ${
                  searchLoading && histogramData.length > 0 ? 'opacity-40' : 'opacity-100'
                }`}
              >
                {histogramData.length > 0 ? (
                  <DateHistogram
                    data={histogramData}
                    onRangeSelect={(from, to) => handleSetDateRange({ from, to })}
                  />
                ) : (
                  searchLoading && <div className="h-10 w-full bg-muted/20 animate-pulse rounded-sm" />
                )}
              </div>
            </div>
          )}

          <main className="flex-1 flex min-h-0 overflow-hidden relative">
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <ResultsTable
                logs={logs}
                loading={searchLoading || fieldsLoading}
                columns={visibleColumns}
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
                onSelectLog={handleSelectLog}
                selectedLogId={selectedLog?._id}
                fields={fields}
              />
            </div>

            {selectedLog && (
              <div className="absolute inset-y-0 right-0 w-full md:w-1/2 lg:w-1/3 border-l bg-card shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
                <DocumentDetails 
                  key={selectedLog._id}
                  log={selectedLog} 
                  onClose={() => setSelectedLog(tabId, null)} 
                />
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  const servers = useConfigStore(state => state.servers);
  const activeServerId = useConfigStore(state => state.activeServerId);
  const activeServer = useMemo(() => 
    servers.find((s) => s.id === activeServerId) || servers[0] || null,
    [servers, activeServerId]
  );
  
  const serverId = activeServer?.id || 'default';
  
  const tabs = useSearchStore(state => state.tabs[serverId] || EMPTY_ARRAY);
  const activeTabId = useSearchStore(state => state.activeTabIds[serverId] || (tabs[0]?.id) || null);
  
  const setActiveTabId = useSearchStore(state => state.setActiveTabId);
  const removeTab = useSearchStore(state => state.removeTab);
  const addTab = useSearchStore(state => state.addTab);

  const handleTabSelect = useCallback((id: string) => {
    setActiveTabId(serverId, id);
  }, [serverId, setActiveTabId]);
  
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden" key={serverId}>
      <SearchTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={handleTabSelect}
        onTabClose={(id) => removeTab(serverId, id)}
        onTabAdd={() => addTab(serverId)}
      />
      <div className="flex-1 relative overflow-hidden">
        {tabs.map(tab => (
          <div 
            key={tab.id} 
            className={cn(
              "absolute inset-0 flex flex-col",
              tab.id === activeTabId ? "visible z-10" : "invisible z-0"
            )}
          >
            <Suspense fallback={<div className="flex-1 p-8 text-muted-foreground animate-pulse">Loading search...</div>}>
              <SearchContent 
                tabId={tab.id} 
                serverId={serverId} 
              />
            </Suspense>
          </div>
        ))}
      </div>
    </div>
  );
}