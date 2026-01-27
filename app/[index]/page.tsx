'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname, useParams } from 'next/navigation';
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

interface LogEntry {
  _id: string;
  _source: {
    '@timestamp': string;
    [key: string]: any;
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
    
    // Default range is roughly "now" and "24h ago".
    // We only want to persist the date to the URL if it's NOT the default or if we want it to be permanent.
    // However, since "now" changes every second, we'll check if the range is roughly "last 24h" 
    // or if the user hasn't explicitly set a custom range yet.
    // For simplicity, we can just check if they differ significantly from "now" and "24h ago" 
    // OR just always omit them if we want to keep URLs super clean by default.
    // Let's omit them if they are close to the default calculated values (within 1 minute).
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

  const handleSearch = async () => {
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
  };

  useEffect(() => {
      if(indexFromPath) {
          handleSearch();
      }
  }, [indexFromPath, date]);

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
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b p-4 flex flex-col md:flex-row md:items-center gap-4 bg-card">
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

      <main className="overflow-auto">
        <div className="">
          <Table>
            <TableHeader>
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
                    No results found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log._id} className="cursor-pointer hover:bg-muted/50">
                    {columns.map(col => (
                      <TableCell key={col} className={col === '@timestamp' ? 'font-mono text-xs' : 'max-w-lg truncate'}>
                        {col === 'level' ? (
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                              log._source.level === 'error' ? 'bg-red-50 text-red-700 ring-red-600/10' :
                              log._source.level === 'warn' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' :
                              'bg-gray-50 text-gray-600 ring-gray-500/10'
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
