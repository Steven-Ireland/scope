import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Search, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { SERVER_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { useConfigStore } from '@/store/use-config-store';

export default function ServerSettingsPage() {
  const { serverId } = useParams();
  const navigate = useNavigate();
  const servers = useConfigStore(state => state.servers);
  const updateServer = useConfigStore(state => state.updateServer);
  const removeServer = useConfigStore(state => state.removeServer);
  const addServer = useConfigStore(state => state.addServer);
  
  const isNew = serverId === 'new';
  const server = servers.find(s => s.id === serverId);

  // Single source of truth for the form
  const [form, setForm] = useState(() => ({
    ...server,
    id: server?.id || '',
    name: server?.name || '',
    url: server?.url || 'http://localhost:9200',
    username: server?.username || '',
    password: server?.password || '',
    color: server?.color || SERVER_COLORS[0].bg,
    certPath: server?.certPath || '',
    keyPath: server?.keyPath || '',
    majorVersion: server?.majorVersion,
    indexPatterns: server?.indexPatterns || []
  }));

  // Keep form in sync if server changes externally (e.g. initial load or navigation)
  useEffect(() => { 
    if (server) {
      setForm({
        ...server,
        username: server.username || '',
        password: server.password || '',
        certPath: server.certPath || '',
        keyPath: server.keyPath || '',
        indexPatterns: server.indexPatterns || []
      }); 
    } else if (isNew) {
      setForm({
        id: '', name: '', url: 'http://localhost:9200', username: '', password: '', 
        color: SERVER_COLORS[0].bg, certPath: '', keyPath: '', majorVersion: undefined,
        indexPatterns: []
      });
    }
  }, [server?.id, isNew]);

  // TanStack Query handles the "Verify" logic. 
  const { data: verify, isFetching, error } = useQuery({
    queryKey: ['verify', form.url, form.username, form.password, form.certPath, form.keyPath],
    queryFn: ({ signal }) => apiClient.verifyServer(form, signal),
    enabled: !!form.url,
    retry: false,
  });

  // Auto-save everything whenever the form or detected version changes
  useEffect(() => {
    if (!server || isNew || form.id !== server.id) return;
    
    const { id: _, ...updates } = form;
    updateServer(server.id, { 
      ...updates, 
      majorVersion: verify?.majorVersion ?? form.majorVersion,
      username: form.username || undefined,
      password: form.password || undefined,
      certPath: form.certPath || undefined,
      keyPath: form.keyPath || undefined,
    });
  }, [form, verify?.majorVersion, isNew, server?.id, updateServer]);

  if (!server && !isNew) return <div className="p-8 text-center"><Button variant="link" onClick={() => navigate('/search')}>Not found</Button></div>;

  const [newPattern, setNewPattern] = useState('');

  const addPattern = () => {
    if (newPattern && !form.indexPatterns?.includes(newPattern)) {
      update({ indexPatterns: [...(form.indexPatterns || []), newPattern] });
      setNewPattern('');
    }
  };

  const removePattern = (pattern: string) => {
    update({ indexPatterns: form.indexPatterns?.filter(p => p !== pattern) });
  };

  const update = (updates: Partial<typeof form>) => setForm(prev => ({ ...prev, ...updates }));

  const handleCreate = () => {
    const { id, ...config } = form;
    addServer({
      ...config,
      majorVersion: verify?.majorVersion ?? form.majorVersion,
      username: form.username || undefined,
      password: form.password || undefined,
      certPath: form.certPath || undefined,
      keyPath: form.keyPath || undefined,
    });
    navigate('/search');
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-auto">
      <header className="border-b p-4 flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-bold">{isNew ? 'Add New Server' : `Server Settings: ${form.name}`}</h1>
        </div>
        {!isNew && <Button variant="outline" size="sm" asChild><Link to="/search"><Search className="h-4 w-4 mr-2" />Search</Link></Button>}
      </header>

      <main className="flex-1 p-8 max-w-2xl mx-auto w-full space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{isNew ? 'New Server Details' : 'Connection Details'}</CardTitle>
            <CardDescription>{isNew ? 'Enter the details for your new Elasticsearch cluster.' : 'Changes are saved automatically.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn(
              "p-4 rounded-md flex items-start gap-3 text-sm transition-all border min-h-[4.5rem]",
              isFetching ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
              error ? "bg-destructive/10 text-destructive border-destructive/20" :
              verify?.success ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-muted/50 border-transparent"
            )}>
              {isFetching ? (
                <><Loader2 className="h-5 w-5 shrink-0 animate-spin" /><div><p className="font-semibold">Verifying...</p><p className="opacity-90">{form.url}</p></div></>
              ) : error ? (
                <><XCircle className="h-5 w-5 shrink-0" /><div><p className="font-semibold">Failed</p><p className="opacity-90">{(error as any).message}</p></div></>
              ) : verify?.success ? (
                <><CheckCircle2 className="h-5 w-5 shrink-0" /><div><p className="font-semibold">Connected!</p><p className="opacity-90">{verify.clusterName} (v{verify.version})</p></div></>
              ) : <p className="italic text-muted-foreground">Ready</p>}
            </div>

            <div className="grid gap-2"><Label>Server Name</Label><Input value={form.name} onChange={e => update({ name: e.target.value })} placeholder="My ES Cluster" /></div>
            <div className="grid gap-2"><Label>Elasticsearch URL</Label><Input value={form.url} onChange={e => update({ url: e.target.value })} placeholder="http://localhost:9200" /></div>

            <div className="grid gap-2"><Label>Theme Color</Label>
              <div className="flex flex-wrap gap-2">{SERVER_COLORS.map(c => (
                <button key={c.bg} className={cn("w-8 h-8 rounded-full border-2", c.bg, form.color === c.bg ? "border-white scale-110" : "border-transparent")} onClick={() => update({ color: c.bg })} />
              ))}</div>
            </div>

            <div className="grid gap-2"><Label>Username</Label><Input value={form.username || ''} onChange={e => update({ username: e.target.value })} placeholder="optional" /></div>
            <div className="grid gap-2"><Label>Password</Label><Input type="password" value={form.password || ''} onChange={e => update({ password: e.target.value })} placeholder="optional" /></div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-semibold">Certs</h4>
              {(['certPath', 'keyPath'] as const).map(f => (
                <div key={f} className="flex gap-2 items-end">
                  <div className="grid gap-2 flex-1"><Label>{f === 'certPath' ? 'Client Certificate (CRT)' : 'Client Key'}</Label><Input value={form[f] || ''} onChange={e => update({ [f]: e.target.value })} /></div>
                  <Button variant="outline" onClick={async () => {
                    const path = await window.electron?.selectFile?.(f);
                    if (path) update({ [f]: path });
                  }}>Browse</Button>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-semibold">Index Patterns</h4>
              <p className="text-xs text-muted-foreground">Define patterns (e.g., <code>logs-*</code>) to group date-based indices.</p>
              <div className="space-y-2">
                {form.indexPatterns?.map(pattern => (
                  <div key={pattern} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                    <code className="text-sm">{pattern}</code>
                    <Button variant="ghost" size="sm" onClick={() => removePattern(pattern)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input 
                  value={newPattern} 
                  onChange={e => setNewPattern(e.target.value)} 
                  placeholder="logs-*" 
                  onKeyDown={e => e.key === 'Enter' && addPattern()}
                />
                <Button variant="outline" onClick={addPattern}>Add</Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t p-6 mt-4 flex justify-between">
            {isNew ? (
              <Button onClick={handleCreate} disabled={!form.name || !form.url} className="ml-auto">Create Server</Button>
            ) : (
              <Button variant="destructive" onClick={() => { if (confirm(`Remove ${form.name}?`)) { removeServer(server.id); navigate('/search'); } }}>Delete Server</Button>
            )}
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}