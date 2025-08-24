'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PrefixAgg } from '@/lib/types';
import { formatDuration } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';

interface HeatmapIdleProps {
  data: PrefixAgg[];
  idleBuckets: number[];
  onCellClick?: (prefix: string, idleBucket: string) => void;
  colorBy: 'count' | 'bytes';
}

export function HeatmapIdle({ data, idleBuckets, onCellClick, colorBy = 'count' }: HeatmapIdleProps) {
  const [hoveredCell, setHoveredCell] = useState<{ prefix: string; idleBucket: string; value: number; originalValue: number } | null>(null);
  const [currentColorBy, setCurrentColorBy] = useState<'count' | 'bytes'>(colorBy);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'prefix' | 'totalCount' | 'totalBytes'>('totalCount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [mounted, setMounted] = useState(false);
  const itemsPerPage = 8; // Reduced from 12 to 8 for better fit

  useEffect(() => {
    setMounted(true);
  }, []);

  // Create bucket labels with proper spacing
  const bucketLabels = idleBuckets.map(bucket =>
    bucket === 0 ? 'Active' : formatDuration(bucket * 1000)
  );

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm) {
      filtered = data.filter(prefix =>
        prefix.prefix.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Calculate totals for sorting
    const withTotals = filtered.map(prefix => {
      const totalCount = Object.values(prefix.idleHist).reduce((sum, count) => sum + count, 0);
      const totalBytes = totalCount * (prefix.estBytes / prefix.count);
      return { ...prefix, totalCount, totalBytes };
    });

    // Sort data
    return withTotals.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'prefix':
          aValue = a.prefix.toLowerCase();
          bValue = b.prefix.toLowerCase();
          break;
        case 'totalCount':
          aValue = a.totalCount;
          bValue = b.totalCount;
          break;
        case 'totalBytes':
          aValue = a.totalBytes;
          bValue = b.totalBytes;
          break;
        default:
          aValue = a.totalCount;
          bValue = b.totalCount;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [data, searchTerm, sortBy, sortOrder]);

  // Paginate data
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredAndSortedData.slice(startIndex, endIndex);

  // Prepare data for heatmap
  const heatmapData: Array<{ prefix: string; idleBucket: string; value: number; originalValue: number }> = [];

  paginatedData.forEach(prefix => {
    bucketLabels.forEach((label, index) => {
      const bucketKey = Object.keys(prefix.idleHist)[index];
      const value = prefix.idleHist[bucketKey] || 0;
      const displayValue = currentColorBy === 'count' ? value : (value * (prefix.estBytes / prefix.count) || 0);
      heatmapData.push({
        prefix: prefix.prefix,
        idleBucket: label,
        value: displayValue,
        originalValue: value
      });
    });
  });

  // Calculate max value for color scaling
  const maxValue = Math.max(...heatmapData.map(d => d.value)) || 1;

  // GitHub-style color function (orange/red theme for idle time)
  const getColorClass = (value: number) => {
    if (value === 0) return 'bg-muted';

    const intensity = value / maxValue;
    if (intensity < 0.25) return 'bg-orange-100 dark:bg-orange-900';
    if (intensity < 0.5) return 'bg-orange-200 dark:bg-orange-800';
    if (intensity < 0.75) return 'bg-orange-300 dark:bg-orange-700';
    return 'bg-orange-400 dark:bg-orange-600';
  };

  // Format value for display
  const formatValue = (value: number) => {
    if (value === 0) return '';
    if (currentColorBy === 'count') {
      return value > 999 ? `${(value / 1000).toFixed(1)}k` : value.toString();
    } else {
      return value > 1024 * 1024 ? `${(value / (1024 * 1024)).toFixed(1)}MB` :
        value > 1024 ? `${(value / 1024).toFixed(1)}KB` :
          `${value.toFixed(0)}B`;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header with all controls */}
      <div className="bg-card border rounded-lg shadow-sm p-2 mb-2 flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          {/* Left side - Color options and search */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="colorByIdle"
                  value="count"
                  checked={currentColorBy === 'count'}
                  onChange={(e) => e.target.checked && setCurrentColorBy('count')}
                  className="w-3 h-3 text-orange-600"
                />
                <span className="text-xs font-medium">Count</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="colorByIdle"
                  value="bytes"
                  checked={currentColorBy === 'bytes'}
                  onChange={(e) => e.target.checked && setCurrentColorBy('bytes')}
                  className="w-3 h-3 text-orange-600"
                />
                <span className="text-xs font-medium">Memory</span>
              </label>
            </div>

            <div className="flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Search prefixes..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2 py-1 border border-input rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 bg-background text-foreground"
              />
            </div>
          </div>

          {/* Right side - Sort and pagination */}
          <div className="flex items-center gap-2">
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [newSortBy, newSortOrder] = value.split('-') as ['prefix' | 'totalCount' | 'totalBytes', 'asc' | 'desc'];
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="h-7 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="totalCount-desc">Count ↓</SelectItem>
                <SelectItem value="totalCount-asc">Count ↑</SelectItem>
                <SelectItem value="totalBytes-desc">Memory ↓</SelectItem>
                <SelectItem value="totalBytes-asc">Memory ↑</SelectItem>
                <SelectItem value="prefix-asc">Prefix A-Z</SelectItem>
                <SelectItem value="prefix-desc">Prefix Z-A</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{filteredAndSortedData.length} of {data.length}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-1.5 py-0.5 text-xs border border-input rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent bg-background text-foreground"
                >
                  ←
                </button>
                <span className="px-1.5 py-0.5 text-xs">
                  {currentPage}/{totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-1.5 py-0.5 text-xs border border-input rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent bg-background text-foreground"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Heatmap Container */}
      <div className="flex-1 bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="p-3 pb-1 flex-shrink-0">
          <h3 className="text-sm font-bold text-foreground mb-2">
            Idle Time Heatmap ({currentColorBy === 'count' ? 'Key Count' : 'Memory Usage'})
          </h3>
        </div>

        {paginatedData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            {searchTerm ? 'No prefixes found matching your search.' : 'No data available.'}
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-48">Prefix</TableHead>
                  {bucketLabels.map((label, index) => (
                    <TableHead key={index} className="w-16 text-center text-xs font-medium text-muted-foreground">
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((prefix) => (
                  <TableRow key={prefix.prefix}>
                    <TableCell className="w-48 py-1">
                      <div className="text-xs font-mono text-muted-foreground truncate" title={prefix.prefix}>
                        {prefix.prefix}
                      </div>
                    </TableCell>
                    {bucketLabels.map((label) => {
                      const cellData = heatmapData.find(d =>
                        d.prefix === prefix.prefix && d.idleBucket === label
                      );
                      const value = cellData?.value || 0;
                      const originalValue = cellData?.originalValue || 0;

                      return (
                        <TableCell key={`${prefix.prefix}-${label}`} className="w-16 p-0.5">
                          <div
                            className={`
                              w-16 h-6 rounded border border-border
                              flex items-center justify-center text-xs font-medium
                              cursor-pointer transition-all duration-150 hover:scale-105
                              ${getColorClass(value)}
                              ${value === 0 ? 'text-muted-foreground' : 'text-foreground'}
                            `}
                            onMouseEnter={(e) => {
                              setHoveredCell({
                                prefix: prefix.prefix,
                                idleBucket: label,
                                value,
                                originalValue
                              });
                              setMousePosition({ x: e.clientX, y: e.clientY });
                            }}
                            onMouseLeave={() => setHoveredCell(null)}
                            onMouseMove={(e) => setMousePosition({ x: e.clientX, y: e.clientY })}
                            onClick={() => onCellClick?.(prefix.prefix, label)}
                            title={`${prefix.prefix} - ${label}: ${formatValue(value)}`}
                          >
                            {formatValue(value)}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Legend - Fixed at bottom */}
        <div className="p-3 pt-1 border-t bg-muted/20 flex-shrink-0">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-xs text-muted-foreground">Less</span>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-muted rounded"></div>
              <div className="w-2 h-2 bg-orange-100 dark:bg-orange-900 rounded"></div>
              <div className="w-2 h-2 bg-orange-200 dark:bg-orange-800 rounded"></div>
              <div className="w-2 h-2 bg-orange-300 dark:bg-orange-700 rounded"></div>
              <div className="w-2 h-2 bg-orange-400 dark:bg-orange-600 rounded"></div>
            </div>
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && mounted && (
        <div className="fixed bg-popover text-popover-foreground p-2 rounded text-xs pointer-events-none z-50 shadow-lg border"
          style={{
            left: `${Math.min(window.innerWidth - 200, Math.max(0, mousePosition.x + 10))}px`,
            top: `${Math.min(window.innerHeight - 100, Math.max(0, mousePosition.y - 50))}px`
          }}>
          <div className="font-semibold mb-1 truncate max-w-xs">{hoveredCell.prefix}</div>
          <div className="text-muted-foreground">Idle: {hoveredCell.idleBucket}</div>
          <div className="text-orange-300">
            {currentColorBy === 'count' ?
              `${hoveredCell.originalValue.toLocaleString()} keys` :
              `${hoveredCell.value > 1024 * 1024 ? (hoveredCell.value / (1024 * 1024)).toFixed(1) + 'MB' :
                hoveredCell.value > 1024 ? (hoveredCell.value / 1024).toFixed(1) + 'KB' :
                  hoveredCell.value.toFixed(0) + 'B'}`
            }
          </div>
        </div>
      )}
    </div>
  );
}
