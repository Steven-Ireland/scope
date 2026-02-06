import { Minus, Square, X, Copy } from 'lucide-react';
import { useState } from 'react';

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
      <button
        onClick={handleMinimize}
        className="inline-flex items-center justify-center w-12 h-full hover:bg-muted transition-colors"
        title="Minimize"
      >
        <Minus className="w-4 h-4" />
      </button>
      <button
        onClick={handleMaximize}
        className="inline-flex items-center justify-center w-12 h-full hover:bg-muted transition-colors"
        title={isMaximized ? "Restore" : "Maximize"}
      >
        {isMaximized ? (
          <Copy className="w-3.5 h-3.5" />
        ) : (
          <Square className="w-3.5 h-3.5" />
        )}
      </button>
      <button
        onClick={handleClose}
        className="inline-flex items-center justify-center w-12 h-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
        title="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
