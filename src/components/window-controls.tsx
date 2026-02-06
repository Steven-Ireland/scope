import { Minus, Square, X, Copy } from 'lucide-react';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/radix/tooltip';

export function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron = window.electron?.isElectron;
  const platform = window.electron?.platform;

  if (!isElectron || platform === 'darwin') {
    return null;
  }

  const handleMinimize = () => window.electron?.minimize();
  const handleMaximize = () => {
    window.electron?.maximize();
    setIsMaximized(!isMaximized);
  };
  const handleClose = () => window.electron?.close();

  return (
    <div className="flex items-center h-full no-drag">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleMinimize}
            className="inline-flex items-center justify-center w-12 h-full hover:bg-muted transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Minimize</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleMaximize}
            className="inline-flex items-center justify-center w-12 h-full hover:bg-muted transition-colors"
          >
            {isMaximized ? <Copy className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{isMaximized ? 'Restore' : 'Maximize'}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClose}
            className="inline-flex items-center justify-center w-12 h-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Close</TooltipContent>
      </Tooltip>
    </div>
  );
}
