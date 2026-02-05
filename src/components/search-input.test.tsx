import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchInput } from './search-input';
import { apiClient } from '@/lib/api-client';

// Mock apiClient
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    getFields: vi.fn(),
    getValues: vi.fn(),
  },
}));

// Mock useConfigStore
vi.mock('@/store/use-config-store', () => ({
  useConfigStore: (selector: any) => {
    if (typeof selector === 'function') {
      return selector({
        getActiveServer: () => ({ id: 'default', url: 'http://localhost:9200' }),
      });
    }
    return { id: 'default', url: 'http://localhost:9200' };
  },
}));

describe('SearchInput Autocomplete', () => {
  const mockOnChange = vi.fn();
  const mockOnSearch = vi.fn();
  const fields = [
    { name: 'message', type: 'text' },
    { name: 'level', type: 'keyword' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.getFields as any).mockResolvedValue(fields);
  });

  it('should accept a suggestion with Enter and append it correctly', async () => {
    await act(async () => {
      render(
        <SearchInput
          value="mes"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
          index="logs"
          placeholder="Search..."
        />
      );
    });

    const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
    await act(async () => {
      input.focus();
      input.setSelectionRange(3, 3);
    });

    // Wait for fields to be loaded
    await act(async () => {
      await Promise.resolve(); 
    });

    // Trigger updateSuggestions
    await act(async () => {
      fireEvent.change(input, { target: { value: 'mes' } });
    });

    // Find suggestion list item
    const suggestion = await screen.findByText('message');
    expect(suggestion).toBeInTheDocument();

    // Press Enter to select
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    // Should call onChange with "message:"
    expect(mockOnChange).toHaveBeenCalledWith('message:');
    expect(mockOnSearch).not.toHaveBeenCalled();
  });

  it('should append a suggestion to existing query text correctly', async () => {
    await act(async () => {
      render(
        <SearchInput
          value="level:info me"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
          index="logs"
          placeholder="Search..."
        />
      );
    });

    const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
    await act(async () => {
      input.focus();
      input.setSelectionRange(13, 13); // At the end of "me"
    });

    // Wait for fields
    await act(async () => {
      await Promise.resolve();
    });

    // Trigger updateSuggestions
    await act(async () => {
      fireEvent.change(input, { target: { value: 'level:info me' } });
    });

    const suggestion = await screen.findByText('message');
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(mockOnChange).toHaveBeenCalledWith('level:info message:');
  });

  it('should append a field suggestion after a completed key-value pair and space', async () => {
    await act(async () => {
      render(
        <SearchInput
          value="level:error mess"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
          index="logs"
          placeholder="Search..."
        />
      );
    });

    const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
    await act(async () => {
      input.focus();
      // Cursor is at the end, after "mess"
      input.setSelectionRange(16, 16); 
    });

    // Wait for fields
    await act(async () => {
      await Promise.resolve();
    });

    // Trigger updateSuggestions
    await act(async () => {
      fireEvent.change(input, { target: { value: 'level:error mess' } });
    });

    // We expect the suggestions to show up for fields
    const suggestion = await screen.findByText('message');
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(mockOnChange).toHaveBeenCalledWith('level:error message:');
  });

  it('should search with Enter when no suggestions are open', async () => {
    await act(async () => {
      render(
        <SearchInput
          value="test"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
          index="logs"
          placeholder="Search..."
        />
      );
    });

    const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(mockOnSearch).toHaveBeenCalled();
  });
});
