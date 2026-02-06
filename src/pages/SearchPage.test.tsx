import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SearchPage from './SearchPage';
import { useIndices, useFields, useSearch } from '@/hooks/use-elasticsearch';
import { useSearchStore } from '@/store/use-search-store';

// Mock the hooks
vi.mock('@/hooks/use-elasticsearch', () => ({
  useIndices: vi.fn(),
  useFields: vi.fn(),
  useSearch: vi.fn(),
}));

// Mock useConfigStore
vi.mock('@/store/use-config-store', () => ({
  useConfigStore: (selector: any) => {
    const state = {
      servers: [{ id: 'default', url: 'http://localhost:9200' }],
      activeServerId: 'default',
      getActiveServer: () => ({ id: 'default', url: 'http://localhost:9200' }),
    };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

describe('SearchPage Integration', () => {
  const mockIndices = [{ index: 'logs' }];
  const mockFields = [
    { name: '@timestamp', type: 'date' },
    { name: 'event_time', type: 'date' },
    { name: 'message', type: 'text' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useIndices as any).mockReturnValue({ data: mockIndices });
    (useFields as any).mockReturnValue({ data: mockFields, isLoading: false });
    (useSearch as any).mockReturnValue({ data: null, isLoading: false });
    
    // Reset the store
    act(() => {
      useSearchStore.setState({
        tabs: { default: [{ id: 'tab1', name: 'Search', index: 'logs', query: '', sortField: '@timestamp', sortOrder: 'desc', columns: ['@timestamp', 'event_time'] }] },
        activeTabIds: { default: 'tab1' },
      });
    });
  });

  it('should use the first date field in visibleColumns as the timestampField for search', async () => {
    let capturedParams: any;
    (useSearch as any).mockImplementation((params: any) => {
      capturedParams = params;
      return { data: null, isLoading: false };
    });

    render(<SearchPage />);

    // Initial state: columns are ['@timestamp', 'event_time']
    expect(capturedParams.timestampField).toBe('@timestamp');

    // Swap columns
    act(() => {
      useSearchStore.getState().updateTab('default', 'tab1', { columns: ['event_time', '@timestamp'] });
    });

    // Should now use event_time
    expect(capturedParams.timestampField).toBe('event_time');
  });
});
