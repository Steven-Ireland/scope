'use client';

import * as React from 'react';
import { CalendarIcon, Clock } from 'lucide-react';
import { format, parse, startOfDay, addDays, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/radix/button';
import { Calendar } from '@/components/radix/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/radix/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/radix/tabs';
import { Input } from '@/components/radix/input';
import { Label } from '@/components/radix/label';

const RELATIVE_OPTIONS = [
  { label: '15 minutes', value: 'now-15m' },
  { label: '30 minutes', value: 'now-30m' },
  { label: '1 hour', value: 'now-1h' },
  { label: '4 hours', value: 'now-4h' },
  { label: '12 hours', value: 'now-12h' },
  { label: '24 hours', value: 'now-1d' },
  { label: '7 days', value: 'now-7d' },
  { label: '30 days', value: 'now-30d' },
];

interface DatePickerWithRangeProps {
  className?: string;
  date: DateRange | undefined;
  setDate: (range: DateRange | undefined) => void;
  relativeRange?: string;
  onRelativeRangeChange?: (relative: string) => void;
  rangeMode?: 'absolute' | 'relative';
}

export function DatePickerWithRange({
  className,

  date,

  setDate,

  relativeRange = 'now-15m',

  onRelativeRangeChange,

  rangeMode = 'relative',
}: DatePickerWithRangeProps) {
  const selectedRelative = RELATIVE_OPTIONS.find((opt) => opt.value === relativeRange);

  const [fromInput, setFromInput] = React.useState(
    date?.from ? format(date.from, 'yyyy-MM-dd HH:mm:ss') : ''
  );

  const [toInput, setToInput] = React.useState(
    date?.to ? format(date.to, 'yyyy-MM-dd HH:mm:ss') : ''
  );

  const [relInput, setRelInput] = React.useState(relativeRange);

  const [isDragging, setIsDragging] = React.useState(false);

  const [dragStart, setDragStart] = React.useState<Date | null>(null);

  React.useEffect(() => {
    if (date?.from) setFromInput(format(date.from, 'yyyy-MM-dd HH:mm:ss'));

    if (date?.to) setToInput(format(date.to, 'yyyy-MM-dd HH:mm:ss'));
  }, [date]);

  React.useEffect(() => {
    setRelInput(relativeRange);
  }, [relativeRange]);

  const handleManualFrom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    setFromInput(val);

    try {
      const parsed = parse(val, 'yyyy-MM-dd HH:mm:ss', new Date());

      if (!isNaN(parsed.getTime())) {
        setDate({ ...date, from: parsed });
      }
    } catch (e) {}
  };

  const handleManualTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    setToInput(val);

    try {
      const parsed = parse(val, 'yyyy-MM-dd HH:mm:ss', new Date());

      if (!isNaN(parsed.getTime())) {
        setDate({ ...date, to: parsed });
      }
    } catch (e) {}
  };

  const handleManualRel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    setRelInput(val);

    if (val.match(/^(now-)?\d+[smhdwMy]$/)) {
      onRelativeRangeChange?.(val.startsWith('now-') ? val : `now-${val}`);
    }
  };

  const handleDayPointerDown = (day: Date) => {
    setIsDragging(true);

    setDragStart(day);

    setDate({ from: day, to: day });
  };

  const handleDayPointerEnter = (day: Date) => {
    if (isDragging && dragStart) {
      setDate({
        from: dragStart < day ? dragStart : day,

        to: dragStart < day ? day : dragStart,
      });
    }
  };

  const handleDayPointerUp = () => {
    setIsDragging(false);

    if (date?.from) {
      const from = startOfDay(date.from);

      const to = endOfDay(date.to || date.from);

      setDate({ from, to });
    }

    setDragStart(null);
  };

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-fit justify-start text-left font-normal truncate gap-2',

              rangeMode === 'absolute' && !date && 'text-muted-foreground'
            )}
          >
            {rangeMode === 'relative' ? (
              <Clock className="h-4 w-4" />
            ) : (
              <CalendarIcon className="h-4 w-4" />
            )}

            {rangeMode === 'relative' ? (
              <span>{selectedRelative ? `Last ${selectedRelative.label}` : relativeRange}</span>
            ) : date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, HH:mm')} - {format(date.to, 'LLL dd, HH:mm')}
                </>
              ) : (
                format(date.from, 'LLL dd, HH:mm')
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="end">
          <Tabs defaultValue={rangeMode} className="w-[320px] sm:w-[580px]">
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b bg-muted/50">
              <TabsTrigger value="relative" className="text-xs">
                Relative
              </TabsTrigger>

              <TabsTrigger value="absolute" className="text-xs">
                Absolute
              </TabsTrigger>
            </TabsList>

            <TabsContent value="relative" className="p-0 m-0">
              <div className="flex flex-col sm:flex-row h-[280px]">
                <div className="p-4 border-r w-full sm:w-56 space-y-4 shrink-0">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                      Custom Relative
                    </Label>

                    <Input
                      value={relInput}
                      onChange={handleManualRel}
                      placeholder="e.g. now-45m"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Enter a relative time string like{' '}
                      <code className="bg-muted px-1 rounded">now-15m</code>,{' '}
                      <code className="bg-muted px-1 rounded">now-1h</code>, or{' '}
                      <code className="bg-muted px-1 rounded">now-7d</code>.
                    </p>
                  </div>
                </div>

                <div className="flex-1 p-3 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-1.5">
                    {RELATIVE_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        variant={
                          relativeRange === opt.value && rangeMode === 'relative'
                            ? 'default'
                            : 'ghost'
                        }
                        className="justify-start font-normal h-8 text-xs px-2"
                        onClick={() => onRelativeRangeChange?.(opt.value)}
                      >
                        Last {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="absolute" className="p-0 m-0">
              <div className="flex flex-col sm:flex-row">
                <div className="p-4 border-r w-full sm:w-64 space-y-4 shrink-0">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                      Start Date
                    </Label>

                    <Input
                      value={fromInput}
                      onChange={handleManualFrom}
                      placeholder="yyyy-MM-dd HH:mm:ss"
                      className="h-8 text-xs font-mono w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                      End Date
                    </Label>

                    <Input
                      value={toInput}
                      onChange={handleManualTo}
                      placeholder="yyyy-MM-dd HH:mm:ss"
                      className="h-8 text-xs font-mono w-full"
                    />
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Pick a range on the calendar or enter dates manually in{' '}
                      <code className="bg-muted px-1 rounded">YYYY-MM-DD HH:mm:ss</code> format.
                    </p>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-2 bg-muted/5">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={(range) => {
                      if (range?.from) {
                        const from = startOfDay(range.from);

                        const to = endOfDay(range.to || range.from);

                        setDate({ from, to });
                      }
                    }}
                    numberOfMonths={1}
                    className="rounded-none border-none scale-105"
                    onDayPointerDown={handleDayPointerDown}
                    onDayPointerEnter={handleDayPointerEnter}
                    onDayPointerUp={handleDayPointerUp}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  );
}
