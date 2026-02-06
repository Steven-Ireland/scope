import { useState, useCallback, useEffect } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { format } from 'date-fns';

interface DateHistogramProps {
  data: Array<{
    timestamp: number;
    count: number;
  }>;
  onRangeSelect: (from: Date, to: Date) => void;
}

export function DateHistogram({ data, onRangeSelect }: DateHistogramProps) {
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const firstTs = data[0]?.timestamp || 0;
  const lastTs = data[data.length - 1]?.timestamp || 0;
  const totalRange = lastTs - firstTs;

  const getTickFormat = (val: number) => {
    if (totalRange < 1000 * 60) {
      // Less than 1 minute
      return format(val, 'HH:mm:ss');
    } else if (totalRange < 1000 * 60 * 60 * 24) {
      // Less than 24 hours
      return format(val, 'HH:mm');
    } else if (totalRange < 1000 * 60 * 60 * 24 * 7) {
      // Less than 7 days
      return format(val, 'MMM d HH:mm');
    } else {
      return format(val, 'MMM d');
    }
  };

  const handleMouseDown = (e: any) => {
    if (e && e.activeLabel) {
      setRefAreaLeft(Number(e.activeLabel));
      setIsSelecting(true);
    }
  };

  const handleMouseMove = (e: any) => {
    if (isSelecting && e && e.activeLabel) {
      setRefAreaRight(Number(e.activeLabel));
    }
  };

  const handleMouseUp = useCallback(() => {
    if (!isSelecting) return;

    setIsSelecting(false);
    if (refAreaLeft !== null && refAreaRight !== null) {
      const start = Math.min(refAreaLeft, refAreaRight);
      const end = Math.max(refAreaLeft, refAreaRight);

      let interval = 0;
      if (data.length > 1) {
        interval = data[1].timestamp - data[0].timestamp;
      }

      onRangeSelect(new Date(start), new Date(end + interval));
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, [isSelecting, refAreaLeft, refAreaRight, data, onRangeSelect]);

  useEffect(() => {
    if (isSelecting) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isSelecting, handleMouseUp]);

  if (!data || data.length === 0) return null;

  return (
    <div className="h-16 w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
        >
          <XAxis
            dataKey="timestamp"
            tickFormatter={getTickFormat}
            tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
            axisLine={{ stroke: 'var(--border)', strokeWidth: 1 }}
            tickLine={{ stroke: 'var(--border)' }}
            minTickGap={40}
            interval="preserveStartEnd"
          />
          <Tooltip
            labelFormatter={(label) => format(Number(label), 'PP pp')}
            contentStyle={{
              borderRadius: '6px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--popover)',
              color: 'var(--popover-foreground)',
              fontSize: '12px',
              padding: '8px',
            }}
            itemStyle={{ padding: 0, color: 'var(--primary)' }}
            cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
          />
          <Bar
            name="Documents"
            dataKey="count"
            fill="var(--primary)"
            radius={[2, 2, 0, 0]}
            animationDuration={500}
          />

          {refAreaLeft !== null && refAreaRight !== null ? (
            <ReferenceArea
              x1={refAreaLeft}
              x2={refAreaRight}
              strokeOpacity={0.3}
              fill="var(--foreground)"
              fillOpacity={0.1}
            />
          ) : null}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
