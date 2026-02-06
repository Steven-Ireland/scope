import { Plus, X } from 'lucide-react';
import { SearchTab } from '@/types/search-tab';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/radix/tooltip';

interface SearchTabsProps {
  tabs: SearchTab[];
  activeTabId: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabAdd: () => void;
}

export function SearchTabs({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabAdd,
}: SearchTabsProps) {
  return (
    <div className="flex items-end gap-1 px-2 overflow-x-auto no-scrollbar shrink-0 h-full drag">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            'group flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-t-md transition-colors cursor-pointer min-w-[140px] max-w-[220px] relative h-9 no-drag',
            activeTabId === tab.id
              ? 'bg-nord1 text-foreground z-10 -mb-[1px]'
              : 'text-muted-foreground hover:bg-muted/30'
          )}
          onClick={() => onTabSelect(tab.id)}
        >
          <div className="flex flex-col min-w-0 flex-1 pr-4">
            <span
              className={cn(
                'truncate font-bold text-[10px] leading-tight',
                !tab.query && !tab.index && 'italic opacity-70'
              )}
            >
              {tab.query || (tab.index ? 'All Documents' : tab.name)}
            </span>
            {tab.index && (
              <span className="truncate text-[8px] opacity-50 leading-tight">{tab.index}</span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
            className={cn(
              'absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-sm hover:bg-muted-foreground/20 transition-opacity no-drag',
              activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onTabAdd}
            className="p-1.5 mb-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors no-drag"
          >
            <Plus className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">New Search Tab</TooltipContent>
      </Tooltip>
    </div>
  );
}
