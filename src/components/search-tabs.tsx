import { Plus, X, Search } from 'lucide-react';
import { SearchTab } from '@/types/search-tab';
import { cn } from '@/lib/utils';

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
    <div className="flex items-center gap-1 px-4 pt-2 bg-background border-b overflow-x-auto no-scrollbar shrink-0 h-[45px]">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "group flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-t-md border-t border-l border-r transition-colors cursor-pointer min-w-[120px] max-w-[240px] relative",
            activeTabId === tab.id
              ? "bg-nord1 border-border text-foreground z-10 -mb-[1px]"
              : "bg-background border-transparent text-muted-foreground hover:bg-muted/30"
          )}
          onClick={() => onTabSelect(tab.id)}
        >
          <Search className="h-3 w-3 shrink-0 opacity-50" />
          <span className="truncate flex-1 pr-4">
            {tab.index ? (
              <>
                <span className="font-bold">{tab.index}</span>
                {tab.query && <span className="opacity-70 ml-1.5 truncate">{tab.query}</span>}
              </>
            ) : (
              <span className="opacity-70 italic">{tab.name}</span>
            )}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
            className={cn(
                "absolute right-1.5 p-0.5 rounded-sm hover:bg-muted-foreground/20 transition-opacity",
                activeTabId === tab.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        onClick={onTabAdd}
        className="p-1.5 mb-1.5 ml-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
        title="New Search Tab"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
