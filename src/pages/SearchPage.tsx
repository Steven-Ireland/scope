import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { X, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { addDays, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Separator } from '@/components/ui/separator';
import { apiClient } from '@/lib/api-client';

interface LogEntry {
  _id: string;
  _source: {
    '@timestamp': string;
    level?: string;
    message?: string;
    [key: string]: unknown;
  };
}

function SearchContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const pathname = location.pathname;
  
  const indexFromQuery = searchParams.get('index') || '';
  const qFromQuery = searchParams.get('q') || '';
  const fromFromQuery = searchParams.get('from') || '';
  const toFromQuery = searchParams.get('to') || '';

  const [indices, setIndices] = useState<{ index: string }[]>([]);
  const [fields, setFields] = useState<{ name: string, type: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState(qFromQuery);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [sortField, setSortField] = useState<string>(searchParams.get('sort') || '@timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('order') as 'asc' | 'desc') || 'desc');
  
  const [date, setDate] = useState<DateRange | undefined>(() => {
    if (fromFromQuery && toFromQuery) {
      try {
        return {
          from: parseISO(fromFromQuery),
          to: parseISO(toFromQuery),
        };
      } catch (e) {
        console.error('Error parsing dates from URL', e);
      }
    }
    return {
      from: addDays(new Date(), -1),
      to: new Date(),
    };
  });

  // Track the last set of params that we actually searched for
  const lastSearchedRef = useRef<string>('');

  const updateUrl = useCallback((index: string, query: string, range: DateRange | undefined, sField?: string, sOrder?: string) => {
    const newParams = new URLSearchParams();
    
    if (index) newParams.set('index', index);
    if (query) newParams.set('q', query);
    
    const defaultFrom = addDays(new Date(), -1);
    
    // Simple check for defaults
    const isDefaultFrom = false; // Simplified for Vite conversion

    if (range?.from) newParams.set('from', range.from.toISOString());
    if (range?.to) newParams.set('to', range.to.toISOString());

    const currentSortField = sField || sortField;
    const currentSortOrder = sOrder || sortOrder;

    if (currentSortField !== '@timestamp') newParams.set('sort', currentSortField);
    if (currentSortOrder !== 'desc') newParams.set('order', currentSortOrder);

    const qs = newParams.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    
    lastSearchedRef.current = qs;

    const currentUrl = pathname + (location.search || '');
    if (url !== currentUrl) {
        navigate(url, { replace: true });
    }
  }, [pathname, navigate, location.search, sortField, sortOrder]);

  const performSearch = useCallback(async (shouldUpdateUrl = false) => {
    if (!indexFromQuery) return;

    setLoading(true);
    
    if (shouldUpdateUrl) {
      updateUrl(indexFromQuery, searchQuery, date);
    }
    
    try {
      const data = await apiClient.search({
        index: indexFromQuery,
        query: searchQuery,
        from: date?.from?.toISOString(),
        to: date?.to?.toISOString(),
        sortField,
        sortOrder,
      });
      setLogs(data.hits?.hits || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [indexFromQuery, searchQuery, date, updateUrl, sortField, sortOrder]);

  useEffect(() => {
    apiClient.getIndices()
      .then((data) => {
        setIndices(data);
      })
      .catch((err) => console.error('Error fetching indices:', err));
  }, []);

  useEffect(() => {
    const s = searchParams.get('sort') || '@timestamp';
    const o = (searchParams.get('order') as 'asc' | 'desc') || 'desc';
    if (s !== sortField) setSortField(s);
    if (o !== sortOrder) setSortOrder(o);
  }, [searchParams]);

  useEffect(() => {
    if (indexFromQuery) {
      apiClient.getFields(indexFromQuery)
        .then((data) => {
          setFields(data);
          const exists = data.some((f: { name: string }) => f.name === sortField);
          if (!exists && sortField !== '@timestamp') {
            setSortField('@timestamp');
            setSortOrder('desc');
          }
        })
        .catch((err) => console.error('Error fetching fields:', err));
    }
  }, [indexFromQuery]);

  const isSortable = (field: string) => {
    const fieldDef = fields.find(f => f.name === field);
    if (!fieldDef) return field === '@timestamp';
    return fieldDef.type !== 'text';
  };

  useEffect(() => {
    const currentQs = searchParams.toString();
    if (currentQs !== lastSearchedRef.current) {
        setSearchQuery(searchParams.get('q') || '');
        const newFrom = searchParams.get('from');
        const newTo = searchParams.get('to');
        if (newFrom && newTo) {
            setDate({ from: parseISO(newFrom), to: parseISO(newTo) });
        }
        
        lastSearchedRef.current = currentQs;
        if (indexFromQuery) {
            performSearch(false);
        }
    }
  }, [searchParams, indexFromQuery, performSearch]);

  const handleSort = (field: string) => {
    if (!isSortable(field)) return;

    let newOrder: 'asc' | 'desc' = 'desc';
    if (sortField === field) {
      newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    }
    setSortField(field);
    setSortOrder(newOrder);
    updateUrl(indexFromQuery, searchQuery, date, field, newOrder);
  };

  const getColumns = () => {
    if (logs.length === 0) return ['@timestamp', 'level', 'message', 'service'];
    const keys = new Set<string>();
    logs.forEach(log => {
      Object.keys(log._source).forEach(key => keys.add(key));
    });
    return Array.from(keys).sort((a, b) => {
      if (a === '@timestamp') return -1;
      if (b === '@timestamp') return 1;
      return a.localeCompare(b);
    });
  };

  const columns = getColumns();

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <header className="border-b p-4 flex flex-col md:flex-row md:items-center gap-4 bg-card shrink-0">
        <div className="">
          <Select 
            value={indexFromQuery} 
            onValueChange={(val) => {
                updateUrl(val, searchQuery, date);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Index" />
            </SelectTrigger>
            <SelectContent>
              {indices.map((idx) => (
                <SelectItem key={idx.index} value={idx.index}>
                  {idx.index}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:flex-1">
          <SearchInput
            placeholder="Search..."
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={() => performSearch(true)}
            index={indexFromQuery}
          />
        </div>

        <DatePickerWithRange date={date} setDate={setDate} />

        <Button className="w-full md:w-auto" onClick={() => performSearch(true)} disabled={loading}>Search</Button>
      </header>

      <main className="flex-1 flex min-h-0 overflow-hidden relative">
        <div className="flex-1 overflow-auto min-w-0">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                {columns.map(col => {
                  const sortable = isSortable(col);
                  return (
                    <TableHead 
                      key={col} 
                      className={`${col === '@timestamp' ? 'w-48' : ''} ${sortable ? 'cursor-pointer hover:bg-muted/50 transition-colors' : 'cursor-default'}`}
                      onClick={() => sortable && handleSort(col)}
                    >
                      <div className="flex items-center gap-1 group">
                        {col}
                        {sortable && (
                          <span className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                            {sortField === col ? (
                              sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    {loading ? 'Searching...' : (indexFromQuery ? 'No results found.' : 'Please select an index to start.')}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow 
                    key={log._id} 
                    className={`cursor-pointer hover:bg-muted/50 ${selectedLog?._id === log._id ? 'bg-muted' : ''}`}
                    onClick={() => setSelectedLog(log)}
                  >
                    {columns.map(col => (
                      <TableCell key={col} className={col === '@timestamp' ? 'font-mono text-xs' : 'max-w-lg truncate'}>
                        {col === 'level' ? (
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                              log._source.level === 'error' ? 'bg-red-500/10 text-red-500 ring-red-500/20' :
                              log._source.level === 'warn' ? 'bg-yellow-500/10 text-yellow-500 ring-yellow-500/20' :
                              'bg-gray-500/10 text-gray-400 ring-gray-500/20'
                          }`}>
                              {log._source.level}
                          </span>
                        ) : (
                          typeof log._source[col] === 'object' 
                            ? JSON.stringify(log._source[col]) 
                            : String(log._source[col] ?? '')
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {selectedLog && (
          <div className="absolute inset-y-0 right-0 w-full md:w-1/2 lg:w-1/3 border-l bg-card shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <h2 className="font-semibold text-lg">Document Details</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelectedLog(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase">ID</span>
                <p className="font-mono text-sm break-all">{selectedLog._id}</p>
              </div>
              <Separator />
              {Object.entries(selectedLog._source).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">{key}</span>
                  <div className="bg-muted/30 rounded p-2 overflow-auto">
                    <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
