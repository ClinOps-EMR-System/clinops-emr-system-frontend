"use client";

import React, { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import clsx from "clsx";
import EmptyState from "./EmptyState";
import LoadingState from "./LoadingState";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  mobileHidden?: boolean;
  render: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string | number;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  defaultSortKey?: string;
  defaultSortDirection?: "asc" | "desc";
}

type SortDirection = "asc" | "desc";

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  error = null,
  emptyTitle = "No records found",
  emptyDescription = "There are no records matching your criteria.",
  emptyAction,
  onRowClick,
  keyExtractor,
  pagination,
  defaultSortKey,
  defaultSortDirection = "asc",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortDir, setSortDir] = useState<SortDirection>(defaultSortDirection);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        const cmp = aVal.localeCompare(bVal);
        return sortDir === "asc" ? cmp : -cmp;
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [data, sortKey, sortDir]);

  if (loading) {
    return (
      <div className="bg-white rounded border border-[#becab7]/50 overflow-hidden shadow-sm">
        <LoadingState message="Loading records..." fullPage />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded border border-[#becab7]/50 overflow-hidden shadow-sm">
        <div className="p-12 text-center text-sm text-red-600 font-semibold">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded border border-[#becab7]/50 overflow-hidden shadow-sm">
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded border border-[#becab7]/50 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#fcf9f8] sticky top-0 z-10">
            <tr className="divide-x divide-gray-200/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    "px-6 py-3.5 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider",
                    col.sortable && "cursor-pointer select-none hover:text-gray-900 transition-colors",
                    col.mobileHidden && "hidden md:table-cell",
                    col.className
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  scope="col"
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      <span className="text-gray-500">
                        {sortKey === col.key ? (
                          sortDir === "asc" ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {sortedData.map((row, index) => (
              <tr
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={clsx(
                  "hover:bg-[#fcf9f8]/40 hover:border-l-4 hover:border-brand-green/80 transition-all divide-x divide-gray-100",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={clsx("px-6 py-4 whitespace-nowrap text-sm", col.mobileHidden && "hidden md:table-cell", col.className)}>
                    {col.render(row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-[#fcf9f8]">
          <button
            onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="px-3 py-1.5 border border-gray-300 rounded text-xs font-bold text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-xs font-mono text-gray-500">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-3 py-1.5 border border-gray-300 rounded text-xs font-bold text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
