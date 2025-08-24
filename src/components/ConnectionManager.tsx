'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConnectionProfile } from '@/lib/types';
import { CheckCircle, Database, Plus, Server, Settings, Trash2, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ConnectionManagerProps {
  onConnectionSelect: (connection: ConnectionProfile) => void;
  selectedConnectionId?: string;
}

export function ConnectionManager({ onConnectionSelect, selectedConnectionId }: ConnectionManagerProps) {
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [isAddConnectionOpen, setIsAddConnectionOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [newConnection, setNewConnection] = useState<Partial<ConnectionProfile>>({
    name: '',
    kind: 'standalone',
    host: '',
    port: 6379,
    password: '',
    tls: false,
    db: 0
  });

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const response = await fetch('/api/session');
      const data = await response.json();

      if (data.ok) {
        setConnections(data.data.connections || []);
      } else if (data.code === 'NO_SESSION') {
        // No session yet, that's okay
        setConnections([]);
      } else {
        console.error('Failed to load connections:', data);
        toast.error('Failed to load connections');
      }
    } catch (error) {
      console.error('Error loading connections:', error);
      toast.error('Failed to load connections');
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test_connection',
          connection: newConnection
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast.success('Connection test successful!');
      } else {
        toast.error(data.message || 'Connection test failed');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      toast.error('Failed to test connection');
    } finally {
      setIsTesting(false);
    }
  };

  const addConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add_connection',
          connection: newConnection
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast.success('Connection added successfully!');
        setIsAddConnectionOpen(false);
        setNewConnection({
          name: '',
          kind: 'standalone',
          host: '',
          port: 6379,
          password: '',
          tls: false,
          db: 0
        });
        await loadConnections();
      } else {
        toast.error(data.message || 'Failed to add connection');
      }
    } catch (error) {
      console.error('Add connection error:', error);
      toast.error('Failed to add connection');
    } finally {
      setIsLoading(false);
    }
  };

  const removeConnection = async (connectionId: string) => {
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove_connection',
          connectionId
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast.success('Connection removed successfully!');
        await loadConnections();
      } else {
        toast.error(data.message || 'Failed to remove connection');
      }
    } catch (error) {
      console.error('Remove connection error:', error);
      toast.error('Failed to remove connection');
    }
  };

  const handleConnectionSelect = (connection: ConnectionProfile) => {
    onConnectionSelect(connection);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Connection List */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-card/80 flex-1 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-sm font-semibold">Redis Connections</CardTitle>
        </CardHeader>

        <div className="px-4 pb-2 flex-shrink-0">
          <Dialog open={isAddConnectionOpen} onOpenChange={setIsAddConnectionOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full h-7 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-3 h-3 mr-1" />
                Add Connection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Plus className="w-4 h-4 text-primary" />
                  </div>
                  <DialogTitle className="text-lg">Add Redis Connection</DialogTitle>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                <Tabs defaultValue="standalone" onValueChange={(value) => setNewConnection(prev => ({ ...prev, kind: value as 'standalone' | 'cluster' | 'sentinel' }))}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="standalone" className="text-xs">Standalone</TabsTrigger>
                    <TabsTrigger value="cluster" className="text-xs">Cluster</TabsTrigger>
                    <TabsTrigger value="sentinel" className="text-xs">Sentinel</TabsTrigger>
                  </TabsList>

                  <TabsContent value="standalone" className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">Connection Name</Label>
                        <Input
                          id="name"
                          value={newConnection.name}
                          onChange={(e) => setNewConnection(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="My Redis Instance"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="host" className="text-sm font-medium">Host</Label>
                        <Input
                          id="host"
                          value={newConnection.host}
                          onChange={(e) => setNewConnection(prev => ({ ...prev, host: e.target.value }))}
                          placeholder="redis.example.com"
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="port" className="text-sm font-medium">Port</Label>
                        <Input
                          id="port"
                          type="number"
                          value={newConnection.port}
                          onChange={(e) => setNewConnection(prev => ({ ...prev, port: parseInt(e.target.value) || 6379 }))}
                          placeholder="6379"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="db" className="text-sm font-medium">Database</Label>
                        <Input
                          id="db"
                          type="number"
                          value={newConnection.db}
                          onChange={(e) => setNewConnection(prev => ({ ...prev, db: parseInt(e.target.value) || 0 }))}
                          placeholder="0"
                          className="h-9"
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <Switch
                          id="tls"
                          checked={newConnection.tls}
                          onCheckedChange={(checked) => setNewConnection(prev => ({ ...prev, tls: checked }))}
                        />
                        <Label htmlFor="tls" className="text-sm font-medium">TLS</Label>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="password">Password (optional)</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newConnection.password}
                        onChange={(e) => setNewConnection(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Leave empty if no password"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="cluster" className="space-y-4">
                    <div>
                      <Label htmlFor="cluster-name">Connection Name</Label>
                      <Input
                        id="cluster-name"
                        value={newConnection.name}
                        onChange={(e) => setNewConnection(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="My Redis Cluster"
                      />
                    </div>

                    <div>
                      <Label>Cluster Hosts</Label>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="redis-node1.example.com"
                            onChange={(e) => setNewConnection(prev => ({
                              ...prev,
                              clusterHosts: [{ host: e.target.value, port: 6379 }]
                            }))}
                          />
                          <Input
                            type="number"
                            placeholder="6379"
                            onChange={(e) => setNewConnection(prev => ({
                              ...prev,
                              clusterHosts: [{ host: prev.clusterHosts?.[0]?.host || '', port: parseInt(e.target.value) || 6379 }]
                            }))}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="cluster-password">Password (optional)</Label>
                      <Input
                        id="cluster-password"
                        type="password"
                        value={newConnection.password}
                        onChange={(e) => setNewConnection(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Leave empty if no password"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="sentinel" className="space-y-4">
                    <div>
                      <Label htmlFor="sentinel-name">Connection Name</Label>
                      <Input
                        id="sentinel-name"
                        value={newConnection.name}
                        onChange={(e) => setNewConnection(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="My Redis Sentinel"
                      />
                    </div>

                    <div>
                      <Label htmlFor="master-name">Master Name</Label>
                      <Input
                        id="master-name"
                        value={newConnection.sentinel?.name}
                        onChange={(e) => setNewConnection(prev => ({
                          ...prev,
                          sentinel: {
                            name: e.target.value || '',
                            hosts: prev.sentinel?.hosts || [],
                            password: prev.sentinel?.password
                          }
                        }))}
                        placeholder="mymaster"
                      />
                    </div>

                    <div>
                      <Label>Sentinel Hosts</Label>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="sentinel1.example.com"
                            onChange={(e) => setNewConnection(prev => ({
                              ...prev,
                              sentinel: {
                                name: prev.sentinel?.name || '',
                                hosts: [{ host: e.target.value, port: 26379 }],
                                password: prev.sentinel?.password
                              }
                            }))}
                          />
                          <Input
                            type="number"
                            placeholder="26379"
                            onChange={(e) => setNewConnection(prev => ({
                              ...prev,
                              sentinel: {
                                name: prev.sentinel?.name || '',
                                hosts: [{ host: prev.sentinel?.hosts?.[0]?.host || '', port: parseInt(e.target.value) || 26379 }],
                                password: prev.sentinel?.password
                              }
                            }))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sentinel-password">Password (optional)</Label>
                        <Input
                          id="sentinel-password"
                          type="password"
                          value={newConnection.password}
                          onChange={(e) => setNewConnection(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Redis password"
                        />
                      </div>
                      <div>
                        <Label htmlFor="sentinel-auth">Sentinel Auth (optional)</Label>
                        <Input
                          id="sentinel-auth"
                          type="password"
                          value={newConnection.sentinel?.password}
                          onChange={(e) => setNewConnection(prev => ({
                            ...prev,
                            sentinel: {
                              name: prev.sentinel?.name || '',
                              password: e.target.value,
                              hosts: prev.sentinel?.hosts || []
                            }
                          }))}
                          placeholder="Sentinel password"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={testConnection}
                    disabled={isTesting}
                    className="h-9 px-4"
                  >
                    {isTesting ? (
                      <>
                        <div className="w-3 h-3 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3 h-3 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={addConnection}
                    disabled={isLoading || !newConnection.name}
                    className="h-9 px-4 bg-primary hover:bg-primary/90"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-3 h-3 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3 mr-2" />
                        Add Connection
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <CardContent className="pt-0 flex-1 flex flex-col">
          {connections.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-12 h-12 mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                <Database className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">No connections yet</p>
              <p className="text-xs">Add your first Redis connection to get started</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-1 overflow-y-auto">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className={`group relative flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all duration-200 flex-shrink-0 ${selectedConnectionId === connection.id
                    ? 'bg-primary/5 border-primary/30 shadow-sm'
                    : 'hover:bg-muted/30 hover:border-muted-foreground/20'
                    }`}
                  onClick={() => handleConnectionSelect(connection)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`p-1.5 rounded-lg flex-shrink-0 ${selectedConnectionId === connection.id
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted/50 text-muted-foreground'
                      }`}>
                      <Server className="w-2.5 h-2.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm truncate">{connection.name}</span>
                        <Badge variant="secondary" className="text-xs px-1 py-0 flex-shrink-0">
                          {connection.kind}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {connection.kind === 'standalone' && `${connection.host}:${connection.port}`}
                        {connection.kind === 'cluster' && `Cluster (${connection.clusterHosts?.length || 0} nodes)`}
                        {connection.kind === 'sentinel' && `Sentinel (${connection.sentinel?.hosts?.length || 0} nodes)`}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeConnection(connection.id);
                    }}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
