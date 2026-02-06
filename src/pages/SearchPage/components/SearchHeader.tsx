import { Columns, RotateCcw, Search, Check, GripVertical } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/radix/select';
import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/radix/button';
import { DatePickerWithRange } from '@/components/radix/date-range-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/radix/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/radix/tooltip';
import { Input } from '@/components/radix/input';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SearchHeaderProps {
  indices: { index: string }[];
  selectedIndex: string;
  onIndexChange: (index: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  dateRange: DateRange | undefined;
  relativeRange?: string;
  rangeMode: 'absolute' | 'relative';
  onDateRangeChange: (range: DateRange | undefined) => void;
  onRelativeRangeChange: (relative: string) => void;
  fields: { name: string; type: string }[];
  fieldsLoading: boolean;
  visibleColumns: string[];
  onToggleColumn: (column: string) => void;
  onMoveColumn: (fromIndex: number, toIndex: number) => void;
  onResetColumns: () => void;
  onSaveDefaultColumns: () => void;
  loading: boolean;
}

function SortableItem({
  id,
  name,
  type,
  selected,
  onToggle,
}: {
  id: string;
  name: string;
  type: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-muted transition-colors text-left group',
        'text-muted-foreground',
        isDragging && 'opacity-50 bg-muted'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-40 hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <button onClick={onToggle} className="flex-1 flex items-center gap-2 min-w-0 text-left">
        <div
          className={cn(
            'h-3.5 w-3.5 border rounded-sm flex items-center justify-center shrink-0',
            selected
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-muted-foreground/30'
          )}
        >
          {selected && <Check className="h-2.5 w-2.5" />}
        </div>
        <span className="whitespace-nowrap flex-1 text-left">{name}</span>
        <span className="text-[10px] opacity-50 px-1 shrink-0">{type}</span>
      </button>
    </div>
  );
}

export function SearchHeader({
  indices,
  selectedIndex,
  onIndexChange,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  dateRange,
  relativeRange,
  rangeMode,
  onDateRangeChange,
  onRelativeRangeChange,
  fields,
  fieldsLoading,
  visibleColumns,
  onToggleColumn,
  onMoveColumn,
  onResetColumns,
  onSaveDefaultColumns,
  loading,
}: SearchHeaderProps) {
  const [columnSearch, setColumnSearch] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = visibleColumns.indexOf(active.id as string);
      const newIndex = visibleColumns.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        onMoveColumn(oldIndex, newIndex);
      }
    }
  };

  const selectedFields = visibleColumns.map((col) => {
    const field = fields.find((f) => f.name === col);
    return field || { name: col, type: 'unknown' };
  });

  const unselectedFields = fields.filter((f) => !visibleColumns.includes(f.name));

  return (
    <header className="border-b p-2 flex items-center gap-2 bg-background shrink-0">
      <Select value={selectedIndex} onValueChange={onIndexChange}>
        <SelectTrigger className="w-fit">
          <SelectValue placeholder="Select Index" />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          {indices.map((idx) => (
            <SelectItem key={idx.index} value={idx.index}>
              {idx.index}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Columns className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Configure visible columns and their order</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-fit min-w-64 p-0 flex flex-col max-h-[500px]" align="start">
          <div className="p-3 border-b flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Configurable Columns</h4>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onResetColumns}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Reset to default</TooltipContent>
              </Tooltip>
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

          <div className="flex-1 overflow-y-auto p-1">
            {fieldsLoading ? (
              <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">
                Loading fields...
              </div>
            ) : (
              <div className="space-y-4">
                {visibleColumns.length > 0 && !columnSearch && (
                  <div className="space-y-1">
                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      Active Columns (Drag to reorder)
                    </div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={visibleColumns}
                        strategy={verticalListSortingStrategy}
                      >
                        {selectedFields.map((f) => (
                          <SortableItem
                            key={f.name}
                            id={f.name}
                            name={f.name}
                            type={f.type}
                            selected={true}
                            onToggle={() => onToggleColumn(f.name)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    {columnSearch ? 'Search Results' : 'Available Fields'}
                  </div>
                  {unselectedFields
                    .filter(
                      (f) =>
                        !columnSearch || f.name.toLowerCase().includes(columnSearch.toLowerCase())
                    )
                    .map((f) => (
                      <button
                        key={f.name}
                        onClick={() => onToggleColumn(f.name)}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-muted transition-colors text-left group',
                          'text-muted-foreground'
                        )}
                      >
                        <div className="w-4 shrink-0" /> {/* Spacer for drag handle alignment */}
                        <div
                          className={cn(
                            'h-3.5 w-3.5 border rounded-sm flex items-center justify-center shrink-0',
                            'border-muted-foreground/30'
                          )}
                        >
                          {/* Unselected, so no check */}
                        </div>
                        <span className="whitespace-nowrap flex-1 text-left">{f.name}</span>
                        <span className="text-[10px] opacity-50 px-1">{f.type}</span>
                      </button>
                    ))}
                  {unselectedFields.filter(
                    (f) =>
                      !columnSearch || f.name.toLowerCase().includes(columnSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No fields found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-2 border-t bg-muted/50 flex justify-end shrink-0">
            <Button size="sm" className="h-8 text-xs w-full" onClick={onSaveDefaultColumns}>
              Set as Default for {selectedIndex}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex-1">
        <SearchInput
          placeholder="Search..."
          value={searchQuery}
          onChange={onSearchQueryChange}
          onSearch={onSearch}
          index={selectedIndex}
        />
      </div>

      <DatePickerWithRange
        date={dateRange}
        setDate={onDateRangeChange}
        relativeRange={relativeRange}
        onRelativeRangeChange={onRelativeRangeChange}
        rangeMode={rangeMode}
      />
      <Button className="shrink-0" onClick={onSearch} disabled={loading}>
        Search
      </Button>
    </header>
  );
}
