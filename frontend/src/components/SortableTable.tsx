import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  key: string;
  direction: SortDirection;
}

export function useSortableData<T>(items: T[]) {
  const [sort, setSort] = useState<SortState>({ key: '', direction: null });

  const sorted = useMemo(() => {
    if (!sort.key || !sort.direction) return items;
    return [...items].sort((a: any, b: any) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (typeof aVal === 'boolean') {
        return sort.direction === 'asc' ? (aVal === bVal ? 0 : aVal ? -1 : 1) : (aVal === bVal ? 0 : aVal ? 1 : -1);
      }
      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      if (strA < strB) return sort.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sort]);

  const requestSort = (key: string) => {
    setSort(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' as SortDirection };
        if (prev.direction === 'desc') return { key: '', direction: null };
      }
      return { key, direction: 'asc' as SortDirection };
    });
  };

  return { sorted, sort, requestSort };
}

interface SortableThProps {
  label: string;
  sortKey: string;
  sort: SortState;
  onSort: (key: string) => void;
  className?: string;
}

export const SortableTh: React.FC<SortableThProps> = ({ label, sortKey, sort, onSort, className = '' }) => {
  const isActive = sort.key === sortKey;
  return (
    <th
      className={`text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive && sort.direction === 'asc' && <ChevronUp className="w-3.5 h-3.5 text-blue-600" />}
        {isActive && sort.direction === 'desc' && <ChevronDown className="w-3.5 h-3.5 text-blue-600" />}
        {!isActive && <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />}
      </div>
    </th>
  );
};

/** Search across all string-coercible values of the listed keys */
export function matchesSearch<T>(item: T, search: string, keys: (keyof T)[]): boolean {
  if (!search) return true;
  const s = search.toLowerCase();
  return keys.some(k => {
    const v = (item as any)[k];
    if (v == null) return false;
    return String(v).toLowerCase().includes(s);
  });
}
