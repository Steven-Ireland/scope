import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useServer } from '@/context/server-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Search, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { SERVER_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

export default function ServerSettingsPage() {
  const { serverId } = useParams();
  const navigate = useNavigate();
  const { servers, updateServer, removeServer } = useServer();
  
  const server = servers.find(s => s.id === serverId);

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [certPath, setCertPath] = useState('');
  const [keyPath, setKeyPath] = useState('');
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    success: boolean;
    version?: string;
    clusterName?: string;
    error?: string;
  } | null>(null);

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (server && isInitialMount.current) {
      setName(server.name);
      setUrl(server.url);
      setUsername(server.username || '');
      setPassword(server.password || '');
      setSelectedColor(server.color || SERVER_COLORS[0].bg);
      setCertPath(server.certPath || '');
      setKeyPath(server.keyPath || '');
      isInitialMount.current = false;
    }
  }, [server]);

  // Auto-save effect
  useEffect(() => {
    if (!server || isInitialMount.current) return;

    const hasChanged = 
      name !== server.name ||
      url !== server.url ||
      (username || undefined) !== server.username ||
      (password || undefined) !== server.password ||
      selectedColor !== server.color ||
      (certPath || undefined) !== server.certPath ||
      (keyPath || undefined) !== server.keyPath;

    if (hasChanged) {
      const timeoutId = setTimeout(() => {
        updateServer(server.id, {
          name,
          url,
          username: username || undefined,
          password: password || undefined,
          color: selectedColor,
          certPath: certPath || undefined,
          keyPath: keyPath || undefined,
        });
        setVerifyResult(null);
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [name, url, username, password, selectedColor, certPath, keyPath, server, updateServer]);

  if (!server) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold">Server not found</h2>
        <Button variant="link" onClick={() => navigate('/search')}>Go back</Button>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to remove ${server.name}?`)) {
      removeServer(server.id);
      navigate('/search');
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const result = await apiClient.verifyServer({
        url,
        username: username || undefined,
        password: password || undefined,
        certPath: certPath || undefined,
        keyPath: keyPath || undefined,
      });
      setVerifyResult({
        success: true,
        version: result.version,
        clusterName: result.clusterName,
      });
    } catch (error: any) {
      setVerifyResult({
        success: false,
        error: error.message,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSelectFile = async (setter: (val: string) => void, title: string) => {
    if (window.electron?.selectFile) {
      const path = await window.electron.selectFile(title);
      if (path) setter(path);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-auto">
      <header className="border-b p-4 flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Server Settings: {server.name}</h1>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
                <Link to={`/search?index=logs-events`}>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                </Link>
            </Button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-2xl mx-auto w-full space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Connection Details</CardTitle>
                <CardDescription>Configure how Scope connects to this Elasticsearch cluster. Changes are saved automatically.</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleVerify} 
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Server'
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {verifyResult && (
              <div className={cn(
                "p-4 rounded-md flex items-start gap-3 text-sm",
                verifyResult.success ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"
              )}>
                {verifyResult.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Successfully connected!</p>
                      <p className="opacity-90">Cluster: {verifyResult.clusterName} (v{verifyResult.version})</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Connection failed</p>
                      <p className="opacity-90">{verifyResult.error}</p>
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="name">Server Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Production logs" />
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
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password (Optional)</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <div className="border-t pt-4 mt-2 space-y-4">
              <h4 className="text-sm font-semibold">Client Certificate Authentication</h4>
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
          </CardContent>
          <CardFooter className="justify-start border-t p-6 mt-4">
            <Button type="button" variant="destructive" onClick={handleDelete}>Delete Server</Button>
          </CardFooter>
        </Card>

        <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardHeader>
                <CardTitle className="text-sm font-medium">Server Stats</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">URL: {server.url}</p>
                <p className="text-sm text-muted-foreground">ID: {server.id}</p>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
