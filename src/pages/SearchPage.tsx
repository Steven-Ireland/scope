import { useState, useEffect, useLayoutEffect, Suspense, useMemo, useCallback, useRef } from 'react';
import { useSearchState } from '@/hooks/use-search-state';
import { useIndices, useFields, useSearch } from '@/hooks/use-elasticsearch';
import { DateHistogram } from '@/components/date-histogram';
import { SearchHeader } from './SearchPage/components/SearchHeader';
import { ResultsTable } from './SearchPage/components/ResultsTable';
import { DocumentDetails } from './SearchPage/components/DocumentDetails';
import { LogEntry } from '@/types/elasticsearch';
import { useTabs } from '@/context/tabs-context';
import { SearchTabs } from '@/components/search-tabs';
import { useServer } from '@/context/server-context';

const EMPTY_ARRAY: any[] = [];

function SearchContent() {
  const {
    activeTabId,
    activeTab,
    updateTab,
  } = useTabs();

  const {
    index,
    query: queryFromUrl,
    dateRange,
    sortField,
    sortOrder,
    updateSearch,
    setDateRange,
    setSort,
  } = useSearchState();

  // Local state for the input field to allow typing without immediate URL updates
  const [searchInput, setSearchInput] = useState(queryFromUrl);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(EMPTY_ARRAY);

  // Track which tab's state is currently "active" in the URL to prevent cross-tab contamination
  const appliedTabIdRef = useRef<string | null>(null);

  // Sync searchInput when URL changes (e.g., back button or tab switch)
  useLayoutEffect(() => {
    setSearchInput(queryFromUrl);
  }, [queryFromUrl]);

  // When activeTabId changes, push its state to the URL
  useLayoutEffect(() => {
    if (activeTab && appliedTabIdRef.current !== activeTabId) {
      updateSearch({
        index: activeTab.index,
        q: activeTab.query,
        from: activeTab.dateRange?.from?.toISOString(),
        to: activeTab.dateRange?.to?.toISOString(),
        sort: activeTab.sortField === '@timestamp' ? undefined : activeTab.sortField,
        order: activeTab.sortOrder === 'desc' ? undefined : activeTab.sortOrder,
      }, true);
      appliedTabIdRef.current = activeTabId;
    }
  }, [activeTabId, activeTab, updateSearch]);

  // Only update the active tab's state if the URL reflects the CURRENT active tab
  useLayoutEffect(() => {
    if (activeTabId && appliedTabIdRef.current === activeTabId) {
      updateTab(activeTabId, {
        index,
        query: queryFromUrl,
        dateRange,
        sortField,
        sortOrder,
      });
    }
  }, [index, queryFromUrl, dateRange, sortField, sortOrder, activeTabId, updateTab]);

  // Close sidebar when index, query, or date range changes
  useEffect(() => {
    if (selectedLog !== null) {
      setSelectedLog(null);
    }
  }, [index, queryFromUrl, dateRange]);

  // Data fetching with React Query
  const { data: indices = EMPTY_ARRAY } = useIndices();
  const { data: fields = EMPTY_ARRAY, isLoading: fieldsLoading } = useFields(index);
  const { data: searchResults, isLoading: searchLoading } = useSearch({
    index,
    query: queryFromUrl,
    dateRange,
    sortField,
    sortOrder,
  });

  const logs = searchResults?.hits?.hits || EMPTY_ARRAY;
  const histogramData = useMemo(() => {
    return searchResults?.aggregations?.histogram?.buckets?.map((b: any) => ({
      timestamp: b.key,
      count: b.doc_count,
    })) || EMPTY_ARRAY;
  }, [searchResults]);

  const getDefaultColumns = useCallback((fieldsList: any[]) => {
    if (fieldsList.length === 0) return ['@timestamp'];
    
    // Pick dynamic defaults: @timestamp + first 4 non-meta fields
    const defaults = fieldsList.some(f => f.name === '@timestamp') ? ['@timestamp'] : [];
    const others = fieldsList
      .filter(f => f.name !== '@timestamp' && !f.name.startsWith('_'))
      .slice(0, 4)
      .map(f => f.name);
    
    const combined = [...defaults, ...others];
    return combined.length > 0 ? combined : ['_source'];
  }, []);

  // Column management - Dynamic defaults based on fields
  useEffect(() => {
    if (!index) {
      setVisibleColumns(EMPTY_ARRAY);
      return;
    }

    const saved = localStorage.getItem(`scope_columns_${index}`);
    if (saved) {
      try {
        setVisibleColumns(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing saved columns', e);
      }
    } else if (fields.length > 0) {
      setVisibleColumns(getDefaultColumns(fields));
    } else {
      // While loading fields, at least show timestamp if common
      setVisibleColumns(['@timestamp']);
    }
  }, [index, fields, getDefaultColumns]);

  const handleToggleColumn = useCallback((col: string) => {
    setVisibleColumns((prev) => {
      if (prev.includes(col)) {
        return prev.filter((c) => c !== col);
      } else {
        return [...prev, col].sort((a, b) => {
          if (a === '@timestamp') return -1;
          if (b === '@timestamp') return 1;
          return a.localeCompare(b);
        });
      }
    });
  }, []);

  const handleSaveDefaultColumns = useCallback(() => {
    if (index) {
      localStorage.setItem(`scope_columns_${index}`, JSON.stringify(visibleColumns));
    }
  }, [index, visibleColumns]);

  const handleResetColumns = useCallback(() => {
    setVisibleColumns(getDefaultColumns(fields));
  }, [fields, getDefaultColumns]);

  const handleSearch = useCallback(() => {
    updateSearch({ q: searchInput });
  }, [updateSearch, searchInput]);

  const handleSort = useCallback((field: string) => {
    let newOrder: 'asc' | 'desc' = 'desc';
    if (sortField === field) {
      newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    }
    setSort(field, newOrder);
  }, [sortField, sortOrder, setSort]);

  const handleSelectLog = useCallback((log: LogEntry) => {
    setSelectedLog(log);
  }, []);

  const handleIndexChange = useCallback((newIndex: string) => {
    setSelectedLog(null);
    updateSearch({ index: newIndex });
  }, [updateSearch]);

  const handleDateRangeChange = useCallback((range: any) => {
    setDateRange(range);
  }, [setDateRange]);

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
            <div className="px-2 bg-card border-b shrink-0 h-16 flex flex-col justify-center">
              <div
                className={`w-full transition-opacity duration-200 ${
                  searchLoading && histogramData.length > 0 ? 'opacity-40' : 'opacity-100'
                }`}
              >
                {histogramData.length > 0 ? (
                  <DateHistogram
                    data={histogramData}
                    onRangeSelect={(from, to) => setDateRange({ from, to })}
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
                  onClose={() => setSelectedLog(null)} 
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
  const { activeServer } = useServer();
  const { tabs, activeTabId, setActiveTabId, removeTab, addTab } = useTabs();
  
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <SearchTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={setActiveTabId}
        onTabClose={removeTab}
        onTabAdd={addTab}
      />
      <Suspense fallback={<div className="flex-1 p-8 text-muted-foreground animate-pulse">Loading search...</div>}>
        <SearchContent key={activeServer?.id} />
      </Suspense>
    </div>
  );
}
