import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ServerConfig } from '@/types/server';
import { SERVER_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface ServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (server: Omit<ServerConfig, 'id'>) => void;
}

export function ServerDialog({ open, onOpenChange, onSave }: ServerDialogProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedColor, setSelectedColor] = useState(SERVER_COLORS[0].bg);

  useEffect(() => {
    if (open) {
      setName('');
      setUrl('http://localhost:9200');
      setUsername('');
      setPassword('');
      setSelectedColor(SERVER_COLORS[0].bg);
    }
  }, [open]);

  const handleSave = () => {
    onSave({
      name: name || 'New Server',
      url: url || 'http://localhost:9200',
      username: username || undefined,
      password: password || undefined,
      color: selectedColor,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Server</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Server Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My ES Cluster" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url">Elasticsearch URL</Label>
            <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:9200" />
          </div>
          <div className="grid gap-2">
            <Label>Theme Color</Label>
            <div className="flex flex-wrap gap-2">
              {SERVER_COLORS.map((color) => (
                <button
                  key={color.bg}
                  type="button"
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all",
                    color.bg,
                    selectedColor === color.bg ? "border-white scale-110" : "border-transparent hover:scale-105"
                  )}
                  onClick={() => setSelectedColor(color.bg)}
                  title={color.name}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="username">Username (Optional)</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="elastic" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password (Optional)</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}