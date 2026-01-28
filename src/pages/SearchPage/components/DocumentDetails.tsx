import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LogEntry } from '@/types/elasticsearch';

interface DocumentDetailsProps {
  log: LogEntry;
  onClose: () => void;
}

export function DocumentDetails({ log, onClose }: DocumentDetailsProps) {
  console.log('Rendering DocumentDetails for log:', log._id);
  return (
    <div className="h-full flex flex-col min-w-0">
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <h2 className="font-semibold text-lg">Document Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground uppercase">ID</span>
          <p className="font-mono text-sm break-all">{log._id}</p>
        </div>
        <Separator />
        {Object.entries(log._source)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => (
            <div key={key} className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase">{key}</span>
              <div className="bg-muted/30 rounded p-2 overflow-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </pre>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
