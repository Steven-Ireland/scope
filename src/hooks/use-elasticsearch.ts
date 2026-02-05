import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useServer } from '@/context/server-context';
import { DateRange } from 'react-day-picker';

export function useIndices() {
  const { activeServer } = useServer();

  return useQuery({
    queryKey: ['indices', activeServer?.id],
    queryFn: () => apiClient.getIndices(activeServer!),
    enabled: !!activeServer,
  });
}

export function useFields(index: string) {
  const { activeServer } = useServer();

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
  const { activeServer } = useServer();
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
