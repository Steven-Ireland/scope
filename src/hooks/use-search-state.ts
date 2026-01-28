import { useSearchParams } from 'react-router-dom';
import { useMemo, useCallback } from 'react';
import { parseISO, addDays, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';

export function useSearchState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const index = searchParams.get('index') || '';
  const query = searchParams.get('q') || '';
  const sortField = searchParams.get('sort') || '@timestamp';
  const sortOrder = (searchParams.get('order') as 'asc' | 'desc') || 'desc';
  const fromStr = searchParams.get('from');
  const toStr = searchParams.get('to');
  
  const dateRange = useMemo<DateRange>(() => {
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
    
    const now = new Date();
    return {
      from: startOfDay(addDays(now, -1)),
      to: endOfDay(now),
    };
  }, [fromStr, toStr]);

  const updateSearch = useCallback((updates: {
    index?: string;
    q?: string;
    from?: string;
    to?: string;
    sort?: string;
    order?: string;
  }, replace = false) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      return newParams;
    }, { replace });
  }, [setSearchParams]);

  const setDateRange = useCallback((range: DateRange | undefined) => {
    updateSearch({
      from: range?.from?.toISOString(),
      to: range?.to?.toISOString(),
    });
  }, [updateSearch]);

  const setSort = useCallback((field: string, order: 'asc' | 'desc') => {
    updateSearch({
        sort: field === '@timestamp' ? undefined : field,
        order: order === 'desc' ? undefined : order,
    });
  }, [updateSearch]);

  return {
    index,
    query,
    dateRange,
    sortField,
    sortOrder,
    updateSearch,
    setDateRange,
    setSort,
  };
}
