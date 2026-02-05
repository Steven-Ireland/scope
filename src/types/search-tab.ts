import { DateRange } from 'react-day-picker';

export interface SearchTab {
  id: string;
  name: string;
  index: string;
  query: string;
  dateRange: DateRange | undefined;
  sortField: string;
  sortOrder: 'asc' | 'desc';
}
