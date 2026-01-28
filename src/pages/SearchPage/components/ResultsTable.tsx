import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { LogEntry, ElasticsearchField } from '@/types/elasticsearch';
import { useCallback } from 'react';

interface ResultsTableProps {
  logs: LogEntry[];
  loading: boolean;
  columns: string[];
  sortField: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  onSelectLog: (log: LogEntry) => void;
  selectedLogId?: string;
  fields: ElasticsearchField[];
}

export function ResultsTable({
  logs,
  loading,
  columns,
  sortField,
  sortOrder,
  onSort,
  onSelectLog,
  selectedLogId,
  fields,
}: ResultsTableProps) {
  const isSortable = useCallback((field: string) => {
    const fieldDef = fields.find((f) => f.name === field);
    if (!fieldDef) return field === '@timestamp';
    return fieldDef.type !== 'text';
  }, [fields]);

  return (
    <div className="flex-1 overflow-auto min-w-0">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            {columns.map((col) => {
              const sortable = isSortable(col);
              return (
                <TableHead
                  key={col}
                  className={cn(
                    col === '@timestamp' ? 'w-48' : '',
                    sortable ? 'cursor-pointer hover:bg-muted/50 transition-colors' : 'cursor-default'
                  )}
                  onClick={() => sortable && onSort(col)}
                >
                  <div className="flex items-center gap-1 group">
                    {col}
                    {sortable && (
                      <span className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                        {sortField === col ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground italic">
                {!loading && 'No results found.'}
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow
                key={log._id}
                className={cn(
                  'cursor-pointer hover:bg-muted/50',
                  selectedLogId === log._id ? 'bg-muted' : ''
                )}
                onClick={() => onSelectLog(log)}
              >
                {columns.map((col) => (
                  <TableCell key={col} className={col === '@timestamp' ? 'font-mono text-xs' : 'max-w-lg truncate'}>
                    {col === 'level' ? (
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                          log._source.level === 'error'
                            ? 'bg-red-500/10 text-red-500 ring-red-500/20'
                            : log._source.level === 'warn'
                            ? 'bg-yellow-500/10 text-yellow-500 ring-yellow-500/20'
                            : 'bg-gray-500/10 text-gray-400 ring-gray-500/20'
                        )}
                      >
                        {log._source.level || 'info'}
                      </span>
                    ) : typeof log._source[col] === 'object' ? (
                      JSON.stringify(log._source[col])
                    ) : (
                      String(log._source[col] ?? '')
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
