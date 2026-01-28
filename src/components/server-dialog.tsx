import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ServerConfig } from '@/types/server';
import { SERVER_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

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
  const [certPath, setCertPath] = useState('');
  const [keyPath, setKeyPath] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; version?: string; error?: string } | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setUrl('http://localhost:9200');
      setUsername('');
      setPassword('');
      setSelectedColor(SERVER_COLORS[0].bg);
      setCertPath('');
      setKeyPath('');
      setVerificationResult(null);
    }
  }, [open]);

  const handleVerify = async () => {
    setVerifying(true);
    setVerificationResult(null);
    try {
      const result = await apiClient.verifyServer({
        name: name || 'Test',
        url: url || 'http://localhost:9200',
        username: username || undefined,
        password: password || undefined,
        color: selectedColor,
        certPath: certPath || undefined,
        keyPath: keyPath || undefined,
      });
      setVerificationResult({ success: true, version: result.version });
    } catch (error: any) {
      setVerificationResult({ success: false, error: error.message });
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = () => {
    onSave({
      name: name || 'New Server',
      url: url || 'http://localhost:9200',
      username: username || undefined,
      password: password || undefined,
      color: selectedColor,
      certPath: certPath || undefined,
      keyPath: keyPath || undefined,
    });
    onOpenChange(false);
  };

  const handleSelectFile = async (setter: (val: string) => void, title: string) => {
    if (window.electron?.selectFile) {
      const path = await window.electron.selectFile(title);
      if (path) setter(path);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
            <div className="flex gap-2">
              <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:9200" className="flex-1" />
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleVerify} 
                disabled={verifying}
                className="whitespace-nowrap"
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Test Connection
              </Button>
            </div>
            {verificationResult && (
              <div className={cn(
                "flex items-center gap-2 text-xs p-2 rounded-md",
                verificationResult.success ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
              )}>
                {verificationResult.success ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Connected! Version: {verificationResult.version}
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3" />
                    {verificationResult.error}
                  </>
                )}
              </div>
            )}
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
          
          <div className="border-t pt-4 mt-2 space-y-4">
            <h4 className="text-sm font-semibold">Authentication (Optional)</h4>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="elastic" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="cert">Client Certificate (CRT)</Label>
              <div className="flex gap-2">
                <Input id="cert" value={certPath} onChange={(e) => setCertPath(e.target.value)} placeholder="/path/to/client.crt" className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => handleSelectFile(setCertPath, 'Select Client Certificate')}>Browse</Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="key">Client Key</Label>
              <div className="flex gap-2">
                <Input id="key" value={keyPath} onChange={(e) => setKeyPath(e.target.value)} placeholder="/path/to/client.key" className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => handleSelectFile(setKeyPath, 'Select Client Key')}>Browse</Button>
              </div>
            </div>
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