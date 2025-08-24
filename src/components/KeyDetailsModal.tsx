'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ConnectionProfile, KeyMeta } from '@/lib/types';
import { formatBytes, formatDuration } from '@/lib/utils';
import { Clock, Copy, Download, Eye, EyeOff, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface KeyDetailsModalProps {
  keyData: KeyMeta | null;
  isOpen: boolean;
  onClose: () => void;
  connection?: ConnectionProfile;
  onDelete?: (key: KeyMeta) => void;
  onExpire?: (key: KeyMeta, ttl: number) => void;
}

export function KeyDetailsModal({ keyData, isOpen, onClose, connection, onDelete, onExpire }: KeyDetailsModalProps) {
  const [showValue, setShowValue] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [keyValue, setKeyValue] = useState<string>('');
  const [isValueLoaded, setIsValueLoaded] = useState(false);
  const [selectedTtl, setSelectedTtl] = useState('60');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadKeyValue = async () => {
    if (!keyData || isValueLoaded || !connection) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/redis/get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: keyData.key,
          connection: connection
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setKeyValue(JSON.stringify(data.data.value, null, 2));
        } else {
          setKeyValue('Error loading value');
        }
      } else {
        setKeyValue('Error loading value');
      }
    } catch {
      setKeyValue('Error loading value');
    } finally {
      setIsLoading(false);
      setIsValueLoaded(true);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadValue = () => {
    if (!keyValue || !mounted) return;

    const blob = new Blob([keyValue], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${keyData?.key.replace(/[:/]/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatValue = (value: string) => {
    try {
      // Try to parse as JSON for pretty formatting
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // If not JSON, return as is
      return value;
    }
  };

  if (!keyData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] w-[90vw] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-sm">Key Details</span>
            <span className="text-muted-foreground font-normal">-</span>
            <span className="font-mono text-sm truncate">{keyData.key}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full overflow-hidden">
          <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="value">Value</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="flex-1 overflow-auto p-4">
              <div className="space-y-4 h-full">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Key Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-muted-foreground">Key Name</label>
                        <div className="font-mono bg-muted p-2 rounded mt-1 break-all">
                          {keyData.key}
                        </div>
                      </div>
                      <div>
                        <label className="font-medium text-muted-foreground">Data Type</label>
                        <div className="bg-muted p-2 rounded mt-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${keyData.type === 'string' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            keyData.type === 'hash' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              keyData.type === 'list' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                keyData.type === 'set' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                  keyData.type === 'zset' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                            {keyData.type.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Memory & Size</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-muted-foreground">Estimated Size</label>
                        <div className="text-lg font-semibold mt-1">
                          {formatBytes(keyData.estBytes || 0)}
                        </div>
                      </div>
                      <div>
                        <label className="font-medium text-muted-foreground">Memory Usage</label>
                        <div className="text-lg font-semibold mt-1">
                          {keyData.estBytes ? `${Math.round(keyData.estBytes / 1024)} KB` : 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Time Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-muted-foreground">TTL (Time To Live)</label>
                        <div className="mt-1">
                          {keyData.ttlMs === -1 ? (
                            <span className="text-green-600 dark:text-green-400">Persistent (No expiration)</span>
                          ) : keyData.ttlMs === -2 ? (
                            <span className="text-red-600 dark:text-red-400">Key does not exist</span>
                          ) : (
                            <span className="text-orange-600 dark:text-orange-400">
                              {formatDuration(keyData.ttlMs || 0)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="font-medium text-muted-foreground">Idle Time</label>
                        <div className="mt-1">
                          {keyData.idleSec ? (
                            <span className="text-blue-600 dark:text-blue-400">
                              {formatDuration(keyData.idleSec * 1000)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="value" className="flex-1 flex flex-col p-4">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="text-lg font-semibold">Key Value</h3>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowValue(!showValue)}
                      >
                        {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{showValue ? 'Hide Value' : 'Show Value'}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadKeyValue}
                        disabled={isLoading}
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh Value</p>
                    </TooltipContent>
                  </Tooltip>

                  {keyValue && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(keyValue)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy Value</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadValue}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download Value</p>
                        </TooltipContent>
                      </Tooltip>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 bg-muted rounded-lg p-4 overflow-auto min-h-0">
                {!isValueLoaded ? (
                  <div className="text-center text-muted-foreground">
                    <p>Click &quot;Refresh Value&quot; to load the key value</p>
                  </div>
                ) : isLoading ? (
                  <div className="text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p>Loading value...</p>
                  </div>
                ) : showValue ? (
                  <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                    {formatValue(keyValue)}
                  </pre>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <EyeOff className="w-6 h-6 mx-auto mb-2" />
                    <p>Value is hidden</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="actions" className="flex-1 p-4">
              <div className="space-y-4 h-full">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Danger Zone</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg">
                        <div>
                          <h4 className="font-medium text-red-600 dark:text-red-400">Delete Key</h4>
                          <p className="text-sm text-muted-foreground">
                            Permanently delete this key from Redis
                          </p>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => onDelete?.(keyData)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete this key permanently</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {keyData.ttlMs !== -1 && (
                        <div className="flex items-center justify-between p-4 border border-orange-200 dark:border-orange-800 rounded-lg">
                          <div>
                            <h4 className="font-medium text-orange-600 dark:text-orange-400">Set TTL</h4>
                            <p className="text-sm text-muted-foreground">
                              Set expiration time for this key
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select value={selectedTtl} onValueChange={setSelectedTtl}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="60">1 minute</SelectItem>
                                <SelectItem value="300">5 minutes</SelectItem>
                                <SelectItem value="3600">1 hour</SelectItem>
                                <SelectItem value="86400">1 day</SelectItem>
                                <SelectItem value="604800">1 week</SelectItem>
                              </SelectContent>
                            </Select>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const ttl = parseInt(selectedTtl);
                                    onExpire?.(keyData, ttl);
                                  }}
                                >
                                  <Clock className="w-4 h-4 mr-2" />
                                  Set TTL
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Set expiration time</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
