import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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

  // Single source of truth for the form
  const [form, setForm] = useState(server || {
    id: '', name: '', url: '', username: '', password: '', 
    color: '', certPath: '', keyPath: '', majorVersion: undefined
  });

  // Keep form in sync if server changes externally (e.g. initial load)
  useEffect(() => { if (server) setForm(server); }, [server?.id]);

  // TanStack Query handles the "Verify" logic. 
  // It automatically cancels previous requests via signal when 'form' changes.
  const { data: verify, isFetching, error } = useQuery({
    queryKey: ['verify', form.url, form.username, form.password, form.certPath, form.keyPath],
    queryFn: ({ signal }) => apiClient.verifyServer(form, signal),
    enabled: !!form.url,
    retry: false,
  });

  // Auto-save everything whenever the form or detected version changes
  useEffect(() => {
    if (!server) return;
    updateServer(server.id, { 
      ...form, 
      majorVersion: verify?.majorVersion ?? form.majorVersion,
      username: form.username || undefined,
      password: form.password || undefined,
      certPath: form.certPath || undefined,
      keyPath: form.keyPath || undefined,
    });
  }, [form, verify?.majorVersion]);

  if (!server) return <div className="p-8 text-center"><Button variant="link" onClick={() => navigate('/search')}>Not found</Button></div>;

  const update = (updates: Partial<typeof form>) => setForm(prev => ({ ...prev, ...updates }));

  return (
    <div className="flex flex-col h-full bg-background overflow-auto">
      <header className="border-b p-4 flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-bold">Server Settings: {form.name}</h1>
        </div>
        <Button variant="outline" size="sm" asChild><Link to="/search"><Search className="h-4 w-4 mr-2" />Search</Link></Button>
      </header>

      <main className="flex-1 p-8 max-w-2xl mx-auto w-full space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Connection Details</CardTitle>
            <CardDescription>Changes are saved automatically.</CardDescription>
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

            <div className="grid gap-2"><Label>Server Name</Label><Input value={form.name} onChange={e => update({ name: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Elasticsearch URL</Label><Input value={form.url} onChange={e => update({ url: e.target.value })} /></div>

            <div className="grid gap-2"><Label>Theme Color</Label>
              <div className="flex flex-wrap gap-2">{SERVER_COLORS.map(c => (
                <button key={c.bg} className={cn("w-8 h-8 rounded-full border-2", c.bg, form.color === c.bg ? "border-white scale-110" : "border-transparent")} onClick={() => update({ color: c.bg })} />
              ))}</div>
            </div>

            <div className="grid gap-2"><Label>Username</Label><Input value={form.username || ''} onChange={e => update({ username: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Password</Label><Input type="password" value={form.password || ''} onChange={e => update({ password: e.target.value })} /></div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-semibold">Certs</h4>
              {(['certPath', 'keyPath'] as const).map(f => (
                <div key={f} className="flex gap-2 items-end">
                  <div className="grid gap-2 flex-1"><Label>{f}</Label><Input value={form[f] || ''} onChange={e => update({ [f]: e.target.value })} /></div>
                  <Button variant="outline" onClick={async () => {
                    const path = await window.electron?.selectFile?.(f);
                    if (path) update({ [f]: path });
                  }}>Browse</Button>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="border-t p-6 mt-4">
            <Button variant="destructive" onClick={() => { if (confirm(`Remove ${form.name}?`)) { removeServer(server.id); navigate('/search'); } }}>Delete Server</Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}