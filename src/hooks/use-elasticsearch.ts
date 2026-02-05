import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useConfigStore } from '@/store/use-config-store';
import { DateRange } from 'react-day-picker';

export function useIndices() {
  const getActiveServer = useConfigStore(state => state.getActiveServer);
  const activeServer = getActiveServer();

  return useQuery({
    queryKey: ['indices', activeServer?.id],
    queryFn: async () => {
      const fetchedIndices = await apiClient.getIndices(activeServer!);
      const patterns = activeServer?.indexPatterns || [];
      
      // Convert wildcard pattern (e.g. logs-*) to Regex (e.g. ^logs-.*$)
      const patternRegexes = patterns.map(p => new RegExp('^' + p.replace(/\*/g, '.*') + '$'));

      // Filter out indices that match any of the patterns
      const filteredIndices = fetchedIndices.filter((idx: { index: string }) => {
        return !patternRegexes.some(regex => regex.test(idx.index));
      });

      // Use a Set to ensure unique index names, prioritizing patterns
      const uniqueIndexNames = new Set([
        ...patterns,
        ...filteredIndices.map((idx: { index: string }) => idx.index)
      ]);

      return Array.from(uniqueIndexNames).map(name => ({ index: name }));
    },
    enabled: !!activeServer,
  });
}

export function useFields(index: string) {
  const getActiveServer = useConfigStore(state => state.getActiveServer);
  const activeServer = getActiveServer();

  return useQuery({
    queryKey: ['fields', activeServer?.id, index],
    queryFn: () => apiClient.getFields(index, activeServer!),
    enabled: !!activeServer && !!index,
    placeholderData: (previousData) => previousData,
  });
}

interface SearchParams {
  index: string;
  query: string;
  dateRange: DateRange | undefined;
  sortField: string;
  sortOrder: 'asc' | 'desc';
}

export function useSearch(params: SearchParams) {
  const getActiveServer = useConfigStore(state => state.getActiveServer);
  const activeServer = getActiveServer();
  const { index, query, dateRange, sortField, sortOrder } = params;

  return useQuery({
    queryKey: ['search', activeServer?.id, index, query, dateRange?.from, dateRange?.to, sortField, sortOrder],
    queryFn: () => apiClient.search({
      index,
      query,
      from: dateRange?.from?.toISOString(),
      to: dateRange?.to?.toISOString(),
      sortField,
      sortOrder,
      includeHistogram: true,
    }, activeServer!),
    enabled: !!activeServer && !!index,
    // Keep previous data while fetching new data to prevent flickering
    placeholderData: (previousData) => previousData,
  });
}
