'use client';

import { ConnectionManager } from '@/components/ConnectionManager';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { HeatmapIdle } from '@/components/HeatmapIdle';
import { HeatmapTTL } from '@/components/HeatmapTTL';
import { PrefixTable } from '@/components/PrefixTable';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { TopKeysTable } from '@/components/TopKeysTable';
import { TTLModal } from '@/components/TTLModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ConnectionProfile, KeyMeta, RedisInfo, ScanConfig, ScanResult } from '@/lib/types';
import { formatDuration } from '@/lib/utils';
import { Database, Settings } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function Dashboard() {
  const [selectedConnection, setSelectedConnection] = useState<ConnectionProfile | null>(null);
  const [redisInfo, setRedisInfo] = useState<RedisInfo | null>(null);
  const [scanConfig, setScanConfig] = useState<ScanConfig>({
    dbs: [0],
    sampleLimit: 50000,
    scanCount: 1000,
    ttlBuckets: [0, 60, 300, 1800, 3600, 21600, 86400],
    idleBuckets: [0, 60, 300, 3600, 21600, 86400],
    sizeTopN: 20
  });
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [heatmapColorBy] = useState<'count' | 'bytes'>('count');
  const [drillDownPrefix, setDrillDownPrefix] = useState<string>('');
  const [drillDownHistory, setDrillDownHistory] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<KeyMeta | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [ttlModalOpen, setTtlModalOpen] = useState(false);
  const [keyToSetTTL, setKeyToSetTTL] = useState<KeyMeta | null>(null);
  const [isSettingTTL, setIsSettingTTL] = useState(false);

  const loadRedisInfo = useCallback(async () => {
    if (!selectedConnection) return;

    try {
      const response = await fetch(`/api/redis/info?connectionId=${selectedConnection.id}`);
      const data = await response.json();

      if (data.ok) {
        setRedisInfo(data.data);
      } else {
        console.error('Failed to load Redis info:', data.message);
        toast.error('Failed to load Redis info');
      }
    } catch (error) {
      console.error('Failed to load Redis info:', error);
      toast.error('Failed to load Redis info');
    }
  }, [selectedConnection]);

  useEffect(() => {
    if (selectedConnection) {
      loadRedisInfo();
    }
  }, [loadRedisInfo, selectedConnection]);

  const startScan = async () => {
    if (!selectedConnection) {
      toast.error('Please select a connection first');
      return;
    }

    setIsScanning(true);
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId: selectedConnection.id,
          config: scanConfig
        }),
      });

      const data = await response.json();
      if (data.ok) {
        setScanResult(data.data);
        // Reset drill-down when new scan is performed
        setDrillDownPrefix('');
        setDrillDownHistory([]);
        toast.success('Scan completed successfully!');
      } else {
        console.error('Scan failed:', data.message);
        toast.error(data.message || 'Scan failed');
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnectionSelect = (connection: ConnectionProfile) => {
    setSelectedConnection(connection);
    // Clear previous scan results when switching connections
    setScanResult(null);
    setDrillDownPrefix('');
    setDrillDownHistory([]);
  };

  const handleDrillDown = (prefix: string) => {
    setDrillDownPrefix(prefix);
    setDrillDownHistory(prev => [...prev, prefix]);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // Root level
      setDrillDownPrefix('');
      setDrillDownHistory([]);
    } else {
      // Specific level
      const newHistory = drillDownHistory.slice(0, index + 1);
      setDrillDownHistory(newHistory);
      setDrillDownPrefix(newHistory[newHistory.length - 1] || '');
    }
  };

  // Filter data based on drill-down prefix
  const getFilteredPrefixes = () => {
    if (!scanResult) return [];

    if (!drillDownPrefix) {
      return scanResult.aggregates.prefixes;
    }

    // Filter prefixes that start with the drill-down prefix and have additional segments
    return scanResult.aggregates.prefixes.filter(prefix => {
      if (!prefix.prefix.startsWith(drillDownPrefix + ':')) return false;

      // Get the next segment after the drill-down prefix
      const remaining = prefix.prefix.substring(drillDownPrefix.length + 1);

      // Only show prefixes that have exactly one more segment
      return !remaining.includes(':') || remaining.split(':').length === 1;
    });
  };

  const handleDeleteKey = async (key: KeyMeta) => {
    setKeyToDelete(key);
    setDeleteModalOpen(true);
  };

  const confirmDeleteKey = async () => {
    if (!keyToDelete || !selectedConnection) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/redis/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId: selectedConnection.id,
          key: keyToDelete.key,
          db: keyToDelete.db
        }),
      });

      const data = await response.json();
      if (data.ok) {
        toast.success('Key deleted successfully');
        // Refresh scan results
        if (scanResult) {
          startScan();
        }
      } else {
        toast.error(data.message || 'Failed to delete key');
      }
    } catch (error) {
      console.error('Delete key error:', error);
      toast.error('Failed to delete key');
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setKeyToDelete(null);
    }
  };

  const handleSetTTL = async (key: KeyMeta) => {
    setKeyToSetTTL(key);
    setTtlModalOpen(true);
  };

  const confirmSetTTL = async (ttlSeconds: number) => {
    if (!keyToSetTTL || !selectedConnection) return;

    setIsSettingTTL(true);
    try {
      const response = await fetch('/api/redis/expire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId: selectedConnection.id,
          key: keyToSetTTL.key,
          ttl: ttlSeconds,
          db: keyToSetTTL.db
        }),
      });

      const data = await response.json();
      if (data.ok) {
        toast.success('TTL set successfully');
        // Refresh scan results
        if (scanResult) {
          startScan();
        }
      } else {
        toast.error(data.message || 'Failed to set TTL');
      }
    } catch (error) {
      console.error('Set TTL error:', error);
      toast.error('Failed to set TTL');
    } finally {
      setIsSettingTTL(false);
      setTtlModalOpen(false);
      setKeyToSetTTL(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">R</span>
              </div>
              <h1 className="text-xl font-semibold">Redis Heatmap</h1>
            </div>
            {selectedConnection && (
              <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
                <span>•</span>
                <span>Connected to {selectedConnection.name}</span>
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center space-x-4">
            {/* Scan Results in Header */}
            {scanResult && (
              <div className="hidden lg:flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-4">
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="ml-1 font-medium">{formatDuration(scanResult.sampleStats.durationMs)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sampled:</span>
                    <span className="ml-1 font-medium">{scanResult.sampleStats.sampled.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total:</span>
                    <span className="ml-1 font-medium">{scanResult.sampleStats.approxTotalKeys.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Coverage:</span>
                    <span className="ml-1 font-medium">{(scanResult.sampleStats.coverage * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60 flex flex-col overflow-hidden">
          <div className="p-4 flex-shrink-0">
            <h2 className="text-lg font-semibold mb-3">Connections</h2>
            <ConnectionManager
              onConnectionSelect={handleConnectionSelect}
              selectedConnectionId={selectedConnection?.id}
            />
          </div>

          {/* Redis Information in Sidebar */}
          {selectedConnection && redisInfo && (
            <div className="px-4 flex-shrink-0">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-card/80">
                <CardHeader className="pb-2 flex-shrink-0">
                  <CardTitle className="text-sm font-semibold">Redis Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Version</div>
                      <div className="font-medium truncate">{redisInfo.redis_version}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Memory</div>
                      <div className="font-medium">{redisInfo.used_memory_human}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Total Keys</div>
                      <div className="font-medium">
                        {Object.values(redisInfo.keyspace).reduce((sum, db) => sum + db.keys, 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Expiring</div>
                      <div className="font-medium">
                        {Object.values(redisInfo.keyspace).reduce((sum, db) => sum + db.expires, 0)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedConnection && (
            <div className="p-4 flex-1 flex flex-col min-h-0">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-card/80 flex-1 flex flex-col">
                <CardHeader className="pb-2 flex-shrink-0">
                  <CardTitle className="text-sm font-semibold">Scan Configuration</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 flex-1 flex flex-col">
                  <div className="space-y-2 flex-1 flex flex-col">
                    <div>
                      <label className="text-xs text-muted-foreground">Sample Limit</label>
                      <input
                        type="number"
                        value={scanConfig.sampleLimit}
                        onChange={(e) => setScanConfig(prev => ({ ...prev, sampleLimit: parseInt(e.target.value) || 50000 }))}
                        className="w-full mt-1 px-2 py-1 text-xs border rounded bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Scan Count</label>
                      <input
                        type="number"
                        value={scanConfig.scanCount}
                        onChange={(e) => setScanConfig(prev => ({ ...prev, scanCount: parseInt(e.target.value) || 1000 }))}
                        className="w-full mt-1 px-2 py-1 text-xs border rounded bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Top N Keys</label>
                      <input
                        type="number"
                        value={scanConfig.sizeTopN}
                        onChange={(e) => setScanConfig(prev => ({ ...prev, sizeTopN: parseInt(e.target.value) || 20 }))}
                        className="w-full mt-1 px-2 py-1 text-xs border rounded bg-background"
                      />
                    </div>
                    <div className="flex-1 flex items-end">
                      <Button
                        onClick={startScan}
                        disabled={isScanning}
                        className="w-full"
                        size="sm"
                      >
                        {isScanning ? (
                          <>
                            <Progress value={undefined} className="w-4 h-4 mr-2" />
                            Scanning...
                          </>
                        ) : (
                          'Start Scan'
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col overflow-hidden">
            {!selectedConnection ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔌</span>
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Connection Selected</h3>
                  <p className="text-muted-foreground">Select a Redis connection from the sidebar to get started</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {scanResult ? (
                  <>
                    {/* Breadcrumb Navigation */}
                    {drillDownHistory.length > 0 && (
                      <div className="flex items-center space-x-2 text-sm bg-muted/50 px-4 py-2 flex-shrink-0">
                        <span className="text-muted-foreground">Path:</span>
                        <button
                          onClick={() => handleBreadcrumbClick(-1)}
                          className="text-primary hover:underline"
                        >
                          Root
                        </button>
                        {drillDownHistory.map((prefix, index) => (
                          <React.Fragment key={index}>
                            <span className="text-muted-foreground">/</span>
                            <button
                              onClick={() => handleBreadcrumbClick(index)}
                              className="text-primary hover:underline"
                            >
                              {prefix.split(':').pop()}
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                    )}

                    {/* Main Content Tabs */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                      <Tabs defaultValue="heatmap" className="flex-1 flex flex-col overflow-hidden p-4">
                        <TabsList className="flex w-full flex-shrink-0">
                          <TabsTrigger value="heatmap" className="flex-1">Heatmaps</TabsTrigger>
                          <TabsTrigger value="prefixes" className="flex-1">Prefixes</TabsTrigger>
                          <TabsTrigger value="topkeys" className="flex-1">Top Keys</TabsTrigger>
                        </TabsList>

                        <TabsContent value="heatmap" className="flex-1 flex flex-col min-h-0 mt-2 overflow-hidden">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
                            <Card className="flex flex-col overflow-hidden">
                              <CardHeader className="pb-2 flex-shrink-0">
                                <CardTitle className="text-lg">TTL Distribution</CardTitle>
                              </CardHeader>
                              <CardContent className="flex-1 min-h-0 overflow-hidden">
                                <HeatmapTTL
                                  data={getFilteredPrefixes()}
                                  ttlBuckets={scanConfig.ttlBuckets}
                                  colorBy={heatmapColorBy}
                                  onCellClick={(prefix) => handleDrillDown(prefix)}
                                />
                              </CardContent>
                            </Card>
                            <Card className="flex flex-col overflow-hidden">
                              <CardHeader className="pb-2 flex-shrink-0">
                                <CardTitle className="text-lg">Idle Time Distribution</CardTitle>
                              </CardHeader>
                              <CardContent className="flex-1 min-h-0 overflow-hidden">
                                <HeatmapIdle
                                  data={getFilteredPrefixes()}
                                  idleBuckets={scanConfig.idleBuckets}
                                  colorBy={heatmapColorBy}
                                  onCellClick={(prefix) => handleDrillDown(prefix)}
                                />
                              </CardContent>
                            </Card>
                          </div>
                        </TabsContent>

                        <TabsContent value="prefixes" className="flex-1 flex flex-col min-h-0  overflow-hidden">
                          <Card className="flex-1 flex flex-col overflow-hidden">
                            <CardHeader className="pb-2 flex-shrink-0">
                              <CardTitle className="text-lg">Prefix Analysis</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 min-h-0 overflow-hidden">
                              <PrefixTable
                                data={getFilteredPrefixes()}
                                onDrillDown={handleDrillDown}
                              />
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="topkeys" className="flex-1 flex flex-col min-h-0  overflow-hidden">
                          <Card className="flex-1 flex flex-col overflow-hidden">
                            <CardHeader className="pb-2 flex-shrink-0">
                              <CardTitle className="text-lg">Top Keys by Size</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 min-h-0 overflow-hidden">
                              <TopKeysTable
                                data={scanResult.topN}
                                connection={selectedConnection}
                                onDeleteKey={handleDeleteKey}
                                onExpireKey={(key, ttl) => handleSetTTL(key)}
                              />
                            </CardContent>
                          </Card>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📊</span>
                      </div>
                      <h3 className="text-lg font-medium mb-2">Ready to Scan</h3>
                      <p className="text-muted-foreground">Configure scan settings in the sidebar and start scanning</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDeleteKey}
        keyData={keyToDelete}
        isLoading={isDeleting}
      />

      <TTLModal
        isOpen={ttlModalOpen}
        onClose={() => setTtlModalOpen(false)}
        onConfirm={confirmSetTTL}
        keyData={keyToSetTTL}
        isLoading={isSettingTTL}
      />
    </div>
  );
}
