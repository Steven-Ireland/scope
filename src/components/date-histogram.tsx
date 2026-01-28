import { useState } from 'react';
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

  const handleMouseUp = () => {
    setIsSelecting(false);
    if (refAreaLeft && refAreaRight) {
        const start = Math.min(refAreaLeft, refAreaRight);
        const end = Math.max(refAreaLeft, refAreaRight);
        
        // We have the start timestamps of the buckets.
        // The selection should probably encompass the end bucket's duration too.
        // But since we don't know the interval precisely here without calculating it,
        // we'll just send the start/end timestamps. The user interface can feel slighty off
        // if the last bar isn't fully "included" in time, but it's a good start.
        // A common trick is to estimate interval from adjacent data points.
        
        let interval = 0;
        if (data.length > 1) {
            interval = data[1].timestamp - data[0].timestamp;
        }

        onRangeSelect(new Date(start), new Date(end + interval));
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  if (!data || data.length === 0) return null;

  return (
    <div className="h-16 w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
        >
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(val) => format(val, 'HH:mm')} 
            tick={{fontSize: 10, fill: 'var(--muted-foreground)'}}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
             labelFormatter={(label) => format(Number(label), 'PP pp')}
             contentStyle={{ 
                 borderRadius: '6px', 
                 border: '1px solid var(--border)', 
                 backgroundColor: 'var(--popover)',
                 color: 'var(--popover-foreground)',
                 fontSize: '12px',
                 padding: '8px'
             }}
             itemStyle={{ padding: 0 }}
             cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
          />
          <Bar dataKey="count" fill="var(--primary)" radius={[2, 2, 0, 0]} animationDuration={500} />
          
          {refAreaLeft && refAreaRight ? (
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
