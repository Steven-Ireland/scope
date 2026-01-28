import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useServer } from '@/context/server-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Search } from 'lucide-react';
import { SERVER_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

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
  
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (server && isInitialMount.current) {
      setName(server.name);
      setUrl(server.url);
      setUsername(server.username || '');
      setPassword(server.password || '');
      setSelectedColor(server.color || SERVER_COLORS[0].bg);
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
      selectedColor !== server.color;

    if (hasChanged) {
      const timeoutId = setTimeout(() => {
        updateServer(server.id, {
          name,
          url,
          username: username || undefined,
          password: password || undefined,
          color: selectedColor,
        });
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [name, url, username, password, selectedColor, server, updateServer]);

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
            <CardTitle>Connection Details</CardTitle>
            <CardDescription>Configure how Scope connects to this Elasticsearch cluster. Changes are saved automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
