import React from "react";

export default function Table({ columns, rows, rowKey = "slug", onRowClick }) {
  return (
    <div className="overflow-x-auto -mx-5 sm:-mx-6">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="border-y border-cardBorder bg-primary-soft/60 text-left">
            {columns.map((col) => (
              <th key={col.key} className={`px-5 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-nav whitespace-nowrap ${col.className || ""}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row[rowKey]}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-itemBorder last:border-0 transition-colors hover:bg-hover/60 ${onRowClick ? "cursor-pointer hover:bg-primary-soft/50" : ""}`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-5 sm:px-6 py-4 align-middle text-ink ${col.className || ""}`}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
