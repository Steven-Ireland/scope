import { Columns, RotateCcw, Search, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface SearchHeaderProps {
  indices: { index: string }[];
  selectedIndex: string;
  onIndexChange: (index: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  fields: { name: string; type: string }[];
  fieldsLoading: boolean;
  visibleColumns: string[];
  onToggleColumn: (column: string) => void;
  onResetColumns: () => void;
  onSaveDefaultColumns: () => void;
  loading: boolean;
}

export function SearchHeader({
  indices,
  selectedIndex,
  onIndexChange,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  dateRange,
  onDateRangeChange,
  fields,
  fieldsLoading,
  visibleColumns,
  onToggleColumn,
  onResetColumns,
  onSaveDefaultColumns,
  loading,
}: SearchHeaderProps) {
  const [columnSearch, setColumnSearch] = useState('');

  return (
    <header className="border-b p-4 flex flex-col md:flex-row md:items-center gap-4 bg-background shrink-0">
      <div className="flex items-center gap-2">
        <Select value={selectedIndex} onValueChange={onIndexChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Index" />
          </SelectTrigger>
          <SelectContent>
            {indices.map((idx) => (
              <SelectItem key={idx.index} value={idx.index}>
                {idx.index}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 shrink-0">
              <Columns className="h-4 w-4" />
              <span className="hidden lg:inline">Columns</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-3 border-b flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Configurable Columns</h4>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onResetColumns}>
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search fields..."
                  className="pl-8 h-8 text-xs"
                  value={columnSearch}
                  onChange={(e) => setColumnSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto p-1">
              {fieldsLoading ? (
                <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">Loading fields...</div>
              ) : fields.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">No fields found.</div>
              ) : (
                fields
                  .filter((f) => !columnSearch || f.name.toLowerCase().includes(columnSearch.toLowerCase()))
                  .map((f) => (
                    <button
                      key={f.name}
                      onClick={() => onToggleColumn(f.name)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-muted transition-colors text-left',
                        visibleColumns.includes(f.name) ? 'text-primary font-medium' : 'text-muted-foreground'
                      )}
                    >
                      <div
                        className={cn(
                          'h-3.5 w-3.5 border rounded-sm flex items-center justify-center shrink-0',
                          visibleColumns.includes(f.name)
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted-foreground/30'
                        )}
                      >
                        {visibleColumns.includes(f.name) && <Check className="h-2.5 w-2.5" />}
                      </div>
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-[10px] opacity-50 px-1">{f.type}</span>
                    </button>
                  ))
              )}
            </div>
            <div className="p-2 border-t bg-muted/50 flex justify-end">
              <Button size="sm" className="h-8 text-xs w-full" onClick={onSaveDefaultColumns}>
                Set as Default for {selectedIndex}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="w-full md:flex-1">
        <SearchInput
          placeholder="Search..."
          value={searchQuery}
          onChange={onSearchQueryChange}
          onSearch={onSearch}
          index={selectedIndex}
        />
      </div>

      <div className="flex items-center gap-2">
        <DatePickerWithRange date={dateRange} setDate={onDateRangeChange} />
        <Button className="w-full md:w-auto shrink-0" onClick={onSearch} disabled={loading}>
          Search
        </Button>
      </div>
    </header>
  );
}
