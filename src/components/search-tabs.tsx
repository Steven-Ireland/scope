import { Plus, X, Pencil } from 'lucide-react';
import { SearchTab } from '@/types/search-tab';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/radix/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/radix/context-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/radix/dialog';
import { Input } from '@/components/radix/input';
import { Button } from '@/components/radix/button';
import { useState, useMemo } from 'react';
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
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SearchTabsProps {
  tabs: SearchTab[];
  activeTabId: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabAdd: () => void;
  onTabRename: (id: string, name: string) => void;
  onTabReorder: (oldIndex: number, newIndex: number) => void;
}

function SortableTab({
  tab,
  activeTabId,
  onTabSelect,
  onTabClose,
  onOpenRename,
}: {
  tab: SearchTab;
  activeTabId: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onOpenRename: (tab: SearchTab) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          className={cn(
            'group flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-t-md transition-colors cursor-pointer min-w-[140px] max-w-[220px] relative h-9 no-drag',
            activeTabId === tab.id
              ? 'bg-nord1 text-foreground z-10 -mb-[1px]'
              : 'text-muted-foreground hover:bg-muted/30',
            isDragging && 'opacity-50'
          )}
          onClick={() => onTabSelect(tab.id)}
        >
          <div className="flex flex-col min-w-0 flex-1 pr-4 pointer-events-none">
            <span
              className={cn(
                'truncate font-bold text-[10px] leading-tight',
                !tab.customName && !tab.query && !tab.index && 'italic opacity-70'
              )}
            >
              {tab.customName || tab.query || (tab.index ? 'All Documents' : tab.name)}
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
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onOpenRename(tab)}>
          <Pencil className="mr-2 h-4 w-4" />
          Rename Tab
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onClick={() => onTabClose(tab.id)}>
          <X className="mr-2 h-4 w-4" />
          Close Tab
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function SearchTabs({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabAdd,
  onTabRename,
  onTabReorder,
}: SearchTabsProps) {
  const [renameTabId, setRenameTabId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleOpenRename = (tab: SearchTab) => {
    setRenameTabId(tab.id);
    setNewName(tab.customName || tab.query || tab.name);
  };

  const handleRenameSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (renameTabId) {
      onTabRename(renameTabId, newName.trim());
      setRenameTabId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((t) => t.id === active.id);
      const newIndex = tabs.findIndex((t) => t.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onTabReorder(oldIndex, newIndex);
      }
    }
  };

  const tabIds = useMemo(() => tabs.map((t) => t.id), [tabs]);

  return (
    <div className="flex items-end gap-1 px-2 overflow-x-auto no-scrollbar shrink-0 h-full drag">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
          {tabs.map((tab) => (
            <SortableTab
              key={tab.id}
              tab={tab}
              activeTabId={activeTabId}
              onTabSelect={onTabSelect}
              onTabClose={onTabClose}
              onOpenRename={handleOpenRename}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Dialog open={!!renameTabId} onOpenChange={(open) => !open && setRenameTabId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Tab</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRenameSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter tab name..."
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenameTabId(null)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
