import { DateRange } from 'react-day-picker';

export type RangeMode = 'absolute' | 'relative';

export interface SearchTab {
  id: string;
  name: string;
  index: string;
  query: string;
  dateRange: DateRange | undefined;
  relativeRange?: string; // e.g., 'now-15m', 'now-1h'
  rangeMode: RangeMode;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  columns?: string[];
}
