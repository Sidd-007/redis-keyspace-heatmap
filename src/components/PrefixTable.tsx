'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PrefixAgg } from '@/lib/types';
import { formatBytes } from '@/lib/utils';
import { Download, Search, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface PrefixTableProps {
  data: PrefixAgg[];
  onDrillDown?: (prefix: string) => void;
}

type SortField = 'prefix' | 'count' | 'estBytes' | 'persistentPercent';
type SortDirection = 'asc' | 'desc';

export function PrefixTable({ data, onDrillDown }: PrefixTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('count');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Reduced from 10 to 8 for better fit
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate persistent percentage
  const dataWithPersistent = data.map(prefix => {
    const persistentCount = prefix.ttlHist['0'] || 0;
    const persistentPercent = prefix.count > 0 ? (persistentCount / prefix.count) * 100 : 0;
    return { ...prefix, persistentPercent };
  });

  // Filter and sort data
  const filteredData = dataWithPersistent
    .filter(prefix => {
      if (!searchTerm.trim()) return true;
      return prefix.prefix.toLowerCase().includes(searchTerm.toLowerCase().trim());
    })
    .sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'prefix':
          aValue = a.prefix;
          bValue = b.prefix;
          break;
        case 'count':
          aValue = a.count;
          bValue = b.count;
          break;
        case 'estBytes':
          aValue = a.estBytes;
          bValue = b.estBytes;
          break;
        case 'persistentPercent':
          aValue = a.persistentPercent;
          bValue = b.persistentPercent;
          break;
        default:
          aValue = a.count;
          bValue = b.count;
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
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const exportCSV = () => {
    if (!mounted) return;

    const headers = ['Prefix', 'Count', 'Memory (bytes)', 'Memory (human)', 'Persistent %', 'TTL Buckets', 'Idle Buckets'];
    const csvData = filteredData.map(prefix => [
      prefix.prefix,
      prefix.count,
      prefix.estBytes,
      formatBytes(prefix.estBytes),
      `${prefix.persistentPercent.toFixed(1)}%`,
      Object.keys(prefix.ttlHist).length,
      Object.keys(prefix.idleHist).length
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redis-prefixes-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const tooltipText = {
      prefix: 'Sort by prefix name (alphabetical)',
      count: 'Sort by number of keys in this prefix',
      estBytes: 'Sort by estimated memory usage',
      persistentPercent: 'Sort by percentage of persistent keys (no TTL)'
    };

    return (
      <Tooltip>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText[field]}</p>
          <p className="text-xs opacity-80">Click to sort {sortField === field ? (sortDirection === 'asc' ? 'descending' : 'ascending') : 'descending'}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header with Controls */}
      <div className="bg-card border rounded-lg shadow-sm p-3 mb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-foreground">
            Key Prefixes
          </h3>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3 pointer-events-none" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input
                    placeholder="Search prefixes..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setSearchTerm('');
                        setCurrentPage(1);
                      }
                    }}
                    className={`pl-7 h-8 text-xs ${searchTerm ? 'border-primary/50' : ''}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Search prefixes by name</p>
                  <p className="text-xs opacity-80">Press Escape to clear</p>
                </TooltipContent>
              </Tooltip>
              {searchTerm && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setCurrentPage(1);
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground w-3 h-3"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear search</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={exportCSV} size="sm" variant="outline" className="h-8 text-xs">
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export prefixes to CSV</p>
                <p className="text-xs opacity-80">Includes count, memory, TTL, and idle data</p>
              </TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>{filteredData.length} of {data.length}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Showing {filteredData.length} filtered prefixes</p>
                  <p className="text-xs opacity-80">Out of {data.length} total prefixes</p>
                </TooltipContent>
              </Tooltip>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-xs border border-input rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent bg-background text-foreground"
                    >
                      ←
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Previous page</p>
                    <p className="text-xs opacity-80">Page {currentPage - 1} of {totalPages}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="px-2 py-1 text-xs">
                      {currentPage}/{totalPages}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Current page</p>
                    <p className="text-xs opacity-80">Showing {itemsPerPage} items per page</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 text-xs border border-input rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent bg-background text-foreground"
                    >
                      →
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Next page</p>
                    <p className="text-xs opacity-80">Page {currentPage + 1} of {totalPages}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Table Container */}
      <div className="flex-1 bg-card border rounded-lg shadow-sm overflow-hidden">
        {paginatedData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            {searchTerm ? 'No prefixes found matching your search.' : 'No data available.'}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>
                    <SortableHeader field="prefix">Prefix</SortableHeader>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHeader field="count">Count</SortableHeader>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHeader field="estBytes">Memory</SortableHeader>
                  </TableHead>
                  <TableHead className="text-right">Avg Size</TableHead>
                  <TableHead className="text-right">TTL Mix</TableHead>
                  <TableHead className="text-right">Idle Mix</TableHead>
                  <TableHead className="text-right">Types</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((prefix) => (
                  <React.Fragment key={prefix.prefix}>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-foreground">{prefix.prefix}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => onDrillDown?.(prefix.prefix)}
                                className="p-1 hover:bg-accent rounded"
                              >
                                <Search className="w-3 h-3 text-muted-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Drill down into {prefix.prefix}</p>
                              <p className="text-xs opacity-80">View sub-prefixes and details</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-foreground">
                        {prefix.count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-foreground">
                        {formatBytes(prefix.estBytes)}
                      </TableCell>
                      <TableCell className="text-right text-foreground">
                        {formatBytes(prefix.estBytes / prefix.count)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-12 bg-muted rounded-full h-1.5 cursor-help">
                              <div
                                className="bg-primary h-1.5 rounded-full"
                                style={{
                                  width: `${Math.min(100, (Object.keys(prefix.ttlHist).length > 1 ? 50 : 0))}%`
                                }}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>TTL Distribution</p>
                            <p className="text-xs opacity-80">
                              {Object.keys(prefix.ttlHist).length > 1
                                ? `${Object.keys(prefix.ttlHist).length} different TTL buckets`
                                : 'All keys have same TTL'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-xs px-1 py-0.5 bg-muted text-muted-foreground rounded cursor-help">
                              {Object.keys(prefix.idleHist).length > 1 ? 'Mixed' : 'Active'}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Idle Time Status</p>
                            <p className="text-xs opacity-80">
                              {Object.keys(prefix.idleHist).length > 1
                                ? `${Object.keys(prefix.idleHist).length} different idle buckets`
                                : 'All keys are recently active'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-xs px-1 py-0.5 bg-muted text-muted-foreground rounded cursor-help">
                              {Object.keys(prefix.byType).join(', ') || 'Unknown'}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Redis Data Types</p>
                            <p className="text-xs opacity-80">
                              {Object.keys(prefix.byType).length > 0
                                ? `${Object.keys(prefix.byType).length} different types in this prefix`
                                : 'Type information not available'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
