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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/radix/tooltip';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SERVER_COLORS } from '@/lib/constants';

export function Sidebar() {
  const servers = useConfigStore((state) => state.servers);
  const activeServerId = useConfigStore((state) => state.activeServerId);
  const setActiveServerId = useConfigStore((state) => state.setActiveServerId);
  const removeServer = useConfigStore((state) => state.removeServer);
  const addServer = useConfigStore((state) => state.addServer);

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

  const handleAddServer = () => {
    const newServer = addServer({
      name: 'New Server',
      url: 'http://localhost:9200',
      color: SERVER_COLORS[Math.floor(Math.random() * SERVER_COLORS.length)].bg,
      indexPatterns: [],
    });
    navigate(`/settings/server/${newServer.id}`);
  };

  return (
    <div className="flex flex-col w-14 border-r bg-background h-full items-center p-2 shrink-0 gap-2">
      <div className="flex flex-col gap-2 w-full items-center overflow-y-auto flex-1 no-scrollbar">
        {servers.map((server) => {
          const colorConfig = SERVER_COLORS.find((c) => c.bg === server.color) || SERVER_COLORS[0];

          // If we're in settings, only highlight the one we're editing
          // If we're not in settings (e.g. search), highlight the active one
          const isHighlighted = editingServerId
            ? editingServerId === server.id
            : activeServerId === server.id;

          return (
            <Tooltip key={server.id}>
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <TooltipTrigger asChild>
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
                    >
                      <span className="text-sm font-semibold uppercase">
                        {server.name.substring(0, 1)}
                      </span>
                    </button>
                  </TooltipTrigger>
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
              <TooltipContent side="right">
                <p className="font-medium">{server.name}</p>
                {server.majorVersion && (
                  <p className="text-[10px] opacity-70">v{server.majorVersion}</p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleAddServer}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-[20px] transition-all duration-200 hover:rounded-[12px]',
                'bg-muted text-nord14 hover:bg-nord14 hover:text-nord0'
              )}
            >
              <Plus className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Add Server</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex flex-col gap-2 mt-auto items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/settings/app"
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-md transition-colors',
                location.pathname === '/settings/app'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Settings className="w-5 h-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">App Settings</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
