import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DocumentDetails } from './DocumentDetails';
import { LogEntry } from '@/types/elasticsearch';

describe('DocumentDetails', () => {
  const mockLog: LogEntry = {
    _id: '1',
    _index: 'logs',
    _source: {
      message: 'test message',
      level: 'info'
    }
  };

  it('should call onClose when Escape key is pressed', () => {
    const mockOnClose = vi.fn();
    render(<DocumentDetails log={mockLog} onClose={mockOnClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when close button is clicked', () => {
    const mockOnClose = vi.fn();
    const { getByRole } = render(<DocumentDetails log={mockLog} onClose={mockOnClose} />);

    const closeButton = getByRole('button');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
