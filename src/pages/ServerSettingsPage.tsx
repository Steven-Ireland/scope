import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/radix/button';
import { Input } from '@/components/radix/input';
import { Label } from '@/components/radix/label';
import {
  XCircle,
  Loader2,
  ArrowLeft,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { SERVER_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { useConfigStore } from '@/store/use-config-store';
import { Separator } from '@/components/radix/separator';

export default function ServerSettingsPage() {
  const serverId = useParams().serverId;
  const navigate = useNavigate();
  const servers = useConfigStore((state) => state.servers);
  const updateServer = useConfigStore((state) => state.updateServer);
  const removeServer = useConfigStore((state) => state.removeServer);

  const server = servers.find((s) => s.id === serverId);

  // Single source of truth for the form
  const [form, setForm] = useState(() => ({
    id: server?.id || '',
    name: server?.name || '',
    url: server?.url || 'http://localhost:9200',
    username: server?.username || '',
    password: server?.password || '',
    color: server?.color || SERVER_COLORS[0].bg,
    certPath: server?.certPath || '',
    keyPath: server?.keyPath || '',
    allowInsecureSSL: server?.allowInsecureSSL || false,
    majorVersion: server?.majorVersion,
    indexPatterns: server?.indexPatterns || [],
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
        allowInsecureSSL: server.allowInsecureSSL || false,
        indexPatterns: server.indexPatterns || [],
      });
    }
  }, [server?.id]);

  // TanStack Query handles the "Verify" logic.
  const {
    data: verify,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['verify', form.id, form.url, form.username, form.password, form.certPath, form.keyPath, form.allowInsecureSSL],
    queryFn: ({ signal }) => apiClient.verifyServer({ ...form }, signal),
    enabled: !!form.url && !!form.id,
    retry: false,
  });

  // Auto-save everything whenever the form or detected version changes
  useEffect(() => {
    if (!server || form.id !== server.id) return;

    updateServer(server.id, {
      ...form,
      majorVersion: verify?.majorVersion ?? form.majorVersion,
      username: form.username || undefined,
      password: form.password || undefined,
      certPath: form.certPath || undefined,
      keyPath: form.keyPath || undefined,
    });
  }, [form, verify?.majorVersion, server?.id, updateServer]);

  if (!server)
    return (
      <div className="p-8 text-center">
        <Button variant="link" onClick={() => navigate('/search')}>
          Not found
        </Button>
      </div>
    );

  const [newPattern, setNewPattern] = useState('');

  const addPattern = () => {
    if (newPattern && !form.indexPatterns?.includes(newPattern)) {
      update({ indexPatterns: [...(form.indexPatterns || []), newPattern] });
      setNewPattern('');
    }
  };

  const removePattern = (pattern: string) => {
    update({ indexPatterns: form.indexPatterns?.filter((p) => p !== pattern) });
  };

  const update = (updates: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...updates }));

  return (
    <div className="flex flex-col h-full bg-background overflow-auto pb-10">
      <header className="border-b p-2 px-4 flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold">
            Server Settings: {form.name}
          </h1>
        </div>
        <Button variant="outline" size="sm" className="h-8" asChild>
          <Link to="/search">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Link>
        </Button>
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-6">
        <div
          className={cn(
            'p-3 rounded-md flex items-start gap-3 text-xs transition-all border min-h-[3.5rem]',
            isFetching
              ? 'bg-nord12/10 text-nord12 border-nord12/20'
              : error
                ? 'bg-destructive/10 text-destructive border-destructive/20'
                : verify?.success
                  ? 'bg-nord14/10 text-nord14 border-nord14/20'
                  : 'bg-muted/50 border-transparent'
          )}
        >
          {isFetching ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              <div>
                <p className="font-semibold">Verifying...</p>
                <p className="opacity-90">{form.url}</p>
              </div>
            </>
          ) : error ? (
            <>
              <XCircle className="h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Failed</p>
                <p className="opacity-90">{(error as any).message}</p>
              </div>
            </>
          ) : verify?.success ? (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Connected!</p>
                <p className="opacity-90">
                  {verify.clusterName} (v{verify.version})
                </p>
              </div>
            </>
          ) : (
            <p className="italic text-muted-foreground">Ready</p>
          )}
        </div>

        {/* Section 1: Server Info */}
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Server Info</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label className="text-xs">Server Name</Label>
                <Input
                  className="h-8 text-sm"
                  value={form.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="My ES Cluster"
                />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs">Theme Color</Label>
                <div className="flex flex-wrap gap-2 h-8 items-center">
                  {SERVER_COLORS.map((c) => (
                    <button
                      key={c.bg}
                      className={cn(
                        'w-5 h-5 rounded-full border-2',
                        c.bg,
                        form.color === c.bg ? 'border-nord6 scale-110' : 'border-transparent'
                      )}
                      onClick={() => update({ color: c.bg })}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Elasticsearch URL</Label>
              <Input
                className="h-8 text-sm"
                value={form.url}
                onChange={(e) => update({ url: e.target.value })}
                placeholder="http://localhost:9200"
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Section 2: Security */}
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Security</h3>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Basic Authentication</Label>
              <div className="grid grid-cols-2 gap-4 mt-1">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Username</Label>
                  <Input
                    className="h-8 text-sm"
                    value={form.username || ''}
                    onChange={(e) => update({ username: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Password</Label>
                  <Input
                    className="h-8 text-sm"
                    type="password"
                    value={form.password || ''}
                    onChange={(e) => update({ password: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">SSL / TLS Settings</Label>
              <div className="grid grid-cols-2 gap-4">
                {(['certPath', 'keyPath'] as const).map((f) => (
                  <div key={f} className="flex gap-2 items-end">
                    <div className="grid gap-1.5 flex-1">
                      <Label className="text-[11px] text-muted-foreground">{f === 'certPath' ? 'Certificate (CRT)' : 'Private Key'}</Label>
                      <Input
                        className="h-8 text-xs font-mono"
                        value={form[f] || ''}
                        onChange={(e) => update({ [f]: e.target.value })}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px]"
                      onClick={async () => {
                        const path = await window.electron?.selectFile?.(f);
                        if (path) update({ [f]: path });
                      }}
                    >
                      Browse
                    </Button>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowInsecureSSL"
                    checked={form.allowInsecureSSL}
                    onChange={(e) => update({ allowInsecureSSL: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-input bg-background text-nord10 focus:ring-nord10"
                  />
                  <Label htmlFor="allowInsecureSSL" className="text-xs font-medium leading-none">
                    Allow Insecure SSL
                  </Label>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-normal opacity-80">
                  Bypass SSL certificate validation and server identity checks. 
                  Only use for local development or with self-signed certificates.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Section 3: Index Settings */}
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Index Settings</h3>
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground mb-2">
                Define patterns (e.g., <code>logs-*</code>) to group date-based indices in the sidebar.
              </p>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  placeholder="logs-*"
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && addPattern()}
                />
                <Button variant="outline" size="sm" className="h-8 text-xs px-3" onClick={addPattern}>
                  Add
                </Button>
              </div>
              <div className="grid gap-1.5">
                {form.indexPatterns?.map((pattern) => (
                  <div
                    key={pattern}
                    className="flex items-center justify-between bg-muted/20 px-2 py-1 rounded-md border"
                  >
                    <code className="text-[11px] font-mono">{pattern}</code>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removePattern(pattern)}>
                      <XCircle className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
                {(!form.indexPatterns || form.indexPatterns.length === 0) && (
                  <p className="text-[11px] text-center text-muted-foreground italic py-1.5 border border-dashed rounded-md">
                    No patterns defined
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-between pt-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm(`Remove ${form.name}?`)) {
                removeServer(server.id);
                navigate('/search');
              }
            }}
          >
            Delete Server
          </Button>
        </div>
      </main>
    </div>
  );
}
