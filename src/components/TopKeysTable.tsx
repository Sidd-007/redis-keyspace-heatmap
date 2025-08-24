'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ConnectionProfile, KeyMeta } from '@/lib/types';
import { formatBytes, formatDuration } from '@/lib/utils';
import { Clock, Eye, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { KeyDetailsView } from './KeyDetailsView';

interface TopKeysTableProps {
  data: Record<string, KeyMeta[]>;
  connection?: ConnectionProfile;
  onViewKey?: (key: KeyMeta) => void;
  onDeleteKey?: (key: KeyMeta) => void;
  onExpireKey?: (key: KeyMeta, ttl: number) => void;
}

type SortField = 'key' | 'type' | 'estBytes' | 'ttlMs' | 'idleSec';
type SortDirection = 'asc' | 'desc';

export function TopKeysTable({ data, connection, onDeleteKey, onExpireKey }: TopKeysTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('estBytes');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedKey, setSelectedKey] = useState<KeyMeta | null>(null);
  const [showKeyDetails, setShowKeyDetails] = useState(false);
  const itemsPerPage = 8; // Reduced from 15 to 8 for better fit

  // Flatten all keys into a single array
  const allKeys = Object.entries(data).flatMap(([type, keys]) =>
    keys.map(key => ({ ...key, type: type as KeyMeta['type'] }))
  );

  // Filter and sort data
  const filteredKeys = allKeys
    .filter(key => {
      const matchesSearch = key.key.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'all' || key.type === selectedType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'key':
          aValue = a.key;
          bValue = b.key;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'estBytes':
          aValue = a.estBytes || 0;
          bValue = b.estBytes || 0;
          break;
        case 'ttlMs':
          aValue = a.ttlMs || 0;
          bValue = b.ttlMs || 0;
          break;
        case 'idleSec':
          aValue = a.idleSec || 0;
          bValue = b.idleSec || 0;
          break;
        default:
          aValue = a.estBytes || 0;
          bValue = b.estBytes || 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

  // Paginate data
  const totalPages = Math.ceil(filteredKeys.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedKeys = filteredKeys.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const handleViewKey = (key: KeyMeta) => {
    setSelectedKey(key);
    setShowKeyDetails(true);
  };

  const handleBackToKeys = () => {
    setShowKeyDetails(false);
    setSelectedKey(null);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'hash': return 'bg-muted text-muted-foreground';
      case 'list': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'set': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'zset': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'stream': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:bg-accent px-2 py-1 rounded transition-colors text-xs font-medium"
    >
      {children}
      {sortField === field && (
        <span className="text-xs">
          {sortDirection === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );

  const availableTypes = ['all', ...Object.keys(data)];

  if (showKeyDetails && selectedKey) {
    return (
      <KeyDetailsView
        keyData={selectedKey}
        connection={connection}
        onBack={handleBackToKeys}
        onDelete={onDeleteKey}
        onExpire={onExpireKey}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header with Controls */}
      <div className="bg-card border rounded-lg shadow-sm p-3 mb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-foreground">
            Top Keys by Memory Usage
          </h3>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
              <Input
                placeholder="Search keys..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-2 py-1 border border-input rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground h-8"
              />
            </div>

            <Select value={selectedType} onValueChange={(value) => {
              setSelectedType(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type === 'all' ? 'All Types' : type.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{filteredKeys.length} of {allKeys.length}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs border border-input rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent bg-background text-foreground"
                >
                  ←
                </button>
                <span className="px-2 py-1 text-xs">
                  {currentPage}/{totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs border border-input rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent bg-background text-foreground"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Table Container */}
      <div className="flex-1 bg-card border rounded-lg shadow-sm overflow-hidden">
        {paginatedKeys.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            {searchTerm || selectedType !== 'all'
              ? 'No keys found matching your search.'
              : 'No data available.'
            }
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>
                    <SortableHeader field="key">Key</SortableHeader>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHeader field="type">Type</SortableHeader>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHeader field="estBytes">Size</SortableHeader>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHeader field="ttlMs">TTL</SortableHeader>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHeader field="idleSec">Idle</SortableHeader>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedKeys.map((key) => (
                  <TableRow key={key.key}>
                    <TableCell>
                      <div className="font-mono text-foreground truncate max-w-xs" title={key.key}>
                        {key.key}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`text-xs px-1 py-0.5 rounded ${getTypeColor(key.type)}`}>
                        {key.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {key.estBytes ? formatBytes(key.estBytes) : 'Unknown'}
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      <div className="flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {key.ttlMs === null ? (
                          <span className="text-green-600 dark:text-green-400">Persistent</span>
                        ) : key.ttlMs === 0 ? (
                          <span className="text-red-600 dark:text-red-400">Expired</span>
                        ) : (
                          <span>{formatDuration(key.ttlMs)}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {key.idleSec !== undefined ? formatDuration(key.idleSec * 1000) : 'Unknown'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewKey(key)}
                              className="p-1 hover:bg-accent rounded text-muted-foreground"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Key Details</p>
                            <p className="text-xs opacity-80">Inspect key metadata and value</p>
                          </TooltipContent>
                        </Tooltip>
                        {onDeleteKey && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onDeleteKey(key)}
                                className="p-1 hover:bg-accent rounded text-muted-foreground"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete Key</p>
                              <p className="text-xs opacity-80">Permanently remove this key from Redis</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {onExpireKey && key.ttlMs !== null && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onExpireKey(key, 3600)} // 1 hour
                                className="p-1 hover:bg-accent rounded text-muted-foreground"
                              >
                                <Clock className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Set TTL to 1 Hour</p>
                              <p className="text-xs opacity-80">Make this key expire in 1 hour</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
