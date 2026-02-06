import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SearchHeader } from './SearchHeader';

// Minimal mocks for dnd-kit since we only want to test the logic passed to it
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    DndContext: ({ children, onDragEnd }: any) => {
      // Create a mock trigger for onDragEnd that we can use in tests
      (global as any).triggerDragEnd = onDragEnd;
      return <div data-testid="dnd-context">{children}</div>;
    },
  };
});

describe('SearchHeader Column Reordering', () => {
  const mockProps = {
    indices: [{ index: 'logs' }],
    selectedIndex: 'logs',
    onIndexChange: vi.fn(),
    searchQuery: '',
    onSearchQueryChange: vi.fn(),
    onSearch: vi.fn(),
    dateRange: undefined,
    onDateRangeChange: vi.fn(),
    fields: [
      { name: 'timestamp', type: 'date' },
      { name: 'message', type: 'text' },
      { name: 'level', type: 'keyword' },
    ],
    fieldsLoading: false,
    visibleColumns: ['timestamp', 'message'],
    onToggleColumn: vi.fn(),
    onMoveColumn: vi.fn(),
    onResetColumns: vi.fn(),
    onSaveDefaultColumns: vi.fn(),
    loading: false,
  };

  it('should call onMoveColumn when a drag ends', () => {
    render(<SearchHeader {...mockProps} />);

    // Open the popover
    const columnsButton = screen.getByRole('button', { name: /Columns/i });
    fireEvent.click(columnsButton);

    // Trigger the mocked drag end
    const onDragEnd = (global as any).triggerDragEnd;
    onDragEnd({
      active: { id: 'timestamp' },
      over: { id: 'message' },
    });

    expect(mockProps.onMoveColumn).toHaveBeenCalledWith(0, 1);
  });
});
