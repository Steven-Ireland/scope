'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname, useParams } from 'next/navigation';
import { X } from 'lucide-react';
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const indexFromPath = params.index as string;

  const [indices, setIndices] = useState<{ index: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    if (fromStr && toStr) {
      try {
        return {
          from: parseISO(fromStr),
          to: parseISO(toStr),
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

  const updateUrl = useCallback((index: string, query: string, range: DateRange | undefined) => {
    const newParams = new URLSearchParams();
    
    if (query) newParams.set('q', query);
    
    const defaultFrom = addDays(new Date(), -1);
    const defaultTo = new Date();
    
    const isDefaultFrom = range?.from && Math.abs(range.from.getTime() - defaultFrom.getTime()) < 60000;
    const isDefaultTo = range?.to && Math.abs(range.to.getTime() - defaultTo.getTime()) < 60000;

    if (range?.from && !isDefaultFrom) newParams.set('from', range.from.toISOString());
    if (range?.to && !isDefaultTo) newParams.set('to', range.to.toISOString());

    const qs = newParams.toString();
    const newPath = `/${index}`;
    const url = qs ? `${newPath}?${qs}` : newPath;
    
    const currentUrl = pathname + (searchParams.toString() ? '?' + searchParams.toString() : '');
    if (url !== currentUrl) {
        router.replace(url);
    }
  }, [pathname, router, searchParams]);

  useEffect(() => {
    fetch('/api/indices')
      .then((res) => res.json())
      .then((data) => {
        setIndices(data);
      })
      .catch((err) => console.error('Error fetching indices:', err));
  }, []);

  const handleSearch = useCallback(async () => {
    if (!indexFromPath) return;

    setLoading(true);
    updateUrl(indexFromPath, searchQuery, date);
    
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          index: indexFromPath,
          query: searchQuery,
          from: date?.from?.toISOString(),
          to: date?.to?.toISOString(),
        }),
      });
      const data = await res.json();
      setLogs(data.hits?.hits || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [indexFromPath, searchQuery, date, updateUrl]);

  useEffect(() => {
      if(indexFromPath) {
          handleSearch();
      }
  }, [indexFromPath, date, handleSearch]);

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
            value={indexFromPath} 
            onValueChange={(val) => updateUrl(val, searchQuery, date)}
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
            onSearch={handleSearch}
            index={indexFromPath}
          />
        </div>

        <DatePickerWithRange date={date} setDate={setDate} />

        <Button className="w-full md:w-auto" onClick={handleSearch} disabled={loading}>Search</Button>
      </header>

      <main className="flex-1 flex min-h-0 overflow-hidden relative">
        <div className="flex-1 overflow-auto min-w-0">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                {columns.map(col => (
                  <TableHead key={col} className={col === '@timestamp' ? 'w-48' : ''}>
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    {loading ? 'Searching...' : 'No results found.'}
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

export default function IndexPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
