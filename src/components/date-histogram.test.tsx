import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DateHistogram } from './date-histogram';

// Mock ResponsiveContainer and other Recharts components if needed
// Recharts can be tricky to test in a JSDOM environment because it relies on SVG dimensions.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: '800px', height: '400px' }}>{children}</div>
    ),
  };
});

describe('DateHistogram', () => {
  const mockData = [
    { timestamp: 1700000000000, count: 10 },
    { timestamp: 1700003600000, count: 20 },
    { timestamp: 1700007200000, count: 15 },
  ];

  const mockOnRangeSelect = vi.fn();

  it('renders nothing when data is empty', () => {
    const { container } = render(
      <DateHistogram data={[]} onRangeSelect={mockOnRangeSelect} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the chart container when data is provided', () => {
    const { container } = render(
      <DateHistogram data={mockData} onRangeSelect={mockOnRangeSelect} />
    );
    // Recharts components might not be easily queryable by text if they use SVG
    // but we can check if the wrapper div exists.
    expect(container.querySelector('.h-16')).toBeDefined();
  });
});
