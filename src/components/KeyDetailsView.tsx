'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ConnectionProfile, KeyMeta } from '@/lib/types';
import { formatBytes, formatDuration } from '@/lib/utils';
import { ArrowLeft, Clock, Copy, Download, Eye, EyeOff, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { JsonViewer } from './JsonViewer';

interface KeyDetailsViewProps {
    keyData: KeyMeta;
    connection?: ConnectionProfile;
    onBack: () => void;
    onDelete?: (key: KeyMeta) => void;
    onExpire?: (key: KeyMeta, ttl: number) => void;
}

export function KeyDetailsView({ keyData, connection, onBack, onDelete, onExpire }: KeyDetailsViewProps) {
    const [showValue, setShowValue] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [keyValue, setKeyValue] = useState<string | Record<string, string> | string[] | [string, string][] | null>('');
    const [isValueLoaded, setIsValueLoaded] = useState(false);
    const [selectedTtl, setSelectedTtl] = useState('60');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const loadKeyValue = async () => {
        if (!keyData || !connection) {
            console.log('Cannot load key value:', { keyData: !!keyData, connection: !!connection });
            return;
        }

        console.log('Loading key value for:', keyData.key, 'with connection:', connection.id);
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
                    // Store the raw value, not stringified
                    setKeyValue(data.data.value);
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

    const copyToClipboard = (value: unknown) => {
        const textToCopy = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
        navigator.clipboard.writeText(textToCopy);
    };

    const downloadValue = () => {
        if (!keyValue || !mounted) return;

        const blob = new Blob([JSON.stringify(keyValue, null, 2)], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${keyData?.key.replace(/[:/]/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            {/* Header with back button */}
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onBack}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Keys
                </Button>
                <div className="flex-1">
                    <h2 className="text-lg font-semibold">Key Details</h2>
                    <p className="text-sm text-muted-foreground font-mono break-all">{keyData.key}</p>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="value">Value</TabsTrigger>
                    <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
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
                </TabsContent>

                <TabsContent value="value" className="space-y-4">
                    <div className="flex items-center justify-between">
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

                    <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-700 rounded-lg p-4 h-[500px] overflow-auto relative">
                        {!isValueLoaded ? (
                            <div className="text-center text-muted-foreground h-full flex items-center justify-center">
                                <div className="space-y-4">
                                    <div className="w-16 h-16 mx-auto bg-gray-700/50 rounded-full flex items-center justify-center">
                                        <RefreshCw className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-medium">No Data Loaded</p>
                                        <p className="text-sm text-gray-500">Click &quot;Refresh Value&quot; to load the key value</p>
                                    </div>
                                </div>
                            </div>
                        ) : isLoading ? (
                            <div className="text-center text-muted-foreground h-full flex items-center justify-center">
                                <div className="space-y-4">
                                    <RefreshCw className="w-12 h-12 animate-spin mx-auto text-blue-400" />
                                    <div>
                                        <p className="text-lg font-medium">Loading Value...</p>
                                        <p className="text-sm text-gray-500">Please wait while we fetch the data</p>
                                    </div>
                                </div>
                            </div>
                        ) : showValue ? (
                            <div className="h-full">
                                <JsonViewer
                                    data={keyValue}
                                    initialExpanded={false}
                                />
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground h-full flex items-center justify-center">
                                <div className="space-y-4">
                                    <div className="w-16 h-16 mx-auto bg-gray-700/50 rounded-full flex items-center justify-center">
                                        <EyeOff className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-medium">Value Hidden</p>
                                        <p className="text-sm text-gray-500">Click the eye icon to reveal the value</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="actions" className="space-y-4">
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
                </TabsContent>
            </Tabs>
        </div>
    );
}
