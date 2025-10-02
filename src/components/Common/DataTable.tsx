import React, { ReactNode } from 'react';
import { ChevronUp, ChevronDown, Search, Filter, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  onSearch?: (term: string) => void;
  onFilter?: () => void;
  onRefresh?: () => void;
  emptyMessage?: string;
  emptyIcon?: React.ComponentType<any>;
  className?: string;
  testId?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchable = true,
  filterable = false,
  onSearch,
  onFilter,
  onRefresh,
  emptyMessage = 'No data available',
  emptyIcon: EmptyIcon,
  className = '',
  testId = 'data-table'
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortColumn, setSortColumn] = React.useState<string>('');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch?.(value);
  };

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const getValue = (item: T, key: keyof T | string): any => {
    if (typeof key === 'string' && key.includes('.')) {
      return key.split('.').reduce((obj, k) => obj?.[k], item);
    }
    return item[key as keyof T];
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;
    
    return [...data].sort((a, b) => {
      const aVal = getValue(a, sortColumn);
      const bVal = getValue(b, sortColumn);
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection]);

  return (
    <div className={`bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl ${className}`} data-testid={testId}>
      {/* Table Header Controls */}
      {(searchable || filterable || onRefresh) && (
        <div className="p-4 border-b border-dark-700/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {searchable && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-dark-800/50 border border-dark-600 rounded-lg text-gray-200 focus:outline-none focus:border-crimson-500 w-64"
                    data-testid="table-search"
                  />
                </div>
              )}
              {filterable && (
                <button
                  onClick={onFilter}
                  className="px-3 py-2 text-gray-400 hover:text-white border border-dark-600 rounded-lg hover:border-dark-500 transition-colors"
                  data-testid="table-filter"
                >
                  <Filter className="w-4 h-4 inline mr-2" />
                  Filter
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">
                {data.length} items
              </span>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={loading}
                  className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors disabled:opacity-50"
                  data-testid="table-refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700/30">
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`text-left py-3 px-4 text-sm font-medium text-gray-300 ${
                    column.width ? column.width : ''
                  } ${column.sortable ? 'cursor-pointer hover:text-white' : ''}`}
                  onClick={() => column.sortable && typeof column.key === 'string' && handleSort(column.key)}
                  data-testid={`column-header-${column.key}`}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {column.sortable && typeof column.key === 'string' && sortColumn === column.key && (
                      sortDirection === 'asc' ? 
                        <ChevronUp className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <LoadingSpinner size="md" text="Loading data..." />
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  {EmptyIcon && <EmptyIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />}
                  <p className="text-gray-400 font-medium">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              sortedData.map((item, index) => (
                <tr 
                  key={index}
                  className="border-b border-dark-700/20 hover:bg-dark-800/30 transition-colors"
                  data-testid={`table-row-${index}`}
                >
                  {columns.map((column, columnIndex) => (
                    <td key={columnIndex} className="py-3 px-4 text-sm text-gray-200">
                      {column.render ? column.render(item) : getValue(item, column.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}