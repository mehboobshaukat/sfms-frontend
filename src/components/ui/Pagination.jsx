import React, { useEffect, useState } from "react";
import Button from "./Button";

const SIZES = [10, 20, 30, 40, 50, 100];
const MAX_PAGE_SIZE = 200;

/** Server-side pagination only: parent must fetch the requested page. */
export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [customSize, setCustomSize] = useState(String(pageSize));
  useEffect(() => { setCustomSize(String(pageSize)); }, [pageSize]);

  const applySize = (value) => {
    const count = Number(value);
    if (!Number.isInteger(count) || count < 1 || count > MAX_PAGE_SIZE) return;
    onPageSizeChange?.(count);
  };

  // Keep size selection visible even if there is only one page.
  if (totalPages <= 1 && !onPageSizeChange) return null;

  return (
    <div className="mt-1 flex flex-col gap-3 border-t border-itemBorder px-1 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between" aria-label="Pagination controls">
      <p className="text-xs font-medium text-muted">
        {total === 0 ? "No records" : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
        {` · Page ${page} of ${totalPages}`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <label htmlFor="list-page-size" className="text-xs text-muted">Rows per page</label>
            <select
              id="list-page-size"
              aria-label="Rows per page"
              value={SIZES.includes(pageSize) ? String(pageSize) : "custom"}
              onChange={(e) => { if (e.target.value !== "custom") applySize(e.target.value); }}
              className="rounded-xl border border-cardBorder bg-input px-2.5 py-2 text-xs font-semibold text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            >
              {SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
              {!SIZES.includes(pageSize) && <option value="custom">Custom ({pageSize})</option>}
            </select>
            <label htmlFor="custom-page-size" className="sr-only">Custom rows per page, 1 to {MAX_PAGE_SIZE}</label>
            <input
              id="custom-page-size"
              type="number"
              min="1"
              max={MAX_PAGE_SIZE}
              step="1"
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applySize(customSize); }}
              className="w-16 rounded-xl border border-cardBorder bg-input px-2.5 py-2 text-xs font-semibold text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
              title="Custom rows per page (1–200)"
            />
            <Button variant="secondary" size="sm" onClick={() => applySize(customSize)}
              disabled={!Number.isInteger(Number(customSize)) || Number(customSize) < 1 || Number(customSize) > MAX_PAGE_SIZE}>
              Apply
            </Button>
          </div>
        )}
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
