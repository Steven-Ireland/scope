import React from 'react';
import { Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfigStore } from '@/store/use-config-store';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/radix/context-menu';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SERVER_COLORS } from '@/lib/constants';

export function Sidebar() {
  const servers = useConfigStore((state) => state.servers);
  const activeServerId = useConfigStore((state) => state.activeServerId);
  const setActiveServerId = useConfigStore((state) => state.setActiveServerId);
  const removeServer = useConfigStore((state) => state.removeServer);

  const location = useLocation();
  const navigate = useNavigate();

  const serverSettingsMatch = location.pathname.match(/\/settings\/server\/([^/]+)/);
  const editingServerId = serverSettingsMatch ? serverSettingsMatch[1] : null;

  const handleServerClick = (id: string) => {
    setActiveServerId(id);
    if (!location.pathname.startsWith('/search')) {
      navigate('/search');
    }
  };

  return (
    <div className="flex flex-col w-14 border-r bg-background h-full items-center py-4 shrink-0 gap-4">
      <div className="flex flex-col gap-3 w-full items-center overflow-y-auto flex-1 no-scrollbar">
        {servers.map((server) => {
          const colorConfig = SERVER_COLORS.find((c) => c.bg === server.color) || SERVER_COLORS[0];

          // If we're in settings, only highlight the one we're editing
          // If we're not in settings (e.g. search), highlight the active one
          const isHighlighted = editingServerId
            ? editingServerId === server.id
            : activeServerId === server.id;

          return (
            <ContextMenu key={server.id}>
              <ContextMenuTrigger>
                <button
                  onClick={() => handleServerClick(server.id)}
                  className={cn(
                    'relative flex items-center justify-center w-10 h-10 rounded-[20px] transition-all duration-200 group hover:rounded-[12px]',
                    isHighlighted
                      ? cn(colorConfig.bg, 'text-primary-foreground rounded-[12px]')
                      : cn(
                          'bg-muted text-muted-foreground hover:text-primary-foreground',
                          colorConfig.hover
                        )
                  )}
                  title={server.name}
                >
                  <span className="text-sm font-semibold uppercase">
                    {server.name.substring(0, 1)}
                  </span>
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => navigate(`/settings/server/${server.id}`)}>
                  Server Settings
                </ContextMenuItem>
                <ContextMenuItem
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`Are you sure you want to remove ${server.name}?`)) {
                      removeServer(server.id);
                    }
                  }}
                >
                  Remove Server
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}

        <button
          onClick={() => navigate('/settings/server/new')}
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-[20px] transition-all duration-200 hover:rounded-[12px]',
            editingServerId === 'new'
              ? 'bg-nord14 text-nord0 rounded-[12px]'
              : 'bg-muted text-nord14 hover:bg-nord14 hover:text-nord0'
          )}
          title="Add Server"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col gap-4 mt-auto items-center">
        <Link
          to="/settings/app"
          title="App Settings"
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-md transition-colors',
            location.pathname === '/settings/app'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Settings className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
