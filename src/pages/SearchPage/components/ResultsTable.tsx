import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn, getValueByPath } from '@/lib/utils';
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
  const isDateField = useCallback(
    (field: string) => {
      const fieldDef = fields.find((f) => f.name === field);
      return fieldDef?.type === 'date';
    },
    [fields]
  );

  const isSortable = useCallback(
    (field: string) => {
      const fieldDef = fields.find((f) => f.name === field);
      return fieldDef ? fieldDef.type !== 'text' : false;
    },
    [fields]
  );

  return (
    <div className="flex-1 overflow-auto min-w-0">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            {columns.map((col) => {
              const sortable = isSortable(col);
              const isDate = isDateField(col);
              return (
                <TableHead
                  key={col}
                  className={cn(
                    isDate ? 'w-48' : 'max-w-md',
                    sortable
                      ? 'cursor-pointer hover:bg-muted/50 transition-colors'
                      : 'cursor-default'
                  )}
                  onClick={() => sortable && onSort(col)}
                >
                  <div className="flex items-center gap-1 group min-w-0">
                    <span className="truncate min-w-0" title={col}>
                      {col}
                    </span>
                    {sortable && (
                      <span className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0">
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
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground italic"
              >
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
                {columns.map((col) => {
                  const val = getValueByPath(log._source, col);
                  const isDate = isDateField(col);
                  return (
                    <TableCell
                      key={col}
                      className={cn(
                        isDate ? 'font-mono text-xs w-48' : 'max-w-md truncate min-w-0'
                      )}
                      title={typeof val === 'string' ? val : undefined}
                    >
                      {col === 'level' ? (
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                            val === 'error'
                              ? 'bg-nord11/10 text-nord11 ring-nord11/20'
                              : val === 'warn'
                                ? 'bg-nord13/10 text-nord13 ring-nord13/20'
                                : 'bg-nord3/10 text-nord4 ring-nord3/20'
                          )}
                        >
                          {val || 'info'}
                        </span>
                      ) : typeof val === 'object' && val !== null ? (
                        JSON.stringify(val)
                      ) : (
                        String(val ?? '')
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
